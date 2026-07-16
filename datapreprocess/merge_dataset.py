from pathlib import Path
import shutil


SOURCE_DATASETS = [
    "helmet_dataset",
    "vest_dataset",
    "person_dataset",
]

SPLITS = ["train", "valid", "test"]

OUTPUT_DATASET = "ppe_dataset"

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]


def make_dirs():
    for split in SPLITS:
        Path(OUTPUT_DATASET, split, "images").mkdir(parents=True, exist_ok=True)
        Path(OUTPUT_DATASET, split, "labels").mkdir(parents=True, exist_ok=True)


def copy_dataset(dataset_name):
    dataset_path = Path(dataset_name)

    if not dataset_path.exists():
        print(f"[SKIP] {dataset_name} 폴더가 없습니다.")
        return

    for split in SPLITS:
        image_dir = dataset_path / split / "images"
        label_dir = dataset_path / split / "labels"

        if not image_dir.exists():
            print(f"[SKIP] {image_dir} 없음")
            continue

        for image_path in image_dir.iterdir():
            if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            new_name = f"{dataset_name}_{image_path.name}"

            output_image_path = Path(OUTPUT_DATASET, split, "images", new_name)
            output_label_path = Path(OUTPUT_DATASET, split, "labels", f"{Path(new_name).stem}.txt")

            shutil.copy2(image_path, output_image_path)

            label_path = label_dir / f"{image_path.stem}.txt"

            if label_path.exists():
                shutil.copy2(label_path, output_label_path)
            else:
                output_label_path.write_text("", encoding="utf-8")


def create_yaml():
    yaml_text = """train: train/images
val: valid/images
test: test/images

nc: 5

names:
  0: no_helmet
  1: helmet
  2: no_safety_vest
  3: safety_vest
  4: person
"""

    Path(OUTPUT_DATASET, "data.yaml").write_text(yaml_text, encoding="utf-8")


def main():
    output_path = Path(OUTPUT_DATASET)

    if output_path.exists():
        shutil.rmtree(output_path)

    make_dirs()

    for dataset_name in SOURCE_DATASETS:
        copy_dataset(dataset_name)

    create_yaml()

    print("\n=== 데이터셋 병합 완료 ===")
    print(f"출력 폴더: {OUTPUT_DATASET}")


if __name__ == "__main__":
    main()