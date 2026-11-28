"""Prepare replaceable WebP stand-in textures for the seven floating 3D screens.

Only existing project imagery is used. Source aspect ratios are preserved: photographic
plates are resized uniformly; alpha artwork is fitted uniformly onto a plain canvas.
No burgundy tint, frame, glow or lighting is added to the textures.
"""

import json
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREEN_DIR = os.path.join(ROOT, "public", "assets", "digital-marketing", "screens")
ARCHIVE_DIR = os.path.join(ROOT, "design-archive")
MASK_PATH = os.path.join(ROOT, "public", "assets", "digital-marketing", "globe", "earth-land-mask-1024x512.png")

ONYX = (10, 10, 10)
ALABASTER = (229, 228, 226)
BLUE_SLATE = (83, 104, 120)
CANVAS_SIZE = (1600, 900)

SOURCES = [
    {
        "filename": "screen-01-camera-side.webp",
        "source": "models/avaris-side.jpg",
        "method": "resize",
        "note": "Camera plate, original aspect ratio retained.",
    },
    {
        "filename": "screen-02-camera-three-quarter.webp",
        "source": "models/avaris-three-quarter.jpg",
        "method": "resize",
        "note": "Camera plate, original aspect ratio retained.",
    },
    {
        "filename": "screen-03-studio-background.webp",
        "source": "public/assets/studio-background.webp",
        "method": "resize",
        "note": "Wide studio plate, original aspect ratio retained.",
    },
    {
        "filename": "screen-05-camera-cutout-onyx.webp",
        "source": "design-archive/camera-reference-cutout.webp",
        "method": "fit",
        "background": ONYX,
        "content_height": 780,
        "note": "Transparent camera cutout on plain onyx; no frame or glow added.",
    },
    {
        "filename": "screen-06-camera-cutout-slate.webp",
        "source": "design-archive/camera-reference-cutout.webp",
        "method": "fit",
        "background": BLUE_SLATE,
        "content_height": 780,
        "note": "Transparent camera cutout on plain blue slate; no frame or glow added.",
    },
    {
        "filename": "screen-07-mybi-logo.webp",
        "source": "public/mybi-logo.png",
        "method": "fit",
        "background": ONYX,
        "content_height": 560,
        "note": "Brand mark stand-in on plain onyx.",
    },
    {
        "filename": "screen-08-mybi-titanium.webp",
        "source": "public/mybi-titanium.png",
        "method": "fit",
        "background": ALABASTER,
        "content_height": 560,
        "note": "Titanium mark stand-in on plain alabaster.",
    },
]


def source_license(relative_path):
    if relative_path.startswith("design-archive/camera-reference-cutout"):
        return "Generated from a user-supplied reference; internal MYBI Digital project asset."
    return "Existing MYBI Digital project asset; internal reuse for this site."


def resize_plate(source_path, output_path):
    image = Image.open(source_path).convert("RGB")
    # All selected plates are already within the 1800px budget, so keep their exact
    # native pixel dimensions and aspect ratios rather than forcing a 16:9 crop.
    if max(image.size) > 1800:
        image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    image.save(output_path, "WEBP", quality=88, method=6)
    return image.size


def fit_on_canvas(source_path, output_path, background, content_height):
    source = Image.open(source_path).convert("RGBA")
    scale = content_height / source.height
    size = (round(source.width * scale), content_height)
    if size[0] > CANVAS_SIZE[0] - 80:
        scale = (CANVAS_SIZE[0] - 80) / source.width
        size = (CANVAS_SIZE[0] - 80, round(source.height * scale))

    content = source.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", CANVAS_SIZE, background)
    offset = (
        (CANVAS_SIZE[0] - content.width) // 2,
        (CANVAS_SIZE[1] - content.height) // 2,
    )
    canvas.paste(content, offset, content)
    canvas.save(output_path, "WEBP", quality=88, method=6)
    return canvas.size


def build_contact_sheet(entries):
    cell_width, cell_height = 420, 260
    columns = 3
    rows = 3
    sheet = Image.new("RGB", (cell_width * columns, cell_height * rows), (14, 14, 14))
    draw = ImageDraw.Draw(sheet)

    items = [("earth-land-mask-1024x512.png", MASK_PATH, "globe mask")]
    items.extend(
        (entry["filename"], os.path.join(ROOT, *entry["path"].split("/")), "screen")
        for entry in entries
    )

    for index, (label, path, kind) in enumerate(items):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = row * cell_height

        image = Image.open(path).convert("RGBA")
        image.thumbnail((cell_width - 20, cell_height - 40), Image.Resampling.LANCZOS)
        thumbnail = Image.new("RGBA", image.size, (26, 26, 26, 255))
        thumbnail.alpha_composite(image)
        paste_x = x + (cell_width - thumbnail.width) // 2
        paste_y = y + 28 + (cell_height - 36 - thumbnail.height) // 2
        sheet.paste(thumbnail.convert("RGB"), (paste_x, paste_y))

        draw.text((x + 10, y + 8), f"{kind}: {label}", fill=(235, 234, 232))
        draw.rectangle((x, y, x + cell_width - 1, y + cell_height - 1), outline=(72, 72, 72))

    output = os.path.join(ARCHIVE_DIR, "digital-marketing-phase-a-previews.png")
    sheet.save(output, optimize=True)
    return output


def main():
    os.makedirs(SCREEN_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    entries = []
    for spec in SOURCES:
        source_relative = spec["source"]
        source_path = os.path.join(ROOT, *source_relative.split("/"))
        output_path = os.path.join(SCREEN_DIR, spec["filename"])
        source_size = Image.open(source_path).size

        if spec["method"] == "resize":
            output_size = resize_plate(source_path, output_path)
            source_ratio = round(source_size[0] / source_size[1], 4)
            output_ratio = round(output_size[0] / output_size[1], 4)
        else:
            output_size = fit_on_canvas(
                source_path,
                output_path,
                spec["background"],
                spec["content_height"],
            )
            source_ratio = round(source_size[0] / source_size[1], 4)
            output_ratio = round(output_size[0] / output_size[1], 4)

        entries.append(
            {
                "filename": spec["filename"],
                "path": os.path.relpath(output_path, ROOT).replace("\\", "/"),
                "source": source_relative,
                "source_dimensions": list(source_size),
                "source_license": source_license(source_relative),
                "dimensions": list(output_size),
                "bytes": os.path.getsize(output_path),
                "method": spec["method"],
                "background": "#{:02X}{:02X}{:02X}".format(*spec["background"])
                if "background" in spec
                else None,
                "source_aspect_ratio": source_ratio,
                "output_aspect_ratio": output_ratio,
                "aspect_ratio_preserved": spec["method"] == "fit" or source_ratio == output_ratio,
                "note": spec["note"],
                "replaceable": True,
            }
        )

    manifest = {
        "purpose": "Temporary stand-in textures for the eight floating digital marketing screens.",
        "replacement_instruction": "Overwrite a same-named WebP with a landscape photograph; keep the filename so the scene needs no code change.",
        "processing": "WebP quality 88, method 6. No colour tint, frame, glow or lighting baked into the texture.",
        "textures": entries,
    }
    manifest_path = os.path.join(SCREEN_DIR, "screen-manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)

    preview_path = build_contact_sheet(entries)
    print(json.dumps(manifest, indent=2))
    print("PREVIEW " + os.path.relpath(preview_path, ROOT).replace("\\", "/"))


if __name__ == "__main__":
    main()
