from pathlib import Path


DATASET_PATH = Path("ppe_dataset")
SPLITS = ["train", "valid", "test"]
IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]


def check_split(split):
    image_dir = DATASET_PATH / split / "images"
    label_dir = DATASET_PATH / split / "labels"

    print(f"\n[{split}] 검사 시작")

    image_files = [
        p for p in image_dir.iterdir()
        if p.suffix.lower() in IMAGE_EXTENSIONS
    ]

    label_files = [
        p for p in label_dir.iterdir()
        if p.suffix.lower() == ".txt"
    ]

    image_stems = {p.stem for p in image_files}
    label_stems = {p.stem for p in label_files}

    missing_labels = image_stems - label_stems
    missing_images = label_stems - image_stems

    print(f"이미지 수: {len(image_files)}")
    print(f"라벨 수: {len(label_files)}")

    if missing_labels:
        print(f"[문제] 라벨이 없는 이미지: {len(missing_labels)}개")
        for name in list(missing_labels)[:20]:
            print(f"  - {name}")
    else:
        print("[OK] 모든 이미지에 라벨 파일 있음")

    if missing_images:
        print(f"[문제] 이미지가 없는 라벨: {len(missing_images)}개")
        for name in list(missing_images)[:20]:
            print(f"  - {name}")
    else:
        print("[OK] 모든 라벨에 이미지 파일 있음")

    return len(missing_labels), len(missing_images)


def check_label_format():
    print("\n[라벨 형식 검사 시작]")

    invalid_count = 0
    class_count = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}

    for split in SPLITS:
        label_dir = DATASET_PATH / split / "labels"

        for txt_path in label_dir.glob("*.txt"):
            with open(txt_path, "r", encoding="utf-8") as f:
                for line_num, line in enumerate(f, start=1):
                    line = line.strip()

                    if not line:
                        continue

                    parts = line.split()

                    if len(parts) != 5:
                        print(f"[형식 오류] {txt_path} / {line_num}줄 / {line}")
                        invalid_count += 1
                        continue

                    try:
                        class_id = int(parts[0])
                        x, y, w, h = map(float, parts[1:])
                    except ValueError:
                        print(f"[숫자 오류] {txt_path} / {line_num}줄 / {line}")
                        invalid_count += 1
                        continue

                    if class_id not in class_count:
                        print(f"[클래스 오류] {txt_path} / {line_num}줄 / class={class_id}")
                        invalid_count += 1
                        continue

                    if not all(0 <= v <= 1 for v in [x, y, w, h]):
                        print(f"[좌표 오류] {txt_path} / {line_num}줄 / {line}")
                        invalid_count += 1
                        continue

                    class_count[class_id] += 1

    print("\n[클래스별 라벨 수]")
    print(f"0 no_helmet       : {class_count[0]}")
    print(f"1 helmet          : {class_count[1]}")
    print(f"2 no_safety_vest  : {class_count[2]}")
    print(f"3 safety_vest     : {class_count[3]}")
    print(f"4 person          : {class_count[4]}")

    if invalid_count == 0:
        print("\n[OK] 라벨 형식 문제 없음")
    else:
        print(f"\n[문제] 라벨 형식 오류 {invalid_count}개 발견")

    return invalid_count


def main():
    total_missing_labels = 0
    total_missing_images = 0

    for split in SPLITS:
        missing_labels, missing_images = check_split(split)
        total_missing_labels += missing_labels
        total_missing_images += missing_images

    invalid_count = check_label_format()

    print("\n=== 최종 검사 결과 ===")

    if total_missing_labels == 0 and total_missing_images == 0 and invalid_count == 0:
        print("정상: 이미지와 라벨이 모두 일치하고, 라벨 형식도 정상입니다.")
    else:
        print("문제 있음:")
        print(f"- 라벨 없는 이미지: {total_missing_labels}개")
        print(f"- 이미지 없는 라벨: {total_missing_images}개")
        print(f"- 라벨 형식 오류: {invalid_count}개")


if __name__ == "__main__":
    main()