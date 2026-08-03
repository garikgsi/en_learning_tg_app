from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "brand"
PNG = BRAND / "exports" / "png"
ANDROID = ROOT / "android" / "app" / "src" / "main" / "res"
W, H = A4

AUBERGINE = "#2B1F32"
CORAL = "#E85D75"
SAGE = "#66C7A5"
CREAM = "#FFF7ED"
MULBERRY = "#453A49"


def mark(size=1024, transparent=False):
    s = size / 1024
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else AUBERGINE)
    d = ImageDraw.Draw(image)
    b = lambda v: tuple(round(x * s) for x in v)
    if not transparent:
        d.rounded_rectangle(b((0, 0, 1024, 1024)), radius=round(224*s), fill=AUBERGINE)
    d.rounded_rectangle(b((96, 176, 928, 848)), radius=round(160*s), fill=CREAM)
    d.polygon([(round(x*s), round(y*s)) for x, y in [(420,824),(512,948),(604,824)]], fill=CREAM)
    top = [(321,349),(205,465),(321,581),(372,530),(340,498),(717,498),(717,400),(340,400),(372,368)]
    bottom = [(703,443),(819,559),(703,675),(652,624),(684,592),(307,592),(307,494),(684,494),(652,526)]
    d.polygon([(round(x*s), round(y*s)) for x, y in top], fill=CORAL)
    d.polygon([(round(x*s), round(y*s)) for x, y in bottom], fill=SAGE)
    d.ellipse(b((737,237,813,313)), fill=CORAL)
    return image


def adaptive_foreground(size):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    side = round(size * .72)
    icon = mark(side, transparent=True)
    image.paste(icon, ((size-side)//2, (size-side)//2), icon)
    return image


def build_images():
    PNG.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 64, 128, 192, 256, 512, 1024):
        mark(size).save(PNG / f"en-learning-mark-{size}.png", optimize=True)
    mark(512).save(ROOT / "src" / "assets" / "logo.png", optimize=True)
    mark(256).save(ROOT / "public" / "favicon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

    for density, size in {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}.items():
        out = ANDROID / f"mipmap-{density}"
        out.mkdir(parents=True, exist_ok=True)
        mark(size).save(out / "ic_launcher.png", optimize=True)
        mark(size).save(out / "ic_launcher_round.png", optimize=True)
        adaptive_foreground(round(size * 2.25)).save(out / "ic_launcher_foreground.png", optimize=True)

    splashes = {
        "drawable": (480,320), "drawable-land-mdpi": (480,320), "drawable-land-hdpi": (720,480),
        "drawable-land-xhdpi": (960,640), "drawable-land-xxhdpi": (1440,960), "drawable-land-xxxhdpi": (1920,1280),
        "drawable-port-mdpi": (320,480), "drawable-port-hdpi": (480,720), "drawable-port-xhdpi": (640,960),
        "drawable-port-xxhdpi": (960,1440), "drawable-port-xxxhdpi": (1280,1920),
    }
    for folder, (width, height) in splashes.items():
        image = Image.new("RGB", (width, height), AUBERGINE)
        side = round(min(width, height) * .30)
        icon = mark(side, transparent=True)
        image.paste(icon, ((width-side)//2, (height-side)//2), icon)
        out = ANDROID / folder
        out.mkdir(parents=True, exist_ok=True)
        image.save(out / "splash.png", optimize=True)


def font_setup():
    pdfmetrics.registerFont(TTFont("Brand", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("BrandBold", "C:/Windows/Fonts/arialbd.ttf"))


def wrap(c, text, x, y, width, size=10, leading=15, bold=False, color=MULBERRY):
    font = "BrandBold" if bold else "Brand"
    c.setFont(font, size); c.setFillColor(HexColor(color))
    line, lines = "", []
    for word in text.split():
        probe = (line + " " + word).strip()
        if c.stringWidth(probe, font, size) <= width: line = probe
        else: lines.append(line); line = word
    if line: lines.append(line)
    for row in lines: c.drawString(x, y, row); y -= leading
    return y


def page_header(c, section, title, number):
    c.setFillColor(HexColor(AUBERGINE)); c.rect(0, H-92, W, 92, fill=1, stroke=0)
    c.setFillColor(HexColor(SAGE)); c.circle(48, H-46, 8, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("BrandBold", 9); c.drawString(68, H-38, section.upper())
    c.setFont("BrandBold", 24); c.drawString(68, H-68, title)
    c.setFillColor(HexColor("#9A8EA0")); c.setFont("Brand", 8)
    c.drawRightString(W-36, 24, f"EN Learning · Brandbook 1.0 · {number:02d}")


def build_pdf():
    font_setup()
    c = canvas.Canvas(str(BRAND / "EN-Learning-Brandbook.pdf"), pagesize=A4)
    c.setTitle("EN Learning — брендбук")
    c.setFillColor(HexColor(AUBERGINE)); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(HexColor(SAGE)); c.circle(W-82, H-82, 34, fill=1, stroke=0)
    c.setFillColor(HexColor(CORAL)); c.circle(W-42, H-132, 10, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("BrandBold", 50); c.drawString(48, H-250, "EN Learning")
    c.setFont("Brand", 24); c.drawString(50, H-290, "Слова, которые остаются.")
    c.setFillColor(HexColor("#D7C8D9")); c.setFont("Brand", 12)
    c.drawString(50, 72, "Брендбук · версия 1.0 · август 2026")
    c.showPage()

    pages = [
        ("01 · Стратегия", "Основа бренда", [("Обещание", "Помогаем закреплять английские слова через короткую двустороннюю практику — без громких обещаний и давления."),("Позиционирование", "Персональный тренажёр английских слов с личным словарём, упражнениями и понятной статистикой."),("Характер", "Умный, дружелюбный, спокойный, современный. Не инфантильный и не академически сухой."),("Ценности", "Ясность · регулярность · честный прогресс · личный темп · практичность.")]),
        ("02 · Айдентика", "Логотип", [("Смысл", "Речевой блок означает язык; встречные стрелки — перевод в обе стороны; коралловая точка — достигнутый результат."),("Версии", "Основной знак, горизонтальный логотип и монохромная версия. Для launcher icon всегда используется основной знак."),("Охранное поле", "Свободное поле равно высоте коралловой точки. Минимальный цифровой размер знака — 24 px."),("Нельзя", "Растягивать, вращать, добавлять тени и градиенты или возвращать старые Vuetify/Capacitor assets.")]),
        ("03 · Айдентика", "Цвет и типографика", [("Aubergine · #2B1F32", "Основной фон, заголовки, launcher icon."),("Coral · #E85D75", "CTA, ссылки, активные состояния."),("Sage · #66C7A5", "Прогресс, успех, второй акцент."),("Критический запрет", "Никогда не сочетать синие оттенки с жёлтым в бренде, интерфейсе или релизных материалах."),("Шрифт", "Inter; резерв Arial и системный Roboto. Текст 16/24, H1 32/40, кнопки без CAPS.")]),
        ("04 · Вербальная система", "Слоганы", [("Главный", "Слова, которые остаются."),("Вариант", "Ваш английский — слово за словом."),("Вариант", "Переводите меньше. Понимайте больше."),("Вариант", "Короткая практика. Видимый прогресс."),("CTA", "Начать тренировку · Продолжить · Добавить слово · Повторить сложные · Посмотреть прогресс.")]),
        ("05 · Метаданные", "Тайтлы и описания", [("Имя под иконкой", "EN Learning"),("Название релиза", "EN Learning — тренажёр слов"),("Короткое описание", "Тренируйте перевод и запоминайте английские слова в своём темпе."),("Web title", "EN Learning — английские слова, которые остаются"),("Meta description", "Личный тренажёр английской лексики: переводы в обе стороны, короткие упражнения, словарь и понятная статистика прогресса.")]),
        ("06 · Голос", "Tone of voice", [("Поддерживаем", "«Попробуем ещё раз» вместо «Неверно»."),("Объясняем", "«Введите перевод» вместо абстрактного «Ответ»."),("Конкретизируем", "«8 слов закреплено» вместо «Отличный результат!»."),("Не давим", "Без угрозы потерять серию, чувства вины и лишних восклицаний.")]),
        ("07 · Android", "Prerelease checklist", [("1", "Выполнить npm run android:sync."),("2", "Проверить launcher icon во всех mipmap density и adaptive mask."),("3", "Проверить брендовый splash на портретном и альбомном экране."),("4", "Если launcher кеширует иконку, удалить предыдущую установку с устройства."),("5", "Только после визуальной проверки собирать prerelease APK.")]),
    ]
    for number, (section, title, cards) in enumerate(pages, 2):
        page_header(c, section, title, number)
        y = H - 130
        for label, body in cards:
            c.setFillColor(HexColor(CREAM)); c.roundRect(42, y-84, W-84, 72, 12, fill=1, stroke=0)
            wrap(c, label, 58, y-34, W-116, size=12, bold=True, color=CORAL)
            wrap(c, body, 58, y-54, W-116, size=10)
            y -= 94
        c.showPage()
    c.save()


if __name__ == "__main__":
    build_images()
    build_pdf()
    print(f"Built brand assets in {BRAND}")
