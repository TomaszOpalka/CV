"""
Builds the small, high-contrast blueprint masks used by the intro animation (white lines on black).

The original pictures are NOT stored in the repository. Put them in a folder and run:

    python scripts/make-blueprint-masks.py <folder-with-originals>

Expected names: f1.png, engine.png, death-star.png, reactor.png, basketball.png
(the crop boxes below are for the pictures we used; adjust them for different images).
Requires Pillow (pip install pillow). Output: public/assets/blueprints/<name>.webp

Note on rights: make sure you may use the source pictures on a public website; swap in your own
artwork or licensed images if in doubt. The runtime accepts any image (it measures the distance from
the background colour), so a different picture only needs a new crop box here.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "blueprints"
LONG_SIDE = 340

# name: (crop box (left, top, right, bottom), shape of the mask, flip left-right, contrast gamma)
# Filled pictures (reactor, planet, ball) get a high gamma so only the structure stays bright,
# otherwise the digits would merge into one flat disc.
SPECS = {
    "engine": ((8, 4, 292, 204), "rect", False, 1.0),
    "f1": ((48, 132, 358, 252), "rect", True, 1.0),  # flipped so the nose points right (drives left to right)
    "reactor": ((108, 38, 406, 334), "circle", False, 1.7),
    "death-star": ((186, 148, 388, 352), "circle", False, 2.2),
    "basketball": ((205, 28, 575, 400), "circle", False, 2.4),
}


def ink_mask(img: Image.Image) -> Image.Image:
    """Distance from the background colour (the median of the border), normalised to 0..255."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    border = [rgb.getpixel((x, y)) for x in range(0, w, 3) for y in (0, h - 1)] + [
        rgb.getpixel((x, y)) for y in range(0, h, 3) for x in (0, w - 1)
    ]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
    flat = Image.new("RGB", rgb.size, bg)
    diff = ImageChops.difference(rgb, flat)
    r, g, b = diff.split()
    ink = ImageChops.lighter(ImageChops.lighter(r, g), b)
    # stretch so the strongest 1% of pixels become white, then lift mid tones a little
    hist = ink.histogram()
    total = sum(hist)
    acc, top = 0, 255
    for level in range(255, -1, -1):
        acc += hist[level]
        if acc >= total * 0.01:
            top = max(level, 1)
            break
    ink = ink.point(lambda v: min(255, int(255 * (v / top) ** 0.8)))
    return ink


def main(src_dir: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (box, shape, flip, gamma) in SPECS.items():
        path = next(src_dir.glob(f"{name}.*"), None)
        if path is None:
            print(f"skip {name}: not found in {src_dir}")
            continue
        img = Image.open(path).convert("RGB").crop(box)
        if flip:
            img = ImageOps.mirror(img)
        ink = ink_mask(img)
        # thicken hairlines so they survive the reduction to a coarse grid of digits
        ink = ink.filter(ImageFilter.MaxFilter(3))
        if gamma != 1.0:
            ink = ink.point(lambda v: int(255 * (v / 255) ** gamma))
        if shape == "circle":
            mask = Image.new("L", ink.size, 0)
            ImageDraw.Draw(mask).ellipse((1, 1, ink.size[0] - 2, ink.size[1] - 2), fill=255)
            ink = ImageChops.multiply(ink, mask)
            # a clear rim keeps the silhouette readable even where the picture itself is dark
            rim = Image.new("L", ink.size, 0)
            ImageDraw.Draw(rim).ellipse((2, 2, ink.size[0] - 3, ink.size[1] - 3), outline=235, width=max(3, ink.size[0] // 80))
            ink = ImageChops.lighter(ink, rim)
        scale = LONG_SIDE / max(ink.size)
        ink = ink.resize((round(ink.size[0] * scale), round(ink.size[1] * scale)), Image.LANCZOS)
        target = OUT / f"{name}.webp"
        ink.save(target, quality=82, method=6)
        print(f"{name}: {ink.size} -> {target} ({target.stat().st_size / 1024:.1f} kB)")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd())
