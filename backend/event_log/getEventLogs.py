from backend.util.db import get_engine
from sqlalchemy import text
from pathlib import Path


CAMERA_MAP = {
    "cctv01": 0,
    "cctv02": 1,
    "cctv03": 2,
}


# 이벤트 로그 목록 조회
def get_event_logs(start_date=None, end_date=None, cctv_id=None):
    conn = None

    try:
        conn = get_engine()

        sql = """
            SELECT
                e.event_id AS id,
                DATE_FORMAT(e.detected_at, '%Y-%m-%d %H:%i:%s') AS time,
                c.cctv_name AS cctv,
                e.violation_type AS type,
                e.risk_level AS risk,
                e.risk_score AS score,
                e.status AS status,
                COALESCE((
                    SELECT eal.comment
                    FROM event_action_log eal
                    WHERE eal.event_id = e.event_id
                    ORDER BY eal.updated_at DESC, eal.action_id DESC
                    LIMIT 1
                ), '') AS memo,
                e.capture_path
            FROM event_log e
            JOIN cctv c
                ON e.cctv_id = c.cctv_id
            WHERE 1=1
        """

        params = {}

        # 시작일 필터
        if start_date:
            sql += " AND DATE(e.detected_at) >= :start_date"
            params["start_date"] = start_date

        # 종료일 필터
        if end_date:
            sql += " AND DATE(e.detected_at) <= :end_date"
            params["end_date"] = end_date

        # CCTV 선택 필터
        if cctv_id and cctv_id != "all":
            sql += " AND e.cctv_id = :cctv_id"
            params["cctv_id"] = cctv_id

        sql += " ORDER BY e.detected_at DESC"

        result = conn.execute(text(sql), params).mappings().all()

        return [dict(row) for row in result]

    except Exception as e:
        print("이벤트 조회 오류 :", e)
        return []

    finally:
        if conn:
            conn.close()


# 실시간 모니터링 상태 조회
def get_monitoring_status(cctvId=None):
    conn = None

    try:
        conn = get_engine()

        # =========================
        # 1. 개별 CCTV 조회
        # =========================
        if cctvId:
            # 선택한 CCTV의 최신 감지 기록 조회
            latest_detection_sql = text("""
                SELECT
                    worker_count,
                    helmet_count,
                    no_helmet_count,
                    vest_count,
                    no_vest_count,
                    ppe_wear_rate,
                    detected_at
                FROM detection_log
                WHERE cctv_id = :cctv_id
                ORDER BY detected_at DESC
                LIMIT 1
            """)

            detection = conn.execute(
                latest_detection_sql,
                {"cctv_id": cctvId}
            ).mappings().first()

            # 선택한 CCTV의 최신 위험 이벤트 조회
            latest_event_sql = text("""
                SELECT
                    risk_score,
                    risk_level,
                    violation_type,
                    detected_at
                FROM event_log
                WHERE cctv_id = :cctv_id
                ORDER BY detected_at DESC
                LIMIT 1
            """)

            event = conn.execute(
                latest_event_sql,
                {"cctv_id": cctvId}
            ).mappings().first()

            # 오늘 발생한 위반 유형별 건수 조회
            violation_count_sql = text("""
                SELECT
                    SUM(CASE 
                        WHEN violation_type LIKE '%안전모 미착용%' 
                        OR violation_type LIKE '%PPE 미착용%' 
                        THEN 1 ELSE 0 
                    END) AS helmet_violation,

                    SUM(CASE 
                        WHEN violation_type LIKE '%안전조끼 미착용%' 
                        OR violation_type LIKE '%PPE 미착용%' 
                        THEN 1 ELSE 0 
                    END) AS vest_violation,

                    SUM(CASE 
                        WHEN violation_type LIKE '%위험구역 진입%' 
                        THEN 1 ELSE 0 
                    END) AS zone_violation
                FROM event_log
                WHERE cctv_id = :cctv_id
                  AND DATE(detected_at) = CURDATE()
            """)

            violations = conn.execute(
                violation_count_sql,
                {"cctv_id": cctvId}
            ).mappings().first()

            risk_level = event["risk_level"] if event else "SAFE"
            risk_score = event["risk_score"] if event else 0

            worker_count = detection["worker_count"] if detection else 0
            helmet_count = detection["helmet_count"] if detection else 0
            no_helmet_count = detection["no_helmet_count"] if detection else 0
            vest_count = detection["vest_count"] if detection else 0
            no_vest_count = detection["no_vest_count"] if detection else 0
            ppe_rate = (
                float(detection["ppe_wear_rate"])
                if detection and detection["ppe_wear_rate"] is not None
                else 0
            )
            last_detected = str(detection["detected_at"]) if detection else "-"

        # =========================
        # 2. 전체 CCTV 조회
        # =========================
        else:
            # CCTV별 최신 감지 기록만 모아서 전체 현황 계산
            latest_detection_sql = text("""
                SELECT
                    SUM(worker_count) AS worker_count,
                    SUM(helmet_count) AS helmet_count,
                    SUM(no_helmet_count) AS no_helmet_count,
                    SUM(vest_count) AS vest_count,
                    SUM(no_vest_count) AS no_vest_count,
                    AVG(ppe_wear_rate) AS ppe_wear_rate,
                    MAX(detected_at) AS detected_at
                FROM (
                    SELECT dl.*
                    FROM detection_log dl
                    INNER JOIN (
                        SELECT cctv_id, MAX(detected_at) AS latest_time
                        FROM detection_log
                        GROUP BY cctv_id
                    ) latest
                    ON dl.cctv_id = latest.cctv_id
                    AND dl.detected_at = latest.latest_time
                ) latest_detection
            """)

            detection = conn.execute(latest_detection_sql).mappings().first()

            # 오늘 발생한 이벤트 중 가장 높은 위험도 기준으로 전체 상태 계산
            latest_event_sql = text("""
                SELECT
                    MAX(risk_score) AS risk_score,
                    CASE
                        WHEN SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) > 0 THEN 'CRITICAL'
                        WHEN SUM(CASE WHEN risk_level = 'DANGER' THEN 1 ELSE 0 END) > 0 THEN 'DANGER'
                        WHEN SUM(CASE WHEN risk_level = 'WARNING' THEN 1 ELSE 0 END) > 0 THEN 'WARNING'
                        ELSE 'SAFE'
                    END AS risk_level
                FROM event_log
                WHERE DATE(detected_at) = CURDATE()
            """)

            event = conn.execute(latest_event_sql).mappings().first()

            # 오늘 전체 CCTV 기준 위반 유형별 건수 조회
            violation_count_sql = text("""
                SELECT
                    SUM(CASE 
                        WHEN violation_type LIKE '%안전모 미착용%' 
                        OR violation_type LIKE '%PPE 미착용%' 
                        THEN 1 ELSE 0 
                    END) AS helmet_violation,

                    SUM(CASE 
                        WHEN violation_type LIKE '%안전조끼 미착용%' 
                        OR violation_type LIKE '%PPE 미착용%' 
                        THEN 1 ELSE 0 
                    END) AS vest_violation,

                    SUM(CASE 
                        WHEN violation_type LIKE '%위험구역 진입%' 
                        THEN 1 ELSE 0 
                    END) AS zone_violation
                FROM event_log
                WHERE DATE(detected_at) = CURDATE()
            """)

            violations = conn.execute(violation_count_sql).mappings().first()

            risk_level = event["risk_level"] if event and event["risk_level"] else "SAFE"
            risk_score = event["risk_score"] if event and event["risk_score"] is not None else 0

            worker_count = int(detection["worker_count"] or 0)
            helmet_count = int(detection["helmet_count"] or 0)
            no_helmet_count = int(detection["no_helmet_count"] or 0)
            vest_count = int(detection["vest_count"] or 0)
            no_vest_count = int(detection["no_vest_count"] or 0)
            ppe_rate = float(detection["ppe_wear_rate"] or 0)
            last_detected = str(detection["detected_at"]) if detection and detection["detected_at"] else "-"

        risk_text_map = {
            "SAFE": "안전",
            "WARNING": "주의",
            "DANGER": "위험",
            "CRITICAL": "심각"
        }

        return {
            "cctvId": cctvId if cctvId else "ALL",
            "riskLevel": risk_level,
            "riskText": risk_text_map.get(risk_level, "-"),
            "riskScore": int(risk_score or 0),

            "workerCount": worker_count,
            "helmetCount": helmet_count,
            "noHelmetCount": no_helmet_count,
            "vestCount": vest_count,
            "noVestCount": no_vest_count,
            "ppeRate": ppe_rate,

            "violations": {
                "helmet": int(violations["helmet_violation"] or 0),
                "vest": int(violations["vest_violation"] or 0),
                "zone": int(violations["zone_violation"] or 0)
            },

            "lastDetected": last_detected
        }

    except Exception as e:
        print("모니터링 상태 조회 오류:", e)

        return {
            "cctvId": cctvId if cctvId else "ALL",
            "riskLevel": "SAFE",
            "riskText": "조회 실패",
            "riskScore": 0,
            "workerCount": 0,
            "helmetCount": 0,
            "noHelmetCount": 0,
            "vestCount": 0,
            "noVestCount": 0,
            "ppeRate": 0,
            "violations": {
                "helmet": 0,
                "vest": 0,
                "zone": 0
            },
            "lastDetected": "-"
        }

    finally:
        if conn:
            conn.close()


# 대시보드 데이터 조회
def get_dashboard_data():
    conn = None

    try:
        conn = get_engine()

        # 오늘 발생한 전체 위험 이벤트 수
        today_warning_sql = text("""
            SELECT COUNT(*) AS count
            FROM event_log
            WHERE DATE(detected_at) = CURDATE()
        """)

        today_warning = conn.execute(today_warning_sql).mappings().first()
        today_warning_count = today_warning["count"] if today_warning else 0

        yesterday_warning_sql = text("""
            SELECT COUNT(*) AS count
            FROM event_log
            WHERE DATE(detected_at) = CURDATE() - INTERVAL 1 DAY
        """)

        yesterday_warning = conn.execute(yesterday_warning_sql).mappings().first()
        yesterday_warning_count = yesterday_warning["count"] if yesterday_warning else 0

        warning_change = today_warning_count - yesterday_warning_count

        # 오늘 평균 PPE 착용률
        ppe_sql = text("""
            SELECT AVG(ppe_wear_rate) AS avg_ppe_rate
            FROM detection_log
            WHERE DATE(detected_at) = CURDATE()
        """)

        ppe_result = conn.execute(ppe_sql).mappings().first()
        ppe_rate = ppe_result["avg_ppe_rate"] if ppe_result else None
        ppe_rate = round(float(ppe_rate), 1) if ppe_rate is not None else 0

        yesterday_ppe_sql = text("""
            SELECT AVG(ppe_wear_rate) AS avg_ppe_rate
            FROM detection_log
            WHERE DATE(detected_at) = CURDATE() - INTERVAL 1 DAY
        """)

        yesterday_ppe_result = conn.execute(yesterday_ppe_sql).mappings().first()

        yesterday_ppe_rate = (
            round(float(yesterday_ppe_result["avg_ppe_rate"]), 1)
            if yesterday_ppe_result and yesterday_ppe_result["avg_ppe_rate"] is not None
            else 0
        )

        ppe_change = round(ppe_rate - yesterday_ppe_rate, 1)

        # 등록된 CCTV 수와 사용 중 CCTV 수 조회
        cctv_sql = text("""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS connected,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
            FROM cctv
            WHERE is_deleted = 0
        """)

        cctv_result = conn.execute(cctv_sql).mappings().first()

        total_cctv = int(cctv_result["total"] or 0)
        connected_cctv = int(cctv_result["connected"] or 0)
        inactive_cctv = int(cctv_result["inactive"] or 0)

        # 오늘 가장 높은 위험도 조회
        overall_sql = text("""
            SELECT risk_level, risk_score
            FROM event_log
            WHERE detected_at >= NOW() - INTERVAL 10 MINUTE
            ORDER BY risk_score DESC
            LIMIT 1
        """)

        overall = conn.execute(overall_sql).mappings().first()

        if overall:
            overall_status = overall["risk_level"]
        else:
            overall_status = "SAFE"

        status_text_map = {
            "SAFE": "안전 상태입니다.",
            "WARNING": "주의가 필요합니다.",
            "DANGER": "위험 상황이 감지되었습니다.",
            "CRITICAL": "심각한 위험 상황입니다."
        }

        # 최근 발생한 이벤트 5건 조회
        recent_sql = text("""
            SELECT
                DATE_FORMAT(e.detected_at, '%Y-%m-%d %H:%i:%s') AS time,
                c.cctv_name AS cctv,
                e.violation_type AS violation,
                e.risk_level AS riskLevel,
                e.status AS status
            FROM event_log e
            JOIN cctv c
                ON e.cctv_id = c.cctv_id
            ORDER BY e.detected_at DESC
            LIMIT 5
        """)

        recent_events = conn.execute(recent_sql).mappings().all()

        return {
            "overallStatus": {
                "status": overall_status,
                "text": status_text_map.get(overall_status, "-")
            },
            "todayWarning": {
                "count": today_warning_count,
                "change": f"{warning_change:+d}",
                "changeText": "(어제 대비)"
            },
            "ppeRate": {
                "rate": ppe_rate,
                "change": f"{ppe_change:+.1f}%",
                "changeText": "(어제 대비)"
            },
            "cctv": {
                "connected": connected_cctv,
                "total": total_cctv,
                "text": (
                    "모든 CCTV 사용중"
                    if connected_cctv == total_cctv and total_cctv > 0
                    else "등록된 CCTV 없음"
                    if total_cctv == 0
                    else "일부 CCTV 미사용"
                )
            },
            "recentEvents": [dict(row) for row in recent_events]
        }

    except Exception as e:
        print("대시보드 조회 오류:", e)

        return {
            "overallStatus": {
                "status": "SAFE",
                "text": "조회 실패"
            },
            "todayWarning": {
                "count": 0,
                "change": None,
                "changeText": None
            },
            "ppeRate": {
                "rate": 0,
                "change": None,
                "changeText": None
            },
            "cctv": {
                "connected": 0,
                "total": 0,
                "text": "조회 실패"
            },
            "recentEvents": []
        }

    finally:
        if conn:
            conn.close()


# 통계 대시보드 데이터 조회
def get_statistics_data(start_date=None, end_date=None):
    conn = None

    try:
        conn = get_engine()

        # event_log 조회 조건
        where = "WHERE 1=1"
        params = {}

        if start_date:
            where += " AND DATE(detected_at) >= :start_date"
            params["start_date"] = start_date

        if end_date:
            where += " AND DATE(detected_at) <= :end_date"
            params["end_date"] = end_date

        # 위험 이벤트 수와 평균 위험 점수 조회
        summary_sql = text(f"""
            SELECT
                COUNT(*) AS warning_count,
                AVG(risk_score) AS avg_risk_score
            FROM event_log
            {where}
        """)

        summary = conn.execute(summary_sql, params).mappings().first()

        # detection_log 조회 조건
        detection_where = "WHERE 1=1"
        detection_params = {}

        if start_date:
            detection_where += " AND DATE(detected_at) >= :start_date"
            detection_params["start_date"] = start_date

        if end_date:
            detection_where += " AND DATE(detected_at) <= :end_date"
            detection_params["end_date"] = end_date

        # 감지 분석 횟수와 평균 PPE 착용률 조회
        detection_sql = text(f"""
            SELECT
                SUM(worker_count) AS total_count,
                AVG(ppe_wear_rate) AS avg_ppe_rate
            FROM detection_log
            {detection_where}
        """)

        detection = conn.execute(detection_sql, detection_params).mappings().first()

        # 시간대별 위험 이벤트 수 조회
        hourly_sql = text(f"""
            SELECT
                HOUR(detected_at) AS hour,
                COUNT(*) AS count
            FROM event_log
            {where}
            GROUP BY HOUR(detected_at)
            ORDER BY hour
        """)

        hourly_rows = conn.execute(hourly_sql, params).mappings().all()

        # 위험 유형별 발생 비율 조회
        type_sql = text(f"""
            SELECT
                violation_type AS type,
                COUNT(*) AS count
            FROM event_log
            {where}
            GROUP BY violation_type
        """)

        type_rows = conn.execute(type_sql, params).mappings().all()

        total_warning = int(summary["warning_count"] or 0)

        violation_types = []
        for row in type_rows:
            count = int(row["count"] or 0)
            rate = round((count / total_warning) * 100, 1) if total_warning > 0 else 0

            violation_types.append({
                "type": row["type"],
                "rate": rate
            })

        return {
            "summary": {
                "totalCount": int(detection["total_count"] or 0),
                "warningCount": total_warning,
                "ppeRate": round(float(detection["avg_ppe_rate"] or 0), 1),
                "riskScore": round(float(summary["avg_risk_score"] or 0), 1)
            },
            "hourlyWarnings": [
                {
                    "time": f"{int(row['hour']):02d}시",
                    "count": int(row["count"])
                }
                for row in hourly_rows
            ],
            "violationTypes": violation_types
        }

    except Exception as e:
        print("통계 조회 오류:", e)

        return {
            "summary": {
                "totalCount": 0,
                "warningCount": 0,
                "ppeRate": 0,
                "riskScore": 0
            },
            "hourlyWarnings": [],
            "violationTypes": []
        }

    finally:
        if conn:
            conn.close()


# 위험 이벤트와 캡처 이미지 정보를 DB에 저장
def save_event_with_capture(cctv_id, detection_result):
    conn = None

    try:
        conn = get_engine()

        capture_path = detection_result.get("capture_path")
        capture_url = detection_result.get("capture_url")
        violation_type = detection_result.get("violation_type", "NONE")
        risk_score = detection_result.get("risk_score", 0)
        risk_level = detection_result.get("risk_status", "SAFE")

        # 캡처가 없거나 위반 유형이 없으면 이벤트로 저장하지 않음
        if not capture_path or violation_type == "NONE":
            return None

        helmet_status = "미착용" if detection_result.get("no_helmet", 0) > 0 else "착용"
        vest_status = "미착용" if detection_result.get("no_safety_vest", 0) > 0 else "착용"

        # event_log에 위험 이벤트 저장
        event_sql = text("""
            INSERT INTO event_log (
                cctv_id,
                violation_type,
                risk_score,
                risk_level,
                helmet_status,
                vest_status,
                capture_path,
                status
            )
            VALUES (
                :cctv_id,
                :violation_type,
                :risk_score,
                :risk_level,
                :helmet_status,
                :vest_status,
                :capture_path,
                '미확인'
            )
        """)

        result = conn.execute(event_sql, {
            "cctv_id": cctv_id,
            "violation_type": violation_type,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "helmet_status": helmet_status,
            "vest_status": vest_status,
            "capture_path": capture_url or capture_path
        })

        event_id = result.lastrowid

        # capture_image에 캡처 이미지 정보 저장
        file_name = Path(capture_path).name

        capture_sql = text("""
            INSERT INTO capture_image (
                event_id,
                cctv_id,
                file_name,
                file_path
            )
            VALUES (
                :event_id,
                :cctv_id,
                :file_name,
                :file_path
            )
        """)

        conn.execute(capture_sql, {
            "event_id": event_id,
            "cctv_id": cctv_id,
            "file_name": file_name,
            "file_path": capture_url or capture_path
        })

        conn.commit()

        print("이벤트/캡처 저장 성공:", event_id)
        return event_id

    except Exception as e:
        print("이벤트/캡처 저장 오류:", e)

        if conn:
            conn.rollback()

        return None

    finally:
        if conn:
            conn.close()


# 전체 감지 분석 결과를 detection_log에 저장
def save_detection_log(cctv_id, detection_result):
    conn = None

    try:
        conn = get_engine()

        person_count = detection_result.get("person", 0)
        helmet_count = detection_result.get("helmet", 0)
        no_helmet_count = detection_result.get("no_helmet", 0)
        vest_count = detection_result.get("safety_vest", 0)
        no_vest_count = detection_result.get("no_safety_vest", 0)

        # 사람 1명당 안전모 + 안전조끼 2개 기준으로 PPE 착용률 계산
        if person_count > 0:
            ppe_wear_rate = round(
                ((helmet_count + vest_count) / (person_count * 2)) * 100,
                1
            )
        else:
            ppe_wear_rate = 0

        # detection_log에 일반 감지 분석 결과 저장
        sql = text("""
            INSERT INTO detection_log (
                cctv_id,
                worker_count,
                helmet_count,
                no_helmet_count,
                vest_count,
                no_vest_count,
                ppe_wear_rate
            )
            VALUES (
                :cctv_id,
                :worker_count,
                :helmet_count,
                :no_helmet_count,
                :vest_count,
                :no_vest_count,
                :ppe_wear_rate
            )
        """)

        conn.execute(sql, {
            "cctv_id": cctv_id,
            "worker_count": person_count,
            "helmet_count": helmet_count,
            "no_helmet_count": no_helmet_count,
            "vest_count": vest_count,
            "no_vest_count": no_vest_count,
            "ppe_wear_rate": ppe_wear_rate
        })

        conn.commit()

        print("감지 로그 저장 성공")

    except Exception as e:
        print("감지 로그 저장 오류:", e)

        if conn:
            conn.rollback()

    finally:
        if conn:
            conn.close()

# 이벤트 처리 저장
def update_event_status(event_id, new_status, comment=None):
    conn = None

    allowed_status = ["미확인", "확인", "조치완료"]

    if new_status not in allowed_status:
        return {
            "success": False,
            "message": "허용되지 않은 상태값입니다."
        }

    try:
        conn = get_engine()

        current_sql = text("""
            SELECT status
            FROM event_log
            WHERE event_id = :event_id
        """)

        current = conn.execute(
            current_sql,
            {"event_id": event_id}
        ).mappings().first()

        if not current:
            return {
                "success": False,
                "message": "이벤트를 찾을 수 없습니다."
            }

        previous_status = current["status"]

        update_sql = text("""
            UPDATE event_log
            SET status = :new_status
            WHERE event_id = :event_id
        """)

        conn.execute(update_sql, {
            "event_id": event_id,
            "new_status": new_status
        })

        action_sql = text("""
            INSERT INTO event_action_log (
                event_id,
                previous_status,
                new_status,
                comment
            )
            VALUES (
                :event_id,
                :previous_status,
                :new_status,
                :comment
            )
        """)

        conn.execute(action_sql, {
            "event_id": event_id,
            "previous_status": previous_status,
            "new_status": new_status,
            "comment": comment
        })

        conn.commit()

        return {
            "success": True,
            "message": "이벤트 처리 상태가 저장되었습니다.",
            "data": {
                "event_id": event_id,
                "previous_status": previous_status,
                "new_status": new_status,
                "comment": comment
            }
        }

    except Exception as e:
        print("이벤트 상태 변경 오류:", e)

        if conn:
            conn.rollback()

        return {
            "success": False,
            "message": "이벤트 상태 변경에 실패했습니다."
        }

    finally:
        if conn:
            conn.close()