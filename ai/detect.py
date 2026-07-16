from pathlib import Path
from ultralytics import YOLO
import cv2
from collections import Counter
import time

from ai.risk import calculate_risk
from ai.zone import check_danger_zone_violation, scale_zone
from ai.modelcombined import PPECombinedModel
from ai.capture import get_capture_path_if_needed
from backend.event_log.getEventLogs import save_event_with_capture, save_detection_log

from sqlalchemy import text
from backend.util.db import get_engine


BASE_DIR = Path(__file__).resolve().parent.parent
# MODEL_PATH = BASE_DIR / "ai" / "models" / "weights" / "ppe100.pt"


# YOLO 모델 한 번만 로드
# model = YOLO(str(MODEL_PATH))
model = PPECombinedModel( # 최종 모델
    pose_model_path="yolov8n-pose.pt",
    helmet_cls_path=r"runs\classify\helmet_cls\weights\best.pt",
    vest_cls_path=r"runs\classify\vest_cls\weights\best.pt",
    person_conf=0.25,
    device="cpu"
)


# 실시간 모니터링 화면에 보여줄 최신 감지 상태 저장
latest_detection_status = {}

# detection_log가 프레임마다 과도하게 쌓이지 않도록 저장 간격 제한
DETECTION_LOG_COOLDOWN = 5
last_detection_log_time = {}

OBJECT_IOU_THRESHOLD = 0.3
OBJECT_TRACK_TTL = 3

object_trackers = {}


def bbox_iou(box_a, box_b):
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0

    return inter_area / union_area


def assign_object_ids(cctv_id, detections):
    now = time.time()

    tracker = object_trackers.setdefault(cctv_id, {
        "next_id": 1,
        "objects": {},
        "logged_keys": set()
    })

    objects = tracker["objects"]

    for object_id in list(objects.keys()):
        if now - objects[object_id]["last_seen"] > OBJECT_TRACK_TTL:
            del objects[object_id]
            tracker["logged_keys"] = {
                key for key in tracker["logged_keys"]
                if not key.startswith(f"{object_id}:")
            }

    used_ids = set()

    for det in detections:
        bbox = det.get("bbox")
        best_id = None
        best_iou = 0

        for object_id, obj in objects.items():
            if object_id in used_ids:
                continue

            iou = bbox_iou(bbox, obj["bbox"])

            if iou > best_iou:
                best_iou = iou
                best_id = object_id

        if best_id is None or best_iou < OBJECT_IOU_THRESHOLD:
            best_id = tracker["next_id"]
            tracker["next_id"] += 1

        det["object_id"] = best_id

        objects[best_id] = {
            "bbox": bbox,
            "last_seen": now
        }

        used_ids.add(best_id)

    return detections

# YOLO 감지 결과를 JSON 형태로 정리하는 함수
def extract_detection_result(detections):
    detection_result = {
        "person": len(detections),
        "helmet": 0,
        "no_helmet": 0,
        "safety_vest": 0,
        "no_safety_vest": 0
    }

    for det in detections:
        helmet_status = det.get("helmet_status")
        vest_status = det.get("vest_status")

        if helmet_status == "helmet":
            detection_result["helmet"] += 1
        else:
            detection_result["no_helmet"] += 1

        if vest_status == "safety_vest":
            detection_result["safety_vest"] += 1
        else:
            detection_result["no_safety_vest"] += 1

    return detection_result


# CCTV별 저장된 위험구역 좌표 조회
def get_danger_zones(cctv_id):
    db = get_engine()

    try:
        sql = text("""
            SELECT zone_id, zone_name, x1, y1, x2, y2
            FROM danger_zone
            WHERE cctv_id = :cctv_id
              AND is_active = 1
        """)

        rows = db.execute(sql, {"cctv_id": cctv_id}).mappings().all()
        return [dict(row) for row in rows]

    finally:
        db.close()


def is_detection_in_danger_zone(
    det,
    danger_zones,
    frame_width,
    frame_height
):
    for zone in danger_zones:
        if check_danger_zone_violation(
            det["bbox"],
            zone,
            frame_width,
            frame_height
        ):
            return True

    return False


def make_object_violation_keys(
    detections,
    danger_zones,
    frame_width,
    frame_height
):
    keys = []

    for det in detections:
        object_id = det.get("object_id")

        if object_id is None:
            continue

        violations = []

        if det.get("helmet_status") != "helmet":
            violations.append("no_helmet")

        if det.get("vest_status") != "safety_vest":
            violations.append("no_safety_vest")

        if is_detection_in_danger_zone(
            det,
            danger_zones,
            frame_width,
            frame_height
        ):
            violations.append("danger_zone")

        if violations:
            keys.append(f"{object_id}:{'+'.join(violations)}")

    return keys


def should_save_object_event(cctv_id, violation_keys):
    if not violation_keys:
        return True

    tracker = object_trackers.setdefault(cctv_id, {
        "next_id": 1,
        "objects": {},
        "logged_keys": set()
    })

    logged_keys = tracker["logged_keys"]
    new_keys = [key for key in violation_keys if key not in logged_keys]

    if not new_keys:
        return False

    for key in violation_keys:
        logged_keys.add(key)

    return True


# 감지 결과를 바탕으로 위험도 점수와 등급 추가
def add_risk_result(detection_result, in_danger_zone=False):
    no_helmet = detection_result["no_helmet"] > 0
    no_safety_vest = detection_result["no_safety_vest"] > 0

    risk_score, risk_status = calculate_risk(
        no_helmet=no_helmet,
        no_safety_vest=no_safety_vest,
        in_danger_zone=in_danger_zone
    )

    detection_result["in_danger_zone"] = in_danger_zone
    detection_result["risk_score"] = risk_score
    detection_result["risk_status"] = risk_status

    return detection_result


# 감지 결과를 DB와 화면에 표시할 위반 유형 문자열로 변환
def make_violation_type(detection_result):
    no_helmet = detection_result.get("no_helmet", 0) > 0
    no_safety_vest = detection_result.get("no_safety_vest", 0) > 0
    in_danger_zone = detection_result.get("in_danger_zone")

    violation_types = []

    if no_helmet and no_safety_vest:
        violation_types.append("PPE 미착용")
    elif no_helmet:
        violation_types.append("안전모 미착용")
    elif no_safety_vest:
        violation_types.append("안전조끼 미착용")

    if in_danger_zone:
        violation_types.append("위험구역 진입")

    if not violation_types:
        return "NONE"

    return " + ".join(violation_types)


# 위험도 결과에 따라 캡처 이미지를 저장하고 경로 정보를 detection_result에 추가
def save_capture_if_needed(capture_frame, cctv_id, detection_result):
    risk_status = detection_result["risk_status"]
    violation_type = make_violation_type(detection_result)

    violation_keys = detection_result.get("object_violation_keys", [])

    if not should_save_object_event(cctv_id, violation_keys):
        detection_result["capture_path"] = None
        detection_result["capture_url"] = None
        detection_result["violation_type"] = violation_type
        return detection_result

    capture_key = violation_type

    if violation_keys:
        capture_key = f"{violation_type}:{'|'.join(violation_keys)}"

    capture_path = get_capture_path_if_needed(
        cctv_id=cctv_id,
        violation_type=capture_key,
        status=risk_status
    )

    if capture_path:
        cv2.imwrite(capture_path, capture_frame)

        # 백엔드 저장 경로
        detection_result["capture_path"] = capture_path

        # 프론트 이미지 src에서 사용할 경로
        detection_result["capture_url"] = "/" + capture_path.replace("\\", "/")
    else:
        detection_result["capture_path"] = None
        detection_result["capture_url"] = None

    detection_result["violation_type"] = violation_type

    return detection_result


# CCTV별 detection_log 저장 간격 체크
def should_save_detection_log(cctv_id):
    now = time.time()
    last_time = last_detection_log_time.get(cctv_id, 0)

    if now - last_time >= DETECTION_LOG_COOLDOWN:
        last_detection_log_time[cctv_id] = now
        return True

    return False


# 서버에 카메라 프레임을 전송하고, 감지/위험판단/DB저장을 처리
def generate_frames(camera_index, cctv_id, conf=0.5):
    cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        print(f"카메라 열기 실패: {camera_index}")
        cap.release()
        return

    while True:
        # CCTV 프레임 읽기
        success, frame = cap.read()

        if not success:
            break

        # YOLO 기반 PPE 감지 수행
        detections = model.predict(frame)
        detections = assign_object_ids(cctv_id, detections)

        danger_zones = get_danger_zones(cctv_id)

        frame_height, frame_width = frame.shape[:2]

        in_danger_zone = False

        for det in detections:
            if is_detection_in_danger_zone(
                det,
                danger_zones,
                frame_width,
                frame_height
            ):
                in_danger_zone = True
                break

        detection_result = extract_detection_result(detections)
        detection_result["object_violation_keys"] = make_object_violation_keys(
            detections,
            danger_zones,
            frame_width,
            frame_height
        )
        detection_result = add_risk_result(
            detection_result,
            in_danger_zone=in_danger_zone
        )
        # 감지 결과를 화면에 표시할 프레임으로 변환
        annotated = model.draw(frame, detections)

        print("현재 CCTV ID:", cctv_id)
        print("위험구역 조회 결과:", danger_zones)
        print("위험구역 진입 여부:", in_danger_zone)

        # 화면에 위험구역 사각형 표시
        frame_height, frame_width = annotated.shape[:2]

        for zone in danger_zones:
            scaled_zone = scale_zone(
                zone,
                frame_width,
                frame_height
            )

            draw_x1 = scaled_zone["x1"]
            draw_y1 = scaled_zone["y1"]
            draw_x2 = scaled_zone["x2"]
            draw_y2 = scaled_zone["y2"]

            cv2.rectangle(
                annotated,
                (draw_x1, draw_y1),
                (draw_x2, draw_y2),
                (0, 0, 255),
                3
            )

            cv2.putText(
                annotated,
                zone["zone_name"],
                (draw_x1, max(20, draw_y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 255),
                2
            )

        # 위험 이벤트 발생 시 캡처 이미지 저장 여부 판단
        detection_result = save_capture_if_needed(annotated, cctv_id, detection_result)

        # 감지 분석 결과는 CCTV별 5초에 1번만 detection_log에 저장
        if should_save_detection_log(cctv_id):
            save_detection_log(cctv_id, detection_result)

        print("DB 저장 직전:", cctv_id, detection_result)

        # 캡처가 있는 위험 이벤트만 event_log, capture_image에 저장
        save_event_with_capture(cctv_id, detection_result)

        # 실시간 모니터링 화면에 표시할 최신 상태 저장
        latest_detection_status[cctv_id] = {
            "riskLevel": detection_result.get("risk_status", "-"),
            "riskText": get_risk_text(detection_result.get("risk_status", "-")),
            "riskScore": detection_result.get("risk_score", 0),
            "violations": {
                "helmet": detection_result.get("no_helmet", 0),
                "vest": detection_result.get("no_safety_vest", 0),
                "zone": 1 if detection_result.get("in_danger_zone") else 0
            },
            "person": detection_result.get("person", 0),
            "helmet": detection_result.get("helmet", 0),
            "safetyVest": detection_result.get("safety_vest", 0),
            "violationType": detection_result.get("violation_type", "NONE"),
            "captureUrl": detection_result.get("capture_url")
        }

        print(cctv_id, detection_result)

        # 프레임을 JPG로 변환해서 브라우저에 스트리밍
        ret, buffer = cv2.imencode(".jpg", annotated)

        if not ret:
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )

    cap.release()


# 위험도 등급을 화면 표시용 한글 문구로 변환
def get_risk_text(risk_status):
    if risk_status == "SAFE":
        return "정상"
    if risk_status == "WARNING":
        return "주의"
    if risk_status == "DANGER":
        return "위험"
    if risk_status == "CRITICAL":
        return "매우 위험"
    return "-"


# 선택한 CCTV의 최신 감지 상태 반환
def get_latest_detection_status(cctv_id):
    return latest_detection_status.get(cctv_id, {
        "riskLevel": "-",
        "riskText": "-",
        "riskScore": 0,
        "violations": {
            "helmet": 0,
            "vest": 0,
            "zone": 0
        },
        "person": 0,
        "helmet": 0,
        "safetyVest": 0,
        "violationType": "NONE",
        "captureUrl": None
    })

def get_all_latest_detection_status():
    return latest_detection_status.copy()