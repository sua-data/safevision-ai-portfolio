def get_center(bbox):
    """
    YOLO bbox 중심점 계산
    bbox = (x1, y1, x2, y2)
    """

    x1, y1, x2, y2 = bbox

    center_x = (x1 + x2) // 2
    center_y = (y1 + y2) // 2

    return center_x, center_y


def normalize_zone(zone):
    """
    프론트에서 넘어온 위험구역 좌표 정리
    zone = {
        "x1": 100,
        "y1": 80,
        "x2": 500,
        "y2": 350
    }

    드래그 방향이 반대여도 정상 처리
    """

    x1 = int(zone["x1"])
    y1 = int(zone["y1"])
    x2 = int(zone["x2"])
    y2 = int(zone["y2"])

    return {
        "x1": min(x1, x2),
        "y1": min(y1, y2),
        "x2": max(x1, x2),
        "y2": max(y1, y2)
    }

def scale_zone(
    danger_zone,
    frame_width,
    frame_height,
    base_width=1280,
    base_height=720
):
    """
    1280x720 기준으로 저장된 위험구역 좌표를
    실제 카메라 프레임 크기에 맞게 변환
    """

    zone = normalize_zone(danger_zone)

    scale_x = frame_width / base_width
    scale_y = frame_height / base_height

    return {
        "x1": int(zone["x1"] * scale_x),
        "y1": int(zone["y1"] * scale_y),
        "x2": int(zone["x2"] * scale_x),
        "y2": int(zone["y2"] * scale_y)
    }

def is_in_danger_zone(center_x, center_y, danger_zone):
    """
    중심점이 위험구역 내부에 있는지 판단
    """

    zone = normalize_zone(danger_zone)

    return (
        zone["x1"] <= center_x <= zone["x2"]
        and zone["y1"] <= center_y <= zone["y2"]
    )


def check_danger_zone_violation(
    bbox,
    danger_zone,
    frame_width,
    frame_height
):
    """
    bbox 중심점이 실제 영상 크기로 변환된 위험구역 안에 있는지 판단
    """

    center_x, center_y = get_center(bbox)

    scaled_zone = scale_zone(
        danger_zone,
        frame_width,
        frame_height
    )

    return is_in_danger_zone(
        center_x,
        center_y,
        scaled_zone
    )


def create_danger_zone_event(camera_id, bbox, danger_zone):
    """
    위험구역 진입 이벤트 생성
    DB 저장 전 임시 이벤트 데이터
    """

    center_x, center_y = get_center(bbox)

    event = {
        "camera_id": camera_id,
        "event_type": "DANGER_ZONE",
        "severity": "WARNING",
        "message": "위험구역 진입 감지",
        "bbox": {
            "x1": bbox[0],
            "y1": bbox[1],
            "x2": bbox[2],
            "y2": bbox[3]
        },
        "center": {
            "x": center_x,
            "y": center_y
        },
        "danger_zone": normalize_zone(danger_zone)
    }

    return event


def check_and_create_event(
    camera_id,
    bbox,
    danger_zone,
    frame_width,
    frame_height
):
    """
    진입 여부 판단 후, 진입이면 이벤트 생성
    진입 아니면 None 반환
    """

    if check_danger_zone_violation(
        bbox,
        danger_zone,
        frame_width,
        frame_height
    ):
        return create_danger_zone_event(
            camera_id,
            bbox,
            danger_zone
        )

    return None