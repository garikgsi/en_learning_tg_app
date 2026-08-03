from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
ANDROID = PROJECT / "android" / "app" / "src" / "main" / "res"
PUBLIC = PROJECT / "public"
SRC_ASSETS = PROJECT / "src" / "assets"
EXPORTS = ROOT / "exports"

SUBSTRATE = "#FFF2F8"
CONTAINER = "#4B2142"
PRIMARY = "#E85D9E"
SECONDARY = "#9B8AFB"

BASE = 1024
SS = 4


def scaled_box(values, factor):
    return tuple(round(value * factor) for value in values)


def draw_mark_layer(size, scale=1.0):
    work = size * SS
    image = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    factor = work / BASE
    inset = (1.0 - scale) * BASE / 2

    def point(x, y):
        return (round((inset + x * scale) * factor), round((inset + y * scale) * factor))

    def box(values):
        x1, y1, x2, y2 = values
        return scaled_box((inset + x1 * scale, inset + y1 * scale,
                           inset + x2 * scale, inset + y2 * scale), factor)

    draw.rounded_rectangle(box((200, 192, 824, 754)), radius=round(120 * scale * factor), fill=CONTAINER)
    draw.polygon([point(448, 754), point(512, 832), point(576, 754)], fill=CONTAINER)

    # Cut-out for the progress badge.
    draw.ellipse(box((638, 162, 854, 378)), fill=(0, 0, 0, 0))

    # Opposing arrows.
    draw.rounded_rectangle(box((378, 330, 628, 486)), radius=round(58 * scale * factor), fill=PRIMARY)
    draw.polygon([point(270, 388), point(424, 258), point(424, 518)], fill=PRIMARY)
    draw.rounded_rectangle(box((388, 490, 634, 642)), radius=round(58 * scale * factor), fill=SECONDARY)
    draw.polygon([point(742, 576), point(592, 448), point(592, 704)], fill=SECONDARY)

    # Central negative space.
    draw.rounded_rectangle(box((408, 420, 610, 554)), radius=round(48 * scale * factor), fill=(0, 0, 0, 0))

    # Progress badge and arrow.
    draw.ellipse(box((674, 198, 818, 342)), fill=SECONDARY)
    stroke = round(28 * scale * factor)
    draw.line([point(713, 303), point(780, 236)], fill=SUBSTRATE, width=stroke)
    draw.line([point(735, 236), point(780, 236), point(780, 281)], fill=SUBSTRATE, width=stroke, joint="curve")

    return image.resize((size, size), Image.Resampling.LANCZOS)


def draw_icon(size, round_icon=False):
    background = Image.new("RGBA", (size, size), SUBSTRATE)
    background.alpha_composite(draw_mark_layer(size))
    if not round_icon:
        return background
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(background, mask=mask)
    return result


def adaptive_foreground(size):
    return draw_mark_layer(size, scale=0.70)


def splash(width, height):
    image = Image.new("RGB", (width, height), SUBSTRATE)
    side = round(min(width, height) * 0.30)
    mark = draw_mark_layer(side, scale=0.88)
    image.paste(mark, ((width - side) // 2, (height - side) // 2), mark)
    return image


def fonts():
    return (
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
    )


def promo(width, height, logo_side, title_size, tagline_size):
    image = Image.new("RGB", (width, height), SUBSTRATE)
    draw = ImageDraw.Draw(image)
    mark = draw_icon(logo_side)
    left = round(width * 0.07)
    image.paste(mark, (left, (height - logo_side) // 2), mark)
    bold, regular = fonts()
    title = ImageFont.truetype(bold, title_size)
    tagline = ImageFont.truetype(regular, tagline_size)
    text_left = left + logo_side + round(width * 0.055)
    draw.text((text_left, height * 0.34), "English Learning", font=title, fill=CONTAINER)
    draw.text((text_left, height * 0.56), "Слова, которые остаются.", font=tagline, fill=PRIMARY)
    return image


def build_exports():
    icons = EXPORTS / "icons"
    promo_dir = EXPORTS / "promo"
    splash_dir = EXPORTS / "splash"
    for directory in (icons, promo_dir, splash_dir):
        directory.mkdir(parents=True, exist_ok=True)

    for size in (16, 24, 32, 48, 64, 96, 128, 192, 256, 512, 1024):
        draw_icon(size).save(icons / f"logo-mark-{size}.png", optimize=True)
    draw_icon(1024).convert("RGB").save(promo_dir / "play-store-icon-1024.png", optimize=True)
    draw_icon(512).save(promo_dir / "telegram-avatar-512.png", optimize=True)
    promo(1200, 630, 430, 72, 38).save(promo_dir / "open-graph-1200x630.png", optimize=True)
    promo(1024, 500, 340, 62, 32).save(promo_dir / "play-store-feature-1024x500.png", optimize=True)
    splash(2732, 2732).save(splash_dir / "splash-master-2732.png", optimize=True)


def build_web():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    SRC_ASSETS.mkdir(parents=True, exist_ok=True)
    draw_icon(512).save(SRC_ASSETS / "logo.png", optimize=True)
    draw_icon(16).save(PUBLIC / "favicon-16.png", optimize=True)
    draw_icon(32).save(PUBLIC / "favicon-32.png", optimize=True)
    draw_icon(180).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    draw_icon(192).save(PUBLIC / "icon-192.png", optimize=True)
    draw_icon(512).save(PUBLIC / "icon-512.png", optimize=True)
    draw_icon(256).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    promo(1200, 630, 430, 72, 38).save(PUBLIC / "og-image.png", optimize=True)


def build_android():
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for density, size in legacy.items():
        directory = ANDROID / f"mipmap-{density}"
        directory.mkdir(parents=True, exist_ok=True)
        draw_icon(size).save(directory / "ic_launcher.png", optimize=True)
        draw_icon(size, round_icon=True).save(directory / "ic_launcher_round.png", optimize=True)
        adaptive_foreground(foreground[density]).save(directory / "ic_launcher_foreground.png", optimize=True)

    splash_sizes = {
        "drawable": (480, 320),
        "drawable-land-mdpi": (480, 320), "drawable-land-hdpi": (720, 480),
        "drawable-land-xhdpi": (960, 640), "drawable-land-xxhdpi": (1440, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable-port-mdpi": (320, 480), "drawable-port-hdpi": (480, 720),
        "drawable-port-xhdpi": (640, 960), "drawable-port-xxhdpi": (960, 1440),
        "drawable-port-xxxhdpi": (1280, 1920),
    }
    for folder, dimensions in splash_sizes.items():
        directory = ANDROID / folder
        directory.mkdir(parents=True, exist_ok=True)
        splash(*dimensions).save(directory / "splash.png", optimize=True)


def build_qa():
    qa = ROOT / "qa"
    qa.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGB", (1320, 520), "#F6F3F7")
    draw = ImageDraw.Draw(canvas)
    bold, regular = fonts()
    title_font = ImageFont.truetype(bold, 28)
    body_font = ImageFont.truetype(regular, 20)
    masks = ("Square", "Rounded", "Circle")
    for index, label in enumerate(masks):
        icon = draw_icon(360)
        if label == "Rounded":
            mask = Image.new("L", (360, 360), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, 359, 359), radius=92, fill=255)
            clipped = Image.new("RGBA", (360, 360), (0, 0, 0, 0)); clipped.paste(icon, mask=mask); icon = clipped
        elif label == "Circle":
            icon = draw_icon(360, round_icon=True)
        x = 60 + index * 420
        canvas.paste(icon, (x, 40), icon)
        draw.text((x, 416), label, font=title_font, fill=CONTAINER)
        draw.text((x, 454), "launcher mask preview", font=body_font, fill="#625669")
    canvas.save(qa / "launcher-mask-preview.png", optimize=True)


def write_manifest():
    files = []
    for root in (EXPORTS,):
        files.extend(str(path.relative_to(ROOT)).replace("\\", "/") for path in root.rglob("*") if path.is_file())
    manifest = {
        "palette": {"substrate": SUBSTRATE, "container": CONTAINER, "primary": PRIMARY, "secondary": SECONDARY},
        "generated": sorted(files),
        "projectTargets": [
            "src/assets/logo.png", "public/favicon.ico", "public/favicon-16.png", "public/favicon-32.png",
            "public/apple-touch-icon.png", "public/icon-192.png", "public/icon-512.png", "public/og-image.png",
            "android/app/src/main/res/mipmap-*/ic_launcher*.png",
            "android/app/src/main/res/drawable*/splash.png",
        ],
    }
    (ROOT / "assets-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build_exports()
    build_web()
    build_android()
    build_qa()
    write_manifest()
    print("Approved application assets generated")
