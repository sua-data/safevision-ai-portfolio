from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Tuple

import cv2
import numpy as np
from ultralytics import YOLO


@dataclass
class CombinedDetection:
    class_id: int
    class_name: str
    confidence: float
    bbox: List[int]

    person_id: int | None = None

    head_bbox: List[int] | None = None
    torso_bbox: List[int] | None = None

    helmet_status: str | None = None
    helmet_conf: float | None = None
    vest_status: str | None = None
    vest_conf: float | None = None

    crop_source: str | None = None  # "pose" or "bbox"

# 사람 감지, 신체 부위 crop, 헬멧/조끼 분류를 하나로 묶은 통합 모델 클래스
class PPECombinedModel:
    def __init__(
        self,
        pose_model_path: str = "yolov8n-pose.pt",
        helmet_cls_path: str = "runs\classify\helmet_cls\weights\best.pt",
        vest_cls_path: str = "runs\classify\vest_cls\weights\best.pt",
        person_conf: float = 0.25,
        device: str | int | None = None,
    ):
        self.pose_model = YOLO(pose_model_path) # 사람 탐지 및 pose keypoint 추출 모델
        self.helmet_model = YOLO(helmet_cls_path) # 머리 crop 이미지를 입력받아 헬멧 착용 여부 분류
        self.vest_model = YOLO(vest_cls_path) # 상체 crop 이미지를 입력받아 조끼 착용 여부 분류

        self.person_conf = person_conf # 사람 감지 기준 confidence 값 저장
        self.device = device # 모델 실행 장치 저장

    @staticmethod
    def _clip_box(box, w, h): # 이미지 범위를 벗어난 bbox 좌표를 이미지 내부로 보정한다.
        x1, y1, x2, y2 = map(int, box)

        x1 = max(0, min(x1, w - 1))
        y1 = max(0, min(y1, h - 1))
        x2 = max(0, min(x2, w - 1))
        y2 = max(0, min(y2, h - 1))

        return [x1, y1, x2, y2]

    @staticmethod
    def _safe_crop(frame, box): # bbox 영역을 안전하게 crop하고, 잘못된 영역이면 None을 반환한다.
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = PPECombinedModel._clip_box(box, w, h)

        if x2 <= x1 or y2 <= y1:
            return None

        crop = frame[y1:y2, x1:x2]

        if crop.size == 0:
            return None

        return crop

    @staticmethod
    def _bbox_head_box(person_box): # pose keypoint를 사용할 수 없을 때, 사람 bbox 기준으로 머리 영역을 추정한다.
        x1, y1, x2, y2 = person_box
        bw = x2 - x1
        bh = y2 - y1

        head_y2 = y1 + int(bh * 0.28)
        pad_x = int(bw * 0.18)

        return [x1 + pad_x, y1, x2 - pad_x, head_y2]

    @staticmethod
    def _bbox_torso_box(person_box): # pose keypoint를 사용할 수 없을 때, 사람 bbox 기준으로 상체 영역을 추정한다.
        x1, y1, x2, y2 = person_box
        bw = x2 - x1
        bh = y2 - y1

        torso_y1 = y1 + int(bh * 0.22)
        torso_y2 = y1 + int(bh * 0.68)
        pad_x = int(bw * 0.08)

        return [x1 + pad_x, torso_y1, x2 - pad_x, torso_y2]

    @staticmethod
    def _valid_point(kpts, idx, min_conf=0.35): # 특정 keypoint가 존재하고 confidence가 기준 이상인지 확인한다.
        """
        YOLOv8 pose keypoint index:
        0 nose
        1 left_eye
        2 right_eye
        3 left_ear
        4 right_ear
        5 left_shoulder
        6 right_shoulder
        11 left_hip
        12 right_hip
        """
        if kpts is None:
            return None

        if idx >= len(kpts):
            return None

        x, y, conf = kpts[idx]

        if conf < min_conf:
            return None

        return np.array([x, y], dtype=np.float32)

    def _pose_head_box(self, person_box, kpts): # 얼굴 keypoint를 이용해 머리 crop 영역을 계산한다.
        h_points = []

        for idx in [0, 1, 2, 3, 4]:
            p = self._valid_point(kpts, idx)
            if p is not None:
                h_points.append(p)

        if len(h_points) < 2:
            return None

        points = np.array(h_points)

        x_min, y_min = points.min(axis=0)
        x_max, y_max = points.max(axis=0)

        person_x1, person_y1, person_x2, person_y2 = person_box
        person_w = person_x2 - person_x1
        person_h = person_y2 - person_y1

        # 얼굴 keypoint 주변을 머리 crop으로 확장
        pad_x = max((x_max - x_min) * 0.3, person_w * 0.04)
        pad_y_top = max((y_max - y_min) * 1.8, person_h * 0.08)
        pad_y_bottom = max((y_max - y_min) * 2.0, person_h * 0.10)

        x1 = x_min - pad_x
        y1 = y_min - pad_y_top
        x2 = x_max + pad_x
        y2 = y_max + pad_y_bottom

        return [int(x1), int(y1), int(x2), int(y2)]

    def _pose_torso_box(self, person_box, kpts): # 어깨와 골반 keypoint를 이용해 상체 crop 영역을 계산한다.
        left_shoulder = self._valid_point(kpts, 5)
        right_shoulder = self._valid_point(kpts, 6)

        left_hip = self._valid_point(kpts, 11)
        right_hip = self._valid_point(kpts, 12)

        if left_shoulder is None or right_shoulder is None:
            return None

        person_x1, person_y1, person_x2, person_y2 = person_box
        person_w = person_x2 - person_x1
        person_h = person_y2 - person_y1

        shoulder_points = np.array([left_shoulder, right_shoulder])
        x_min = shoulder_points[:, 0].min()
        x_max = shoulder_points[:, 0].max()
        y_top = shoulder_points[:, 1].min()

        # hip이 잡히면 shoulder~hip 사용
        if left_hip is not None and right_hip is not None:
            hip_points = np.array([left_hip, right_hip])
            y_bottom = hip_points[:, 1].max()
            x_min = min(x_min, hip_points[:, 0].min())
            x_max = max(x_max, hip_points[:, 0].max())
        else:
            # hip 실패 시 사람 bbox 기준 상체 높이 추정
            y_bottom = y_top + person_h * 0.45

        pad_x = max((x_max - x_min) * 0.45, person_w * 0.12)
        pad_y_top = person_h * 0.05
        pad_y_bottom = person_h * 0.08

        x1 = x_min - pad_x
        y1 = y_top - pad_y_top
        x2 = x_max + pad_x
        y2 = y_bottom + pad_y_bottom

        return [int(x1), int(y1), int(x2), int(y2)]

    def _get_crop_boxes(self, person_box, kpts): # pose 기반 crop 영역을 우선 사용하고, 실패 시 bbox 기반 영역으로 대체한다.
        head_box = self._pose_head_box(person_box, kpts)
        torso_box = self._pose_torso_box(person_box, kpts)

        crop_source = "pose"

        # pose기반 head, torso영역 추출 실패 시 bbox기반 비율 기준 추출
        if head_box is None:
            head_box = self._bbox_head_box(person_box)
            crop_source = "bbox"

        if torso_box is None:
            torso_box = self._bbox_torso_box(person_box)
            crop_source = "bbox"

        return head_box, torso_box, crop_source

    def _classify_crop(self, model: YOLO, crop: np.ndarray) -> Tuple[str, float]: # crop 이미지를 분류 모델에 넣어 클래스명과 confidence를 반환한다.
        results = model(crop, verbose=False, device=self.device)
        probs = results[0].probs

        top1 = int(probs.top1)
        conf = float(probs.top1conf)

        class_name = results[0].names[top1]
        return class_name, conf

    def predict(self, frame: np.ndarray) -> List[Dict[str, Any]]: # 입력 프레임에서 사람을 감지하고, 헬멧/조끼 착용 여부를 예측한다.
        h, w = frame.shape[:2] # 입력 이미지 높이, 너비 가져오기

        pose_results = self.pose_model( # 사람 탐지. bbox와 keypoint 얻기
            frame,
            conf=self.person_conf,
            verbose=False,
            device=self.device,
        )

        result = pose_results[0] # 감지 결과 추출

        if result.boxes is None:
            return []

        detections: List[CombinedDetection] = [] # 탐지 종합 결과가 들어갈 detections 리스트 생성

        # 감지된 사람들의 bbox와 pose keypoint 정보를 분리
        boxes = result.boxes 
        keypoints = result.keypoints

        for idx, box in enumerate(boxes):
            xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
            conf = float(box.conf[0].cpu().item())

            person_box = self._clip_box(xyxy, w, h)

            kpts = None
            if keypoints is not None:
                # shape: [num_person, 17, 3]
                kpts = keypoints.data[idx].cpu().numpy()

            # 머리, 상체 크롭해야 할 영역 추출
            head_box, torso_box, crop_source = self._get_crop_boxes(person_box, kpts)

            # 이미지 범위를 벗어난 bbox 좌표를 이미지 내부로 보정
            head_box = self._clip_box(head_box, w, h)
            torso_box = self._clip_box(torso_box, w, h)

            head_crop = self._safe_crop(frame, head_box)
            torso_crop = self._safe_crop(frame, torso_box)
            person_crop = self._safe_crop(frame, person_box)

            if head_crop is None:
                head_crop = person_crop

            if torso_crop is None:
                torso_crop = person_crop

            if head_crop is None or torso_crop is None:
                continue

            # 크롭된 이미지를 각각 모델에 입력해 결론 추출
            helmet_status, helmet_conf = self._classify_crop(self.helmet_model, head_crop)
            vest_status, vest_conf = self._classify_crop(self.vest_model, torso_crop)

            detections.append(
                CombinedDetection(
                    class_id=0,
                    class_name="person",
                    confidence=conf,
                    bbox=person_box,
                    person_id=idx,
                    head_bbox=head_box,
                    torso_bbox=torso_box,
                    helmet_status=helmet_status,
                    helmet_conf=helmet_conf,
                    vest_status=vest_status,
                    vest_conf=vest_conf,
                    crop_source=crop_source,
                )
            )

        return [asdict(d) for d in detections]

    def draw(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray: # 예측 결과를 원본 프레임 위에 bbox와 텍스트로 시각화한다.
        output = frame.copy()

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]

            head_box = det.get("head_bbox")
            torso_box = det.get("torso_bbox")

            helmet = det["helmet_status"]
            helmet_conf = det["helmet_conf"]

            vest = det["vest_status"]
            vest_conf = det["vest_conf"]

            person_conf = det["confidence"]
            crop_source = det.get("crop_source", "")

            # person box - green
            cv2.rectangle(output, (x1, y1), (x2, y2), (255, 0, 0), 2)
            object_id = det.get("object_id", det.get("person_id", ""))

            cv2.putText(
                output,
                f"person #{object_id} {person_conf:.2f} [{crop_source}]",
                (x1, max(20, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 0, 0),
                2,
                cv2.LINE_AA,
            )

            # head box - green or red
            if head_box is not None:
                hx1, hy1, hx2, hy2 = map(int, head_box)

                # 착용 여부에 따라 색 변경
                if helmet == "helmet":          # <- 클래스명이 다르면 수정
                    helmet_color = (0, 255, 0)  # 녹색
                else:
                    helmet_color = (0, 0, 255)  # 빨간색

                cv2.rectangle(output, (hx1, hy1), (hx2, hy2), helmet_color, 2)

                cv2.putText(
                    output,
                    f"{helmet} {helmet_conf:.2f}",
                    (hx1, max(20, hy1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    helmet_color,
                    2,
                    cv2.LINE_AA,
                )

            # torso box - orange
            if torso_box is not None:
                tx1, ty1, tx2, ty2 = map(int, torso_box)

                if vest == "safety_vest":              # <- 클래스명에 맞게 수정
                    vest_color = (0, 255, 0)
                else:
                    vest_color = (0, 0, 255)

                cv2.rectangle(output, (tx1, ty1), (tx2, ty2), vest_color, 2)

                cv2.putText(
                    output,
                    f"{vest} {vest_conf:.2f}",
                    (tx1, max(20, ty1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    vest_color,
                    2,
                    cv2.LINE_AA,
                )

        return output


if __name__ == "__main__":
    model = PPECombinedModel(
        pose_model_path="yolov8n-pose.pt",
        helmet_cls_path=r"runs\classify\helmet_cls\weights\best.pt",
        vest_cls_path=r"runs\classify\vest_cls\weights\best.pt",
        person_conf=0.25,
        device="cpu",
    )

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("Q 키를 누르면 종료됩니다.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        detections = model.predict(frame)
        vis = model.draw(frame, detections)

        cv2.imshow("PPE Pose Combined", vis)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()