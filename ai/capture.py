import os
from datetime import datetime


SAVE_DIR = "static/captures"
COOLDOWN_SECONDS = 10

# 동일 CCTV + 동일 위반 유형의 중복 캡처를 막기 위한 마지막 캡처 시간 저장
last_capture_time = {}


def should_capture(status):
    """
    [5-01] DANGER 이상이면 캡처
    SAFE, WARNING 등급은 캡처하지 않음

    - SAFE: 저장 안 함
    - WARNING: 로그만 저장
    - DANGER: 캡처 + 로그 저장
    - CRITICAL: 캡처 + 로그 저장
    """

    if status in ["DANGER", "CRITICAL"]:
        return True

    return False


def make_capture_filename(cctv_id):
    """
    [5-02] CCTV ID + 발생 시간으로 파일명 생성
    예: CCTV01_20260703_143621.jpg
    """

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{cctv_id}_{now}.jpg"

    return filename


def make_capture_path(cctv_id):
    """
    [5-02] static/captures 하위 저장 경로 생성
    """

    os.makedirs(SAVE_DIR, exist_ok=True)

    filename = make_capture_filename(cctv_id)
    save_path = os.path.join(SAVE_DIR, filename)

    return save_path


def is_cooldown_passed(cctv_id, violation_type):
    """
    [5-03] 동일 CCTV + 동일 위반 유형 기준 중복 캡처 방지
    """

    key = f"{cctv_id}_{violation_type}"
    now = datetime.now()

    if key not in last_capture_time:
        last_capture_time[key] = now
        return True

    elapsed_time = (now - last_capture_time[key]).total_seconds()

    if elapsed_time >= COOLDOWN_SECONDS:
        last_capture_time[key] = now
        return True

    return False


def get_capture_path_if_needed(cctv_id, violation_type, status):
    """
    캡처가 필요하면 저장 경로 반환
    필요 없으면 None 반환

    이 함수는 실제 이미지를 저장하지 않고,
    저장할 파일 경로만 만들어서 반환한다.
    실제 저장은 cv2.imwrite()를 호출하는 쪽에서 처리한다.
    """

    if not should_capture(status):
        return None

    if not is_cooldown_passed(cctv_id, violation_type):
        return None

    save_path = make_capture_path(cctv_id)

    return save_path