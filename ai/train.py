from ultralytics import YOLO
import os

# =========================
# 경로 설정
# =========================

# data.yaml 경로
DATA_YAML = "dataset/ppe_dataset/data.yaml"

# 사용할 기본 모델
BASE_MODEL = "yolov8m.pt"

# 학습 결과 저장 위치
PROJECT_DIR = "runs"
RUN_NAME = "ppe_train"

# =========================
# 학습 실행
# =========================

def main():
    if not os.path.exists(DATA_YAML):
        raise FileNotFoundError(f"data.yaml을 찾을 수 없습니다: {DATA_YAML}")

    model = YOLO(BASE_MODEL)

    model.train(
        data=DATA_YAML,
        epochs=100,
        batch=16,
        imgsz=640,
        patience=20,
        project=PROJECT_DIR,
        name=RUN_NAME,
        exist_ok=True,
        save=True,
        save_period=5,
        device=0  # GPU 사용. CPU면 "cpu"
    )

if __name__ == "__main__":
    main()