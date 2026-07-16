from pathlib import Path


DATASET_PATH = Path(r"C:\yolo_ppe\person_dataset")
SPLITS = ["train", "valid", "test"]


def seg_line_to_bbox(line, new_class_id=4):
    parts = line.strip().split()

    if len(parts) < 7:
        return None

    coords = list(map(float, parts[1:]))

    xs = coords[0::2]
    ys = coords[1::2]

    x_min = min(xs)
    x_max = max(xs)
    y_min = min(ys)
    y_max = max(ys)

    x_center = (x_min + x_max) / 2
    y_center = (y_min + y_max) / 2
    width = x_max - x_min
    height = y_max - y_min

    return f"{new_class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"


def convert_file(txt_path):
    new_lines = []

    with open(txt_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            bbox_line = seg_line_to_bbox(line, new_class_id=4)

            if bbox_line:
                new_lines.append(bbox_line)

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines))


def main():
    count = 0

    for split in SPLITS:
        label_dir = DATASET_PATH / split / "labels"

        if not label_dir.exists():
            continue

        for txt_path in label_dir.glob("*.txt"):
            convert_file(txt_path)
            count += 1

    print(f"완료: {count}개 person 라벨을 segmentation → bbox로 변환했습니다.")


if __name__ == "__main__":
    main()