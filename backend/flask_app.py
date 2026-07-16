from flask import Flask, render_template, jsonify, Response, request, redirect
import os
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FASTAPI_URL = "http://127.0.0.1:8000"

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)

# ----------------
# 로그인 / 대시보드
# ----------------
@app.route("/")
def root():
    return redirect("/login")


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


#----------------
# 모니터링 / CCTV 관리
#----------------
@app.route("/monitoring")
def monitoring():
    return render_template("monitoring.html")


@app.route("/cctv-manage")
def cctv_manage_page():
    return render_template("cctv-manage.html")


@app.route("/api/cctv", methods=["GET"])
def cctv_list():
    response = requests.get(f"{FASTAPI_URL}/api/cctv")
    return jsonify(response.json())


@app.route("/api/cctv", methods=["POST"])
def create_cctv():
    response = requests.post(
        f"{FASTAPI_URL}/api/cctv",
        json=request.get_json()
    )
    return jsonify(response.json())


@app.route("/api/cctv/<cctv_id>", methods=["PUT"])
def update_cctv(cctv_id):
    response = requests.put(
        f"{FASTAPI_URL}/api/cctv/{cctv_id}",
        json=request.get_json()
    )
    return jsonify(response.json())


@app.route("/api/cctv/<cctv_id>", methods=["DELETE"])
def delete_cctv(cctv_id):
    response = requests.delete(
        f"{FASTAPI_URL}/api/cctv/{cctv_id}"
    )
    return jsonify(response.json())

@app.route("/api/video-feed/<cctv_id>")
def video_feed(cctv_id):
    response = requests.get(
        f"{FASTAPI_URL}/api/video-feed/{cctv_id}",
        stream=True
    )

    return Response(
        response.iter_content(chunk_size=1024),
        content_type=response.headers["Content-Type"]
    )

@app.route("/api/monitoring/status")
def monitoring_status():
    cctv_id = request.args.get("cctvId")
    response = requests.get(
        f"{FASTAPI_URL}/api/monitoring/status",
        params={"cctvId": cctv_id}
    )
    return jsonify(response.json())

@app.route("/api/monitoring/status-all")
def monitoring_status_all():
    response = requests.get(
        f"{FASTAPI_URL}/api/monitoring/status-all"
    )

    return jsonify(response.json())

# ----------------
# 이벤트 로그 / 통계
# ----------------
@app.route("/event-log")
def event_log():
    return render_template("event-log.html")

@app.route("/api/events/<int:event_id>/status", methods=["PUT"])
def change_event_status(event_id):
    response = requests.put(
        f"{FASTAPI_URL}/api/events/{event_id}/status",
        json=request.get_json()
    )

    return jsonify(response.json())

@app.route("/statistics")
def statistics():
    return render_template("statistics.html")



# ----------------
# 공통 사이드바
# ----------------
@app.route("/sidebar")
def sidebar():
    return render_template("sidebar.html")

@app.route("/api/events")
def events():

    response = requests.get(
        f"{FASTAPI_URL}/api/events",
        params={
            "start_date": request.args.get("start_date"),
            "end_date": request.args.get("end_date"),
            "cctv_id": request.args.get("cctv_id")
        }
    )

    result = response.json()

    # DB에 저장된 실제 캡처 이미지 경로 사용
    if result.get("success") and "data" in result:
        for event in result["data"]:
            event["imageUrl"] = event.get("capture_path")

    return jsonify(result)

# ----------------
# 대시보드
# ----------------
@app.route("/api/dashboard")
def dashboard_data():
    response = requests.get(f"{FASTAPI_URL}/api/dashboard")
    return jsonify(response.json())

# ----------------
# 통계 분석
# ----------------
@app.route("/api/statistics")
def statistics_data():
    response = requests.get(
        f"{FASTAPI_URL}/api/statistics",
        params={
            "start_date": request.args.get("start_date"),
            "end_date": request.args.get("end_date")
        }
    )

    return jsonify(response.json())

# db 연결 테스트 
@app.route("/db")
def db():
    response = requests.get(f"{FASTAPI_URL}/db")
    return jsonify(response.json())

# ----------------
# 위험구역 설정
# ----------------
@app.route("/danger-zone")
def danger_zone():
    return render_template("danger-zone.html")


@app.route("/api/danger-zone", methods=["POST"])
def save_danger_zone():
    response = requests.post(
        f"{FASTAPI_URL}/api/danger-zone",
        json=request.get_json()
    )

    return jsonify(response.json())

@app.route("/danger-zone-manage")
def danger_zone_manage():
    return render_template("danger-zone-manage.html")

@app.route("/api/danger-zone", methods=["GET"])
def get_danger_zones():
    response = requests.get(f"{FASTAPI_URL}/api/danger-zone")
    return jsonify(response.json())


@app.route("/api/danger-zone/zone/<int:zone_id>", methods=["DELETE"])
def delete_danger_zone(zone_id):
    response = requests.delete(
        f"{FASTAPI_URL}/api/danger-zone/zone/{zone_id}"
    )
    return jsonify(response.json())

if __name__ == "__main__":
    app.run(debug=True, port=5000)