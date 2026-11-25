"""Generate the equirectangular Earth land mask for the digital marketing globe.

Data: Natural Earth 1:110m land polygons (public domain).
Output: 1024x512 grayscale PNG, land = 255, ocean = 0.
"""

import json
import os
import urllib.request

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_110m_land.geojson"
)
SOURCE_CACHE = r"C:\Users\ACTIVE\AppData\Local\Temp\ne_110m_land.geojson"
OUTPUT = os.path.join(
    ROOT, "public", "assets", "digital-marketing", "globe", "earth-land-mask-1024x512.png"
)
REPORT = os.path.join(
    ROOT, "public", "assets", "digital-marketing", "globe", "land-mask-report.json"
)
PREVIEW = os.path.join(ROOT, "design-archive", "digital-marketing-mask-preview.txt")
WIDTH, HEIGHT = 1024, 512
SCALE = 4


def load_geojson():
    if os.path.exists(SOURCE_CACHE):
        with open(SOURCE_CACHE, encoding="utf-8") as handle:
            return json.load(handle), "local cache"
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
        data = json.load(response)
    with open(SOURCE_CACHE, "w", encoding="utf-8") as handle:
        json.dump(data, handle)
    return data, SOURCE_URL


def unwrap_ring(ring):
    """Keep ring longitudes continuous so dateline-crossing shapes stay intact."""
    unwrapped = [ring[0][0]]
    for previous, current in zip(ring, ring[1:]):
        delta = current[0] - previous[0]
        while delta > 180:
            delta -= 360
        while delta < -180:
            delta += 360
        unwrapped.append(unwrapped[-1] + delta)
    return unwrapped, [point[1] for point in ring]


def to_pixels(longitudes, latitudes, width, height, x_offset):
    return [
        (
            x_offset + (lon + 180) / 360 * width,
            (90 - lat) / 180 * height,
        )
        for lon, lat in zip(longitudes, latitudes)
    ]


def main():
    data, source_used = load_geojson()
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    big_width, big_height = WIDTH * SCALE, HEIGHT * SCALE
    # A three-map-wide canvas lets dateline shapes wrap without a seam.
    canvas = Image.new("L", (big_width * 3, big_height), 0)
    draw = ImageDraw.Draw(canvas)

    for feature in data["features"]:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        for polygon in polygons:
            for ring_index, ring in enumerate(polygon):
                longitudes, latitudes = unwrap_ring(ring)
                fill = 255 if ring_index == 0 else 0
                for shift in (-big_width, 0, big_width):
                    points = to_pixels(longitudes, latitudes, big_width, big_height, shift)
                    draw.polygon(points, fill=fill)

    high_res = canvas.crop((big_width, 0, big_width * 2, big_height))
    softened = high_res.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    mask = softened.point(lambda value: 255 if value >= 128 else 0)
    mask.save(OUTPUT, optimize=True)

    histogram = mask.histogram()
    land_pixels = histogram[255]
    report = {
        "output": os.path.relpath(OUTPUT, ROOT).replace("\\", "/"),
        "size": [WIDTH, HEIGHT],
        "projection": "equirectangular WGS84",
        "land_value": 255,
        "ocean_value": 0,
        "source": SOURCE_URL,
        "source_used": source_used,
        "source_license": "Natural Earth data is public domain.",
        "source_scale": "1:110m",
        "features": len(data["features"]),
        "land_pixels": land_pixels,
        "land_percent": round(land_pixels / (WIDTH * HEIGHT) * 100, 2),
        "bytes": os.path.getsize(OUTPUT),
    }
    with open(REPORT, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    preview = []
    for row in range(24):
        line = ""
        for column in range(64):
            left = column * WIDTH // 64
            right = (column + 1) * WIDTH // 64
            top = row * HEIGHT // 24
            bottom = (row + 1) * HEIGHT // 24
            crop = mask.crop((left, top, right, bottom))
            mean = sum(index * count for index, count in enumerate(crop.histogram())) / crop.width / crop.height
            line += "#" if mean > 165 else "+" if mean > 70 else "."
        preview.append(line)
    with open(PREVIEW, "w", encoding="utf-8") as handle:
        handle.write("\n".join(preview) + "\n")
    print(json.dumps(report, indent=2))
    print("\n".join(preview))


if __name__ == "__main__":
    main()
