from pathlib import Path
import cv2
import shutil

# =========================
# 입력 / 출력 경로
# =========================
SRC_DATASET = Path("ppe_dataset")

HELMET_DST = Path("helmet_cls")
VEST_DST = Path("vest_cls")

SPLITS = ["train", "valid", "test"]
IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".bmp"]

# ppe_dataset class id
NO_HELMET = 0
HELMET = 1
NO_VEST = 2
VEST = 3
PERSON = 4

CLASS_MAP = {
    NO_HELMET: ("helmet", "no_helmet"), # no_helmet일 경우 helmet 폴더의 no_helmet에 저장
    HELMET: ("helmet", "helmet"), # helmet일 경우 helmet 폴더의 helmet에 저장
    NO_VEST: ("vest", "no_safety_vest"), # no_vest일 경우 vest 폴더의 no_vest에 저장
    VEST: ("vest", "safety_vest"), # vest일 경우 vest 폴더의 vest에 저장
}

PADDING_RATIO = 0.15
MIN_CROP_SIZE = 20


def find_image(image_dir: Path, stem: str):
    for ext in IMAGE_EXTS:
        p = image_dir / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def yolo_to_xyxy(line, img_w, img_h):
    parts = line.strip().split()
    if len(parts) != 5:
        return None

    cls_id = int(float(parts[0]))
    x, y, w, h = map(float, parts[1:])

    x1 = (x - w / 2) * img_w
    y1 = (y - h / 2) * img_h
    x2 = (x + w / 2) * img_w
    y2 = (y + h / 2) * img_h

    return cls_id, x1, y1, x2, y2


# 기존 박스를 패딩값으로 키우기
def add_padding(x1, y1, x2, y2, img_w, img_h):
    bw = x2 - x1 # 기존 박스 폭
    bh = y2 - y1 # 기존 박스 높이

    # 폭과 높이의 PADDING_RATIO(0.15)를 패딩값으로 지정
    pad_x = bw * PADDING_RATIO
    pad_y = bh * PADDING_RATIO

    # 지정된 패딩값만큼 박스 크기 키우기
    x1 = max(0, int(x1 - pad_x))
    y1 = max(0, int(y1 - pad_y))
    x2 = min(img_w, int(x2 + pad_x))
    y2 = min(img_h, int(y2 + pad_y))

    return x1, y1, x2, y2


def prepare_dirs():
    for dst in [HELMET_DST, VEST_DST]:
        if dst.exists():
            shutil.rmtree(dst)

    split_map = {
        "train": "train",
        "valid": "val",
        "test": "test",
    }

    for src_split in SPLITS:
        dst_split = split_map[src_split]

        for name in ["no_helmet", "helmet"]:
            (HELMET_DST / dst_split / name).mkdir(parents=True, exist_ok=True)

        for name in ["no_safety_vest", "safety_vest"]:
            (VEST_DST / dst_split / name).mkdir(parents=True, exist_ok=True)


def main():
    prepare_dirs()

    split_map = {
        "train": "train",
        "valid": "val",
        "test": "test",
    }

    saved = {
        "no_helmet": 0,
        "helmet": 0,
        "no_safety_vest": 0,
        "safety_vest": 0,
    }

    for src_split in SPLITS:
        dst_split = split_map[src_split]

        image_dir = SRC_DATASET / src_split / "images"
        label_dir = SRC_DATASET / src_split / "labels"

        if not image_dir.exists() or not label_dir.exists():
            print(f"[SKIP] {src_split} 폴더 없음")
            continue

        for label_path in label_dir.glob("*.txt"):
            image_path = find_image(image_dir, label_path.stem)
            if image_path is None:
                continue

            img = cv2.imread(str(image_path))
            if img is None:
                continue

            img_h, img_w = img.shape[:2]

            with open(label_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            for idx, line in enumerate(lines):
                result = yolo_to_xyxy(line, img_w, img_h)
                if result is None:
                    continue

                cls_id, x1, y1, x2, y2 = result # 라벨 한줄을 읽어 저장

                if cls_id not in CLASS_MAP:
                    continue

                dataset_type, class_name = CLASS_MAP[cls_id] # 최종 저장 위치 확인

                # add_padding으로 크롭할 범위 조정
                x1, y1, x2, y2 = add_padding(x1, y1, x2, y2, img_w, img_h) 

                crop = img[y1:y2, x1:x2] # 이미지를 범위에 따라 크롭

                if crop.size == 0:
                    continue

                ch, cw = crop.shape[:2]
                if ch < MIN_CROP_SIZE or cw < MIN_CROP_SIZE:
                    continue

                save_name = f"{label_path.stem}_{idx}.jpg" # 이미지 이름 생성

                if dataset_type == "helmet": # 저장 위치에 따라 크롭한 이미지 저장
                    save_path = HELMET_DST / dst_split / class_name / save_name
                else:
                    save_path = VEST_DST / dst_split / class_name / save_name

                cv2.imwrite(str(save_path), crop)
                saved[class_name] += 1

    print("\n=== Crop 완료 ===")
    print(f"helmet_cls/no_helmet       : {saved['no_helmet']}")
    print(f"helmet_cls/helmet          : {saved['helmet']}")
    print(f"vest_cls/no_safety_vest    : {saved['no_safety_vest']}")
    print(f"vest_cls/safety_vest       : {saved['safety_vest']}")


if __name__ == "__main__":
    main()