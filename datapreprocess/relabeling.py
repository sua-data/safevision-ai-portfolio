from pathlib import Path


SPLITS = ["train", "valid", "test"]


def remap_label_ids(dataset_path, mapping):
    dataset_path = Path(dataset_path)
    total_count = 0

    for split in SPLITS:
        label_dir = dataset_path / split / "labels"

        if not label_dir.exists():
            print(f"[SKIP] 라벨 폴더 없음: {label_dir}")
            continue

        for txt_path in label_dir.glob("*.txt"):
            new_lines = []

            with open(txt_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()

                    if not line or line.startswith("#"):
                        continue

                    parts = line.split()

                    if len(parts) != 5:
                        print(f"[SKIP] YOLO Detection 형식 아님: {txt_path} / {line}")
                        continue

                    try:
                        old_id = int(parts[0])
                        x, y, w, h = map(float, parts[1:])
                    except ValueError:
                        print(f"[SKIP] 숫자 변환 실패: {txt_path} / {line}")
                        continue

                    if old_id not in mapping:
                        print(f"[SKIP] 매핑 없음: {txt_path} / class {old_id}")
                        continue

                    new_id = mapping[old_id]
                    new_lines.append(f"{new_id} {x} {y} {w} {h}")

            with open(txt_path, "w", encoding="utf-8") as f:
                f.write("\n".join(new_lines))

            total_count += 1

    print(f"[완료] {dataset_path} : {total_count}개 라벨 파일 수정")


if __name__ == "__main__":
    DATASETS = [
        {
            "path": r"C:\yolo_ppe\helmet_dataset",
            "mapping": {
                0: 0,  # no_helmet
                1: 1,  # helmet
            },
        },
        {
            "path": r"C:\yolo_ppe\vest_dataset",
            "mapping": {
                0: 2,  # no_safety_vest
                1: 3,  # safety_vest
            },
        },
    ]

    for dataset in DATASETS:
        remap_label_ids(dataset["path"], dataset["mapping"])

    print("\n=== helmet / vest 라벨 변환 완료 ===")