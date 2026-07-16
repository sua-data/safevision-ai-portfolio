from backend.util.db import get_engine
from sqlalchemy import text

from fastapi import FastAPI, Body
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import StreamingResponse

from backend.event_log.getEventLogs import (
    get_event_logs,
    get_dashboard_data,
    get_statistics_data,
    update_event_status
)

from ai.detect import (
    generate_frames,
    get_latest_detection_status,
    get_all_latest_detection_status
)

app = FastAPI()

CAMERA_MAP = {
    "cctv01": 0,
    "cctv02": 1,
    "cctv03": 2,
}

def normalize_camera_source(stream_url):
    if stream_url is None:
        return None

    source = str(stream_url).strip()

    if not source:
        return None

    # USB 웹캠 번호: "0", "1", "2"
    if source.isdigit():
        return int(source)

    # 자기 자신을 다시 호출하는 주소는 허용하지 않음
    if "/api/video-feed/" in source:
        return None

    # 실제 rtsp/http/file 경로는 그대로 OpenCV에 넘김
    return source


def get_camera_source(cctv_id):
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            SELECT stream_url, is_active
            FROM cctv
            WHERE cctv_id = :cctv_id
            LIMIT 1
        """)

        row = conn.execute(sql, {"cctv_id": cctv_id}).mappings().first()

        if row and int(row["is_active"] or 0) != 1:
            return None

        # 기본 CCTV는 DB stream_url보다 하드코딩 웹캠 번호 우선
        if cctv_id in CAMERA_MAP:
            return CAMERA_MAP[cctv_id]

        if row:
            return normalize_camera_source(row["stream_url"])

        return None

    except Exception as e:
        print("CCTV 영상 소스 조회 오류:", e)
        return CAMERA_MAP.get(cctv_id)

    finally:
        if conn:
            conn.close()

app.add_middleware(SessionMiddleware, secret_key="motmachugetjyo")

# db 연결 테스트
@app.get('/db')
def db_test():
    conn = None
    try:
        conn = get_engine()
        sql = text("show tables")
        result = conn.execute(sql).fetchall()

        tables = [row[0] for row in result]

        return {
            "success": True,
            "tables": tables
        }
    except Exception as e:
        print(f"🚨 DB 연결 에러: {e}")
        return {"success": False, "message": "서버 오류가 발생했습니다."}
    finally:
        if conn:
            conn.close()

# -----------------------------
# CCTV 관리
# -----------------------------
@app.get("/api/cctv")
def cctv_list():
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            SELECT
                cctv_id,
                cctv_name,
                location,
                stream_url,
                is_active,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
            FROM cctv
            WHERE is_deleted = 0
            ORDER BY created_at DESC
        """)

        result = conn.execute(sql).mappings().all()

        data = []
        for row in result:
            item = dict(row)

            # 기존 monitoring.js 호환용
            item["id"] = item["cctv_id"]
            item["name"] = item["cctv_name"]

            data.append(item)

        return {
            "success": True,
            "data": data
        }

    except Exception as e:
        print("CCTV 목록 조회 오류:", e)
        return {
            "success": False,
            "message": "CCTV 목록 조회 실패",
            "data": []
        }

    finally:
        if conn:
            conn.close()

# CCTV 등록 API
@app.post("/api/cctv")
def create_cctv(data: dict = Body(...)):
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            INSERT INTO cctv (
                cctv_id,
                cctv_name,
                location,
                stream_url,
                is_active
            )
            VALUES (
                :cctv_id,
                :cctv_name,
                :location,
                :stream_url,
                :is_active
            )
        """)

        conn.execute(sql, {
            "cctv_id": data.get("cctv_id"),
            "cctv_name": data.get("cctv_name"),
            "location": data.get("location"),
            "stream_url": data.get("stream_url"),
            "is_active": data.get("is_active", 1)
        })

        conn.commit()

        return {
            "success": True,
            "message": "CCTV가 등록되었습니다."
        }

    except Exception as e:
        print("CCTV 등록 오류:", e)

        if conn:
            conn.rollback()

        return {
            "success": False,
            "message": "CCTV 등록 실패"
        }

    finally:
        if conn:
            conn.close()

# CCTV 수정 API
@app.put("/api/cctv/{cctv_id}")
def update_cctv(cctv_id: str, data: dict = Body(...)):
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            UPDATE cctv
            SET
                cctv_name = :cctv_name,
                location = :location,
                stream_url = :stream_url,
                is_active = :is_active
            WHERE cctv_id = :cctv_id
        """)

        result = conn.execute(sql, {
            "cctv_id": cctv_id,
            "cctv_name": data.get("cctv_name"),
            "location": data.get("location"),
            "stream_url": data.get("stream_url"),
            "is_active": data.get("is_active", 1)
        })

        conn.commit()

        if result.rowcount == 0:
            return {
                "success": False,
                "message": "수정할 CCTV가 없습니다."
            }

        return {
            "success": True,
            "message": "CCTV 정보가 수정되었습니다."
        }

    except Exception as e:
        print("CCTV 수정 오류:", e)

        if conn:
            conn.rollback()

        return {
            "success": False,
            "message": "CCTV 수정 실패"
        }

    finally:
        if conn:
            conn.close()

@app.delete("/api/cctv/{cctv_id}")
def delete_cctv(cctv_id: str):
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            UPDATE cctv
            SET is_deleted = 1
            WHERE cctv_id = :cctv_id
        """)

        result = conn.execute(sql, {
            "cctv_id": cctv_id
        })

        conn.commit()

        if result.rowcount == 0:
            return {
                "success": False,
                "message": "삭제할 CCTV가 없습니다."
            }

        return {
            "success": True,
            "message": "CCTV가 삭제되었습니다."
        }

    except Exception as e:
        print("CCTV 삭제 오류:", e)

        if conn:
            conn.rollback()

        return {
            "success": False,
            "message": "CCTV 삭제 실패"
        }

    finally:
        if conn:
            conn.close()

@app.get("/api/video-feed/{cctv_id}")
def video_feed(cctv_id: str):

    camera = get_camera_source(cctv_id)

    print("요청 CCTV:", cctv_id)
    print("최종 카메라 소스:", camera)

    if camera is None:
        return {"success": False}

    return StreamingResponse(
        generate_frames(camera, cctv_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/monitoring/status-all")
def monitoring_status_all():
    return {
        "success": True,
        "data": get_all_latest_detection_status()
    }


@app.get("/api/monitoring/status")
def monitoring_status(cctvId: str):
    return get_latest_detection_status(cctvId)

# -----------------------------
# event log
# -----------------------------
@app.get("/api/events")
def events(
    start_date: str = None,
    end_date: str = None,
    cctv_id: str = None
):

    data = get_event_logs(start_date, end_date, cctv_id)

    return {
        "success": True,
        "data": data
    }

@app.put("/api/events/{event_id}/status")
def change_event_status(event_id: int, data: dict = Body(...)):
    new_status = data.get("status")
    comment = data.get("comment")

    return update_event_status(
        event_id=event_id,
        new_status=new_status,
        comment=comment
    )

# -----------------------------
# dashboard
# -----------------------------
@app.get("/api/dashboard")
def dashboard_data():
    return get_dashboard_data()

# -----------------------------
# statistics
# -----------------------------
@app.get("/api/statistics")
def statistics_data(
    start_date: str = None,
    end_date: str = None
):
    return get_statistics_data(start_date, end_date)

# -----------------------------
# danger zone
# -----------------------------

@app.get("/api/danger-zone/{cctv_id}")
def get_danger_zone(cctv_id: str):
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            SELECT
                zone_id,
                cctv_id,
                zone_name,
                x1,
                y1,
                x2,
                y2,
                is_active
            FROM danger_zone
            WHERE cctv_id = :cctv_id
              AND is_active = 1
            ORDER BY updated_at DESC
            LIMIT 1
        """)

        row = conn.execute(sql, {"cctv_id": cctv_id}).mappings().first()

        return {
            "success": True,
            "data": dict(row) if row else None
        }

    except Exception as e:
        print("위험구역 조회 오류:", e)
        return {"success": False, "message": "위험구역 조회 실패", "data": None}

    finally:
        if conn:
            conn.close()


@app.post("/api/danger-zone")
def save_danger_zone(data: dict = Body(...)):
    conn = None

    try:
        conn = get_engine()

        cctv_id = data.get("cctv_id")
        zone_name = data.get("zone_name", "위험구역 1")

        x1 = int(data.get("x1"))
        y1 = int(data.get("y1"))
        x2 = int(data.get("x2"))
        y2 = int(data.get("y2"))

        x1, x2 = min(x1, x2), max(x1, x2)
        y1, y2 = min(y1, y2), max(y1, y2)

        check_sql = text("""
            SELECT zone_id
            FROM danger_zone
            WHERE cctv_id = :cctv_id
              AND is_active = 1
            ORDER BY updated_at DESC
            LIMIT 1
        """)

        existing = conn.execute(check_sql, {"cctv_id": cctv_id}).mappings().first()

        if existing:
            sql = text("""
                UPDATE danger_zone
                SET
                    zone_name = :zone_name,
                    x1 = :x1,
                    y1 = :y1,
                    x2 = :x2,
                    y2 = :y2,
                    is_active = 1
                WHERE zone_id = :zone_id
            """)

            conn.execute(sql, {
                "zone_id": existing["zone_id"],
                "zone_name": zone_name,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })

        else:
            sql = text("""
                INSERT INTO danger_zone (
                    cctv_id,
                    zone_name,
                    x1,
                    y1,
                    x2,
                    y2,
                    is_active
                )
                VALUES (
                    :cctv_id,
                    :zone_name,
                    :x1,
                    :y1,
                    :x2,
                    :y2,
                    1
                )
            """)

            conn.execute(sql, {
                "cctv_id": cctv_id,
                "zone_name": zone_name,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })

        conn.commit()

        return {
            "success": True,
            "message": "위험구역이 저장되었습니다."
        }

    except Exception as e:
        print("위험구역 저장 오류:", e)

        if conn:
            conn.rollback()

        return {
            "success": False,
            "message": "위험구역 저장 실패"
        }

    finally:
        if conn:
            conn.close()

@app.get("/api/danger-zone")
def get_danger_zone_list():
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            SELECT
                dz.zone_id,
                dz.cctv_id,
                COALESCE(c.cctv_name, '-') AS cctv_name,
                dz.zone_name,
                dz.x1,
                dz.y1,
                dz.x2,
                dz.y2,
                DATE_FORMAT(dz.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
            FROM danger_zone dz
            LEFT JOIN cctv c
                ON dz.cctv_id = c.cctv_id
            AND c.is_deleted = 0
            WHERE dz.is_active = 1
            ORDER BY dz.updated_at DESC
        """)

        result = conn.execute(sql).mappings().all()

        return {
            "success": True,
            "data": [dict(row) for row in result]
        }

    except Exception as e:
        print("위험구역 목록 조회 오류:", e)

        return {
            "success": False,
            "data": []
        }

    finally:
        if conn:
            conn.close()


@app.delete("/api/danger-zone/zone/{zone_id}")
def delete_danger_zone_by_id(zone_id: int):
    conn = None

    try:
        conn = get_engine()

        sql = text("""
            UPDATE danger_zone
            SET is_active = 0
            WHERE zone_id = :zone_id
              AND is_active = 1
        """)

        result = conn.execute(sql, {"zone_id": zone_id})
        conn.commit()

        if result.rowcount == 0:
            return {
                "success": False,
                "message": "삭제할 위험구역이 없습니다."
            }

        return {
            "success": True,
            "message": "위험구역이 삭제되었습니다."
        }

    except Exception as e:
        print("위험구역 삭제 오류:", e)

        if conn:
            conn.rollback()

        return {
            "success": False,
            "message": "위험구역 삭제 실패"
        }

    finally:
        if conn:
            conn.close()