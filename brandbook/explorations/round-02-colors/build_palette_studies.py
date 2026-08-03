from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "selected-logo-reference.png"

PALETTES = [
    ("01-user-sky", "User Sky", ["#DBDCFF", "#61B3FF", "#9EB0FF", "#FFDBF8"]),
    ("02-twilight-mint", "Twilight Mint", ["#F4F1FA", "#312E5A", "#7C6CF2", "#63D3B1"]),
    ("03-berry-cloud", "Berry Cloud", ["#FFF2F8", "#4B2142", "#E85D9E", "#9B8AFB"]),
    ("04-ocean-rose", "Ocean Rose", ["#F1F7F8", "#20475E", "#4BA3C7", "#F09AB9"]),
    ("05-graphite-coral", "Graphite Coral", ["#FFF4EF", "#2F2938", "#FF6B6B", "#8FC9B5"]),
    ("06-soft-violet", "Soft Violet", ["#F7F4FF", "#4A3F6B", "#8D7CE5", "#F0B6D8"]),
]

SOURCE_PROTOTYPES = np.array([
    [253, 251, 246],  # substrate and negative space
    [80, 28, 74],     # speech container
    [253, 97, 95],    # upper arrow and badge
    [113, 200, 177],  # lower arrow
], dtype=np.float32)


def rgb(value):
    value = value.lstrip("#")
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def recolor(source, colors):
    pixels = np.asarray(source.convert("RGB"), dtype=np.float32)
    distances = ((pixels[:, :, None, :] - SOURCE_PROTOTYPES[None, None, :, :]) ** 2).sum(axis=3)
    roles = distances.argmin(axis=2)
    targets = np.stack([rgb(value) for value in colors])

    # Preserve only a small amount of source luminance variation so the selected
    # geometry remains recognizable without changing the declared base colors.
    source_luma = (pixels * np.array([0.2126, 0.7152, 0.0722])).sum(axis=2)
    prototype_luma = (SOURCE_PROTOTYPES * np.array([0.2126, 0.7152, 0.0722])).sum(axis=1)
    delta = np.clip((source_luma - prototype_luma[roles]) / 255.0, -0.06, 0.06)
    result = targets[roles] + delta[:, :, None] * 150

    # Badge uses the lower-arrow color, leaving three logo colors total.
    height, width = roles.shape
    yy, xx = np.mgrid[:height, :width]
    badge = (roles == 2) & (xx > width * 0.61) & (yy < height * 0.42)
    result[badge] = targets[3] + delta[badge, None] * 150

    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), "RGB")


def build_contact_sheet(items):
    width, height = 1920, 1380
    cell_w, cell_h = 640, 690
    sheet = Image.new("RGB", (width, height), "#F6F3F7")
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 30)
    body_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
    number_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 32)

    for index, (image, name, colors) in enumerate(items):
        col, row = index % 3, index // 3
        left, top = col * cell_w, row * cell_h
        preview = image.copy()
        preview.thumbnail((570, 520), Image.Resampling.LANCZOS)
        sheet.paste(preview, (left + (cell_w - preview.width) // 2, top + 18))
        draw.rounded_rectangle((left + 26, top + 26, left + 112, top + 84), 18, fill="#2B1F32")
        draw.text((left + 43, top + 34), f"{index + 1:02d}", font=number_font, fill="#FFFFFF")
        draw.text((left + 36, top + 548), name, font=title_font, fill="#2B1F32")

        swatch_y = top + 598
        for swatch_index, color in enumerate(colors):
            x = left + 36 + swatch_index * 142
            draw.rounded_rectangle((x, swatch_y, x + 126, swatch_y + 36), 10, fill=color)
            draw.text((x, swatch_y + 42), color.upper(), font=body_font, fill="#554B59")

    sheet.save(ROOT / "contact-sheet.png", optimize=True)


def main():
    source = Image.open(SOURCE)
    items = []
    for slug, name, colors in PALETTES:
        image = recolor(source, colors)
        image.save(ROOT / f"palette-{slug}.png", optimize=True)
        items.append((image, name, colors))
    build_contact_sheet(items)


if __name__ == "__main__":
    main()
