# SafeVision AI

CCTV 영상 기반 PPE 작업자 안전 모니터링 시스템

> **Team Project | 2026.07**  
> 담당 역할: 실시간 영상 감지 및 AI 결과의 웹 서비스 연동

---

## 1. 프로젝트 소개

SafeVision AI는 CCTV 영상에서 작업자와 안전모·안전조끼 착용 상태를 감지하고, 위험구역 진입 여부와 위험도 등급을 판단하는 AI 안전 모니터링 서비스입니다.

PPE 미착용 또는 위험구역 진입 상황이 발생하면 위험도 점수를 계산하고, 위험 이벤트와 캡처 이미지를 저장합니다.

관리자는 실시간 모니터링, 이벤트 로그, 대시보드와 통계 화면을 통해 현장 안전 상태를 확인할 수 있습니다.

본 프로젝트는 3인 팀 프로젝트로 진행했으며, 저는 **실시간 영상 프레임 처리, AI 감지 결과 구조화, FastAPI 및 Flask 기반 서비스 연동**을 담당했습니다.

---

## 2. 기획 배경

산업 현장에서는 안전모와 안전조끼 등 개인 보호구 착용 여부가 작업자의 안전과 직접적으로 연결됩니다.

하지만 관리자가 여러 CCTV 화면을 계속 확인하는 방식은 위험 상황을 즉시 발견하기 어렵고, PPE 착용 여부를 수동으로 확인하는 과정에서도 누락이 발생할 수 있습니다.

SafeVision AI는 기존 CCTV를 사고 발생 이후 확인하는 도구에서 AI 기반 실시간 안전 관리 도구로 확장하기 위해 기획했습니다.

### 해결하고자 한 문제

- 여러 CCTV 화면을 지속적으로 확인해야 하는 관리 부담
- 작업자별 PPE 착용 여부 확인의 어려움
- 위험구역 진입 상황의 즉각적인 판단 한계
- 위험 상황 발생 시점과 영상 기록의 비효율
- 현장 안전 상태를 정량적으로 확인하기 어려운 문제

---

## 3. 핵심 기능

### 실시간 모니터링

- CCTV 또는 영상 파일 프레임 입력
- 작업자 위치 감지
- 안전모 착용 여부 확인
- 안전조끼 착용 여부 확인
- 위험구역 진입 여부 확인
- 작업자별 Bounding Box 표시
- 현재 위험도 점수 및 등급 표시
- PPE 위반 현황 표시

### 위험도 판단

- 안전모 미착용 여부 반영
- 안전조끼 미착용 여부 반영
- 위험구역 진입 여부 반영
- 위반 항목별 위험 점수 합산
- SAFE, WARNING, DANGER, CRITICAL 등급 분류

### 이벤트 로그

- 위험 이벤트 발생 시 로그 저장
- CCTV 정보와 발생 시각 저장
- 위반 유형과 위험도 저장
- 캡처 이미지 저장
- 기간 및 CCTV별 이벤트 조회
- 이벤트 처리 상태 관리

### 대시보드 및 통계

- 전체 안전 상태 요약
- 위험 이벤트 발생 건수 확인
- PPE 착용률 확인
- CCTV 연결 상태 확인
- 시간대별 위험 이벤트 추이
- 위반 유형별 발생 비율 확인

### 위험구역 관리

- CCTV별 위험구역 설정
- 화면 드래그를 통한 영역 지정
- 위험구역 좌표 저장
- 작업자 중심점 기준 진입 여부 판정

---

## 4. 시스템 구조

```text
CCTV / Video File
        │
        ▼
OpenCV Frame Input
        │
        ▼
YOLO Pose
작업자 위치 및 관절 추출
        │
        ├─────────────────┐
        ▼                 ▼
   Head Crop          Torso Crop
        │                 │
        ▼                 ▼
 Helmet Model      Safety Vest Model
        │                 │
        └────────┬────────┘
                 ▼
        PPE Detection Result
                 │
                 ▼
        Danger Zone Check
                 │
                 ▼
        Risk Score Calculation
                 │
        ┌────────┴────────┐
        ▼                 ▼
 FastAPI API        Event Capture
        │                 │
        ▼                 ▼
    MariaDB         Capture Image
        │
        ▼
 Flask Web Server
        │
        ▼
Dashboard / Monitoring
Event Log / Statistics
```

---

## 5. AI 감지 방식

SafeVision AI는 YOLO Pose 기반 작업자 탐지와 안전모·안전조끼 분류 모델을 결합한 구조로 구현했습니다.

### 감지 과정

1. CCTV 또는 영상 파일에서 프레임을 입력합니다.
2. YOLO Pose 모델로 작업자 위치와 관절 좌표를 추출합니다.
3. 관절 정보를 이용해 머리와 상체 영역을 생성합니다.
4. 머리 영역은 안전모 분류 모델에 입력합니다.
5. 상체 영역은 안전조끼 분류 모델에 입력합니다.
6. 작업자별 PPE 착용 상태와 confidence를 생성합니다.
7. 감지 결과를 JSON 형태로 구조화합니다.
8. 작업자 위치와 위험구역 좌표를 비교합니다.
9. 위반 항목별 위험도 점수를 계산합니다.
10. 위험도가 DANGER 이상이면 이벤트와 캡처 이미지를 저장합니다.
11. 최신 감지 결과를 실시간 모니터링 화면에 전달합니다.

### 감지 결과 데이터

```json
{
  "person": 1,
  "helmet": 1,
  "no_helmet": 0,
  "safety_vest": 0,
  "no_safety_vest": 1,
  "risk_score": 30,
  "risk_level": "WARNING"
}
```

---

## 6. 위험도 산정 기준

### 위반 항목별 점수

| 항목 | 점수 |
|---|---:|
| 안전모 미착용 | 40 |
| 안전조끼 미착용 | 30 |
| 위험구역 진입 | 30 |

### 위험도 등급

| 점수 | 등급 | 설명 |
|---:|---|---|
| 0~29 | SAFE | 정상 상태 |
| 30~59 | WARNING | 주의가 필요한 상태 |
| 60~79 | DANGER | 위험 이벤트 저장 대상 |
| 80~100 | CRITICAL | 복합 위험 상황 |

DANGER 이상인 경우 이벤트 로그와 캡처 이미지를 저장하며, 동일 이벤트가 반복 저장되는 것을 방지하기 위해 10초 쿨다운을 적용했습니다.

---

## 7. 담당 역할

### 실시간 프레임 감지

- CCTV 및 영상 파일을 OpenCV로 프레임 단위 입력
- PPE 통합 모델을 이용한 실시간 감지
- 작업자와 PPE 상태를 Bounding Box로 시각화
- 분석된 프레임을 JPG로 변환
- 브라우저 스트리밍 응답 생성

### 감지 결과 JSON 구조화

- 감지된 작업자 수 집계
- 안전모 착용 및 미착용 상태 분리
- 안전조끼 착용 및 미착용 상태 분리
- 화면, API와 DB에서 사용할 수 있는 JSON 데이터 생성
- 위험도 판단 모듈에 전달할 기본 데이터 구성

### 실시간 모니터링 화면 연동

- CCTV별 최신 감지 결과 저장
- 위험도 점수와 등급 데이터 구성
- PPE 착용 수와 위반 현황 구성
- 캡처 이미지 URL 연결
- `/api/monitoring/status` API 연동
- 실시간 모니터링 카드와 위반 현황 화면 반영

### Backend 및 Frontend 연동

- Flask 화면 라우팅
- FastAPI API와 화면 데이터 연결
- 로그인, 대시보드, 모니터링 및 CCTV 관리 화면 연동
- 감지 결과와 MariaDB 저장 흐름 확인
- 기능 통합 테스트 및 오류 수정

---

## 8. 주요 구현 코드

### 8.1 실시간 영상 프레임 처리

```python
def generate_frames(cctv_id):
    cap = cv2.VideoCapture(get_video_source(cctv_id))

    while cap.isOpened():
        success, frame = cap.read()

        if not success:
            break

        detections = model.detect(frame)
        result_frame = model.draw(frame, detections)

        success, buffer = cv2.imencode(".jpg", result_frame)

        if not success:
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )
```

CCTV 또는 영상 파일을 프레임 단위로 읽고 AI 감지를 수행한 뒤, 감지 결과가 표시된 프레임을 JPG로 변환하여 브라우저에 전달했습니다.

### 8.2 감지 결과 JSON 구조화

```python
def summarize_detections(detections):
    result = {
        "person": 0,
        "helmet": 0,
        "no_helmet": 0,
        "safety_vest": 0,
        "no_safety_vest": 0,
    }

    for detection in detections:
        result["person"] += 1

        if detection.get("helmet_status") == "helmet":
            result["helmet"] += 1
        else:
            result["no_helmet"] += 1

        if detection.get("vest_status") == "safety_vest":
            result["safety_vest"] += 1
        else:
            result["no_safety_vest"] += 1

    return result
```

작업자별 감지 결과를 집계하여 화면 표시, API 응답, 위험도 판단과 DB 저장에 사용할 수 있는 형태로 변환했습니다.

### 8.3 최신 모니터링 상태 저장

```python
latest_detection_status[cctv_id] = {
    "cctv_id": cctv_id,
    "risk_score": risk_result["score"],
    "risk_level": risk_result["level"],
    "violations": risk_result["violations"],
    "person": detection_summary["person"],
    "helmet": detection_summary["helmet"],
    "no_helmet": detection_summary["no_helmet"],
    "safety_vest": detection_summary["safety_vest"],
    "no_safety_vest": detection_summary["no_safety_vest"],
    "capture_url": capture_url,
}
```

CCTV별 최신 감지 상태를 메모리에 저장하고, 모니터링 화면에서 위험도와 PPE 현황을 조회할 수 있도록 구성했습니다.

> 코드 예시는 핵심 처리 흐름을 설명하기 위해 단순화한 형태이며, 실제 구현 코드는 프로젝트 저장소를 기준으로 합니다.

---

## 9. 기술 스택

### AI / Computer Vision

- Python
- Ultralytics YOLO
- YOLO Pose
- YOLO Classification
- OpenCV
- NumPy

### Backend

- FastAPI
- Flask
- Uvicorn
- SQLAlchemy
- PyMySQL

### Database

- MariaDB

### Frontend

- HTML
- CSS
- JavaScript
- Fetch API
- Chart.js

### Tools

- Git
- GitHub
- Visual Studio Code
- Figma
- DBeaver

---

## 10. 주요 데이터베이스 구조

| 구분 | 설명 |
|---|---|
| CCTV | CCTV 이름, 위치, 스트리밍 주소 및 사용 상태 |
| 위험구역 | CCTV별 위험구역 좌표 |
| 감지 로그 | 작업자 수와 PPE 착용 분석 결과 |
| 이벤트 로그 | 위반 유형, 위험도와 이벤트 처리 상태 |
| 캡처 이미지 | 위험 이벤트 발생 당시 이미지 경로 |

---

## 11. 주요 화면

### 대시보드

- 전체 안전 상태
- 오늘의 위험 이벤트 수
- PPE 착용률
- CCTV 연결 상태
- 최근 이벤트 목록

### 실시간 모니터링

- CCTV 선택
- 실시간 영상 확인
- 작업자 및 PPE 감지 결과
- 위험도 점수 및 등급
- PPE 위반 현황

### 이벤트 로그

- 기간별 이벤트 조회
- CCTV별 이벤트 조회
- 위반 유형 및 위험도 확인
- 캡처 이미지 확인
- 처리 상태 관리

### 통계

- 전체 감지 건수
- 위험 이벤트 발생 건수
- 평균 PPE 착용률
- 평균 위험도 점수
- 시간대별 위험 추이
- 위반 유형별 발생 비율

### 위험구역 설정

- CCTV별 위험구역 지정
- 위험구역 좌표 저장
- 위험구역 목록 조회 및 초기화

### CCTV 관리

- CCTV 등록
- CCTV 목록 조회
- CCTV 정보 수정
- CCTV 미사용 처리

---

## 12. 팀 구성

| 팀원 | 담당 역할 |
|---|---|
| 윤예나 | AI 모델 학습, 데이터셋 구축 및 PPE 분류 |
| 신채원 | 위험구역 설정, 위험도 판단 및 이벤트 캡처 |
| 이수아 | 실시간 프레임 감지, JSON 구조화 및 서비스 연동 |


---

## 13. 개발 중 해결한 문제

### 13.1 AI 감지 결과와 화면 데이터 형식 불일치

AI 모델의 원본 감지 결과는 작업자별 객체 배열 형태였지만, 화면에서는 작업자 수와 PPE 착용 상태의 집계값이 필요했습니다.

감지 결과를 순회하여 작업자 수, 안전모 착용 여부와 안전조끼 착용 여부를 별도로 집계하고 JSON 객체로 변환했습니다.

### 13.2 실시간 영상과 상태 데이터의 전달 방식 분리

영상 스트리밍은 연속된 JPG 프레임으로 전달되지만 위험도, PPE 착용 수와 위반 현황은 JSON 데이터가 필요했습니다.

영상 스트리밍과 최신 상태 조회 API를 분리하고, CCTV별 최신 감지 결과를 별도로 저장하여 화면에서 주기적으로 조회하도록 구성했습니다.

### 13.3 감지 결과와 위험도 화면 연동

AI 감지 결과는 생성되지만 실시간 모니터링 화면의 위험도 카드와 위반 현황에 즉시 반영되지 않는 문제가 있었습니다.

위험도 점수, 위험 등급, PPE 착용 수, 위반 목록과 캡처 URL을 하나의 상태 객체로 구성하고 `/api/monitoring/status` API를 통해 전달했습니다.

### 13.4 FastAPI와 Flask 역할 분리

FastAPI는 감지 및 데이터 API를 담당하고 Flask는 화면 라우팅을 담당하여, 두 서버 사이의 주소와 데이터 흐름을 일관되게 관리해야 했습니다.

API 기본 주소와 화면 요청 구조를 정리하고, Flask 화면에서 FastAPI의 JSON 응답을 받아 UI에 반영하도록 연결했습니다.

### 13.5 감지 결과 저장 흐름 확인

실시간 감지 결과, 위험도 판단, 이벤트 캡처와 DB 저장이 서로 다른 모듈에서 처리되어 데이터 누락 여부를 확인하기 어려웠습니다.

감지 결과 생성부터 위험도 계산, 캡처 이미지 경로와 이벤트 로그 저장까지의 데이터 흐름을 단계별로 확인하고 통합 테스트했습니다.

---

## 14. 프로젝트를 통해 배운 점

### AI 결과의 서비스 연동

AI 모델의 추론 결과를 화면에 표시하는 것에서 끝나지 않고 JSON 구조화, API 응답, DB 저장과 화면 상태까지 연결하는 과정을 경험했습니다.

### 실시간 데이터 처리

영상 프레임 스트리밍과 상태 JSON 조회를 분리하여 실시간 화면을 구성하는 방법을 학습했습니다.

### 역할 분리와 협업

팀원별 AI 모델, 위험 판단과 서비스 연동 모듈을 하나의 흐름으로 결합하며 인터페이스와 데이터 형식의 중요성을 배웠습니다.

### 디버깅 및 통합 테스트

각 모듈이 개별적으로 동작하더라도 전체 서비스 흐름에서 데이터가 정상적으로 전달되는지 확인해야 한다는 점을 경험했습니다.

---

## 15. 테스트 및 제한 사항

다음 기능을 로컬 영상 및 테스트 환경에서 확인했습니다.

- 영상 프레임 입력
- YOLO 기반 작업자 및 PPE 감지
- 감지 결과 시각화
- 감지 결과 JSON 구조화
- 위험도 점수 및 등급 계산
- 최신 모니터링 상태 조회
- 이벤트 로그 및 캡처 이미지 저장
- 대시보드와 통계 화면 데이터 연동

다만 다음 항목은 실제 산업 현장 환경에서 추가 검증이 필요합니다.

- 실제 CCTV 스트리밍 프로토콜 연동
- 다중 CCTV 동시 분석 성능
- 조명과 촬영 각도 변화에 따른 감지 정확도
- 작업자가 겹치는 상황의 PPE 판별 정확도
- 원거리 작업자의 PPE 분류 성능
- 장시간 실행 시 서버와 메모리 안정성
- 실제 현장 기준에 맞는 위험도 점수 조정

---

## 16. 향후 개선 방향

- 실제 RTSP CCTV 스트리밍 연동
- 다중 CCTV 동시 분석 구조 개선
- PPE 분류 모델 정확도 향상
- 다양한 산업 현장 데이터 추가 학습
- 위험도 기준 현장별 설정 기능
- 이벤트 처리 메모 및 담당자 기록 기능
- 위험 이벤트 실시간 알림
- 장시간 모니터링 성능 최적화
- 클라우드 서버 배포
- 사용자 인증 및 접근 제어 강화

---

## 17. 프로젝트 산출물

- 프로젝트 제안서
- 요구사항 정의서
- WBS
- UI 설계서
- ERD
- 테스트 내역서
- 최종 발표자료
- 시연 영상

---

## 18. 프로젝트 정보

- 프로젝트 유형: 3인 팀 프로젝트
- 진행 기간: 2026.07
- 담당 역할: 실시간 감지 및 서비스 연동
- GitHub: [github.com/sua-data](https://github.com/sua-data)
- Email: [suai8402@gmail.com](mailto:suai8402@gmail.com)
