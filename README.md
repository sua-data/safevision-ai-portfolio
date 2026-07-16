# SafeVision AI

## 1. 프로젝트 개요

SafeVision AI는 산업 현장의 CCTV 영상을 기반으로 작업자의 안전모, 안전조끼 착용 여부와 위험구역 진입 여부를 실시간으로 감지하는 AI 안전 모니터링 시스템입니다.

작업자의 PPE 미착용 또는 위험구역 진입 상황을 감지하면 위험도 점수를 계산하고, 위험 수준에 따라 이벤트 로그와 캡처 이미지를 저장합니다. 관리자는 대시보드, 실시간 모니터링, 이벤트 로그, 통계 화면을 통해 현장 안전 상태를 확인할 수 있습니다.

## 2. 프로젝트 목적

산업 현장에서는 안전장비 미착용, 위험구역 접근 등으로 인한 사고 위험이 지속적으로 발생합니다.
본 프로젝트는 CCTV 영상과 AI 객체 감지 기술을 활용하여 관리자가 위험 상황을 빠르게 인지하고 대응할 수 있도록 지원하는 것을 목표로 합니다.

주요 목표는 다음과 같습니다.

* CCTV 영상 기반 작업자 실시간 감지
* 안전모 및 안전조끼 착용 여부 판단
* CCTV별 위험구역 설정 및 진입 여부 판정
* 위험도 점수 및 위험 등급 산정
* 위험 상황 발생 시 캡처 이미지 및 이벤트 로그 저장
* 대시보드와 통계 화면을 통한 안전 현황 시각화

## 3. 주요 기능

### 3.1 실시간 모니터링

* CCTV 또는 웹캠 영상 스트리밍
* 작업자 감지
* 안전모 착용 여부 감지
* 안전조끼 착용 여부 감지
* 위험구역 진입 여부 확인
* 현재 위험도, 위험 점수, 위반 유형 표시

### 3.2 위험구역 설정

* CCTV별 위험구역 설정
* 화면에서 마우스 드래그를 통한 좌표 지정
* 위험구역 좌표 DB 저장
* 감지된 작업자의 중심점 기준 위험구역 진입 판정

### 3.3 위험도 판단

* PPE 미착용 여부 판단
* 위험구역 진입 여부 판단
* 위험도 점수 계산
* SAFE, WARNING, DANGER, CRITICAL 등급 구분
* 위험도 결과를 실시간 모니터링 화면에 표시

### 3.4 이벤트 로그

* 위험 이벤트 발생 시 로그 저장
* 위반 유형, 위험도, 위험 점수, 발생 시간, CCTV 정보 저장
* 캡처 이미지 저장 및 이벤트와 연결
* 기간별, CCTV별 이벤트 조회

### 3.5 대시보드

* 전체 안전 상태 요약
* 오늘 발생한 경고 이벤트 수 표시
* PPE 착용률 표시
* CCTV 연결 상태 표시
* 최근 이벤트 목록 표시

### 3.6 통계 분석

* 기간별 감지 건수 조회
* 전체 경고 건수 조회
* 평균 PPE 착용률 조회
* 평균 위험도 점수 조회
* 시간대별 경고 발생 추이 표시
* 위반 유형별 발생 비율 표시

### 3.7 CCTV 관리

* CCTV 등록
* CCTV 목록 조회
* CCTV 정보 수정
* CCTV 미사용 처리
* CCTV별 스트리밍 주소 및 설치 위치 관리

## 4. 시스템 구조

SafeVision AI는 AI 감지 모듈, Backend API, 화면 라우팅 서버, 데이터베이스, Frontend 화면으로 구성됩니다.

```text
CCTV / Webcam
      ↓
AI Detection Module
      ↓
FastAPI Server
      ↓
MariaDB
      ↓
Flask Web Server
      ↓
Frontend Dashboard
```

### 4.1 AI Detection Module

* YOLO 기반 작업자 감지
* Pose 기반 신체 영역 추출
* 머리 영역 crop 후 안전모 착용 여부 분류
* 상체 영역 crop 후 안전조끼 착용 여부 분류
* 감지 결과를 JSON 형태로 정리
* 위험도 판단 로직과 연동

### 4.2 FastAPI Server

* 영상 스트리밍 API 제공
* CCTV 관리 API 제공
* 위험구역 저장 및 조회 API 제공
* 이벤트 로그 조회 API 제공
* 대시보드 데이터 API 제공
* 통계 데이터 API 제공

### 4.3 Flask Server

* 사용자 화면 라우팅
* 로그인, 대시보드, 모니터링, 이벤트 로그, 통계, 위험구역, CCTV 관리 화면 제공
* Frontend 요청을 FastAPI 서버로 중계

### 4.4 Database

* CCTV 정보 저장
* 위험구역 좌표 저장
* 감지 분석 결과 저장
* 위험 이벤트 로그 저장
* 캡처 이미지 경로 저장

## 5. 기술 스택

### AI / Computer Vision

* Python
* OpenCV
* Ultralytics YOLO
* YOLO Pose
* YOLO Classification

### Backend

* FastAPI
* Flask
* SQLAlchemy
* MariaDB
* Uvicorn

### Frontend

* HTML
* CSS
* JavaScript
* Chart.js

### Collaboration / Tools

* Git
* GitHub
* VS Code
* Figma
* Google Docs / Sheets / Slides

## 6. 주요 화면

### 로그인

* 관리자 로그인 화면
* 아이디 및 비밀번호 입력
* 로그인 성공 시 대시보드 이동

### 대시보드

* 전체 안전 상태 확인
* 오늘 경고 수 확인
* PPE 착용률 확인
* CCTV 연결 상태 확인
* 최근 이벤트 확인

### 실시간 모니터링

* CCTV 선택
* 실시간 영상 확인
* AI 감지 결과 확인
* 현재 위험도 및 위험 점수 확인
* 위반 현황 확인

### 이벤트 로그

* 기간별 이벤트 조회
* CCTV별 이벤트 조회
* 위반 유형, 위험도, 처리 상태 확인
* 캡처 이미지 확인

### 통계 대시보드

* 전체 감지 건수 확인
* 전체 경고 건수 확인
* PPE 착용률 확인
* 위험도 점수 확인
* 시간대별 경고 추이 확인
* 위반 유형별 비율 확인

### 위험구역 설정

* CCTV별 위험구역 설정
* 위험구역 좌표 저장
* 위험구역 진입 판정 기준 관리

### CCTV 관리

* CCTV 등록
* CCTV 목록 조회
* CCTV 정보 수정
* CCTV 미사용 처리

## 7. 프로젝트 폴더 구조

```text
SafeVision-AI/
│
├── ai/
│   ├── detect.py
│   ├── modelcombined.py
│   ├── risk.py
│   ├── capture.py
│   └── models/
│
├── backend/
│   ├── fastapi_app.py
│   ├── flask_app.py
│   ├── event_log/
│   │   └── getEventLogs.py
│   └── util/
│       └── db.py
│
├── templates/
│   ├── login.html
│   ├── dashboard.html
│   ├── monitoring.html
│   ├── event-log.html
│   ├── statistics.html
│   ├── danger-zone.html
│   ├── danger-zone-manage.html
│   ├── cctv-manage.html
│   └── sidebar.html
│
├── static/
│   ├── css/
│   ├── js/
│   └── captures/
│
├── docs/
│   ├── 요구사항정의서
│   ├── UI설계서
│   ├── WBS
│   ├── ERD
│   └── 테스트내역서
│
├── requirements.txt
└── README.md
```

## 8. 실행 방법

### 8.1 가상환경 생성 및 활성화

```bash
python -m venv .venv
```

Windows PowerShell 기준:

```bash
.venv\Scripts\activate
```

### 8.2 패키지 설치

```bash
pip install -r requirements.txt
```

### 8.3 FastAPI 서버 실행

```bash
python -m uvicorn backend.fastapi_app:app --reload --port 8000
```

### 8.4 Flask 서버 실행

```bash
python backend/flask_app.py
```

### 8.5 접속 주소

```text
http://127.0.0.1:5000
```

## 9. 주요 API

### CCTV 관리

| Method | URL                   | 설명          |
| ------ | --------------------- | ----------- |
| GET    | `/api/cctv`           | CCTV 목록 조회  |
| POST   | `/api/cctv`           | CCTV 등록     |
| PUT    | `/api/cctv/{cctv_id}` | CCTV 정보 수정  |
| DELETE | `/api/cctv/{cctv_id}` | CCTV 미사용 처리 |

### 실시간 모니터링

| Method | URL                         | 설명                   |
| ------ | --------------------------- | -------------------- |
| GET    | `/api/video-feed/{cctv_id}` | CCTV 영상 스트리밍         |
| GET    | `/api/monitoring/status`    | 선택 CCTV의 최신 감지 상태 조회 |

### 이벤트 로그

| Method | URL           | 설명        |
| ------ | ------------- | --------- |
| GET    | `/api/events` | 이벤트 로그 조회 |

### 대시보드 / 통계

| Method | URL               | 설명             |
| ------ | ----------------- | -------------- |
| GET    | `/api/dashboard`  | 대시보드 요약 데이터 조회 |
| GET    | `/api/statistics` | 통계 데이터 조회      |

### 위험구역

| Method | URL                          | 설명            |
| ------ | ---------------------------- | ------------- |
| GET    | `/api/danger-zone`           | 위험구역 목록 조회    |
| GET    | `/api/danger-zone/{cctv_id}` | CCTV별 위험구역 조회 |
| POST   | `/api/danger-zone`           | 위험구역 저장       |
| DELETE | `/api/danger-zone/zone/{zone_id}` | 위험구역 초기화      |

## 10. 위험도 기준

위험도는 PPE 미착용 여부와 위험구역 진입 여부를 기준으로 산정합니다.

| 위험 등급    | 의미    | 처리                        |
| -------- | ----- | ------------------------- |
| SAFE     | 정상 상태 | 로그 저장 없음 또는 일반 감지 로그 저장   |
| WARNING  | 주의 필요 | 감지 로그 저장                  |
| DANGER   | 위험 상황 | 이벤트 로그 및 캡처 이미지 저장        |
| CRITICAL | 매우 위험 | 이벤트 로그 및 캡처 이미지 저장, 화면 강조 |

## 11. DB 저장 데이터

### detection_log

일반 감지 분석 결과를 저장합니다.

* CCTV ID
* 작업자 수
* 안전모 착용 수
* 안전모 미착용 수
* 안전조끼 착용 수
* 안전조끼 미착용 수
* PPE 착용률
* 감지 시간

### event_log

위험 이벤트 발생 시 저장합니다.

* CCTV ID
* 위반 유형
* 위험도 점수
* 위험 등급
* 안전모 상태
* 안전조끼 상태
* 캡처 이미지 경로
* 처리 상태
* 발생 시간

### capture_image

이벤트 발생 당시 저장된 캡처 이미지 정보를 관리합니다.

* 이벤트 ID
* CCTV ID
* 파일명
* 파일 경로
* 저장 시간

### danger_zone

CCTV별 위험구역 정보를 저장합니다.

* CCTV ID
* 위험구역명
* 좌표값 X1, Y1, X2, Y2
* 사용 여부

## 12. 팀 역할

| 담당            | 주요 업무                                                     |
| ------------- | --------------------------------------------------------- |
| 데이터셋 / 학습     | PPE 데이터셋 수집, 클래스 정의, 라벨링 품질 확인, YOLO 학습, best.pt 선정       |
| 실시간 감지        | YOLO 모델 로드, 영상 입력 처리, 프레임 단위 추론, 감지 결과 JSON 구조화           |
| 위험 판단         | PPE 미착용 판단, 위험구역 좌표 기준 판정, 위험도 점수 계산, 캡처 트리거 조건 작성        |
| Backend / DB  | FastAPI API 구현, Flask 라우팅, MariaDB 연동, 이벤트 로그 및 통계 데이터 처리 |
| Frontend / UI | 대시보드, 모니터링, 이벤트 로그, 통계, 위험구역, CCTV 관리 화면 구현               |
| 문서 / 발표       | 요구사항정의서, UI설계서, WBS, 테스트내역서, 발표자료 정리                      |

※ 본 프로젝트는 AI 모델 학습·감지·위험 판단 영역은 팀원별 역할을 나누어 진행하였고, Backend / DB / Frontend 구현은 기능 단위로 팀원들이 공동 개발하였습니다.

## 13. 프로젝트 산출물

* 프로젝트 제안서
* 요구사항 정의서
* WBS
* UI 설계서
* ERD
* 테스트 내역서
* 발표 PPT
* 시연 영상
* README.md

## 14. 기대 효과

* 작업자의 PPE 미착용 상황을 빠르게 확인할 수 있음
* 위험구역 진입 상황을 실시간으로 감지할 수 있음
* 위험 상황 발생 시 캡처 이미지와 로그를 남겨 사후 확인 가능
* 대시보드와 통계를 통해 현장 안전 상태를 정량적으로 관리 가능
* 관리자의 수동 모니터링 부담을 줄이고 사고 예방에 활용 가능

## 15. 향후 개선 방향

* 실제 CCTV 스트리밍 환경 연동
* 다중 CCTV 동시 분석 성능 개선
* 위험도 기준 세분화
* 이벤트 처리 상태 및 메모 기능 고도화
* 알림 기능 추가
* 모델 정확도 개선을 위한 데이터셋 추가 학습
* 클라우드 서버 배포 및 원격 접속 지원