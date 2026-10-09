"""
Turns the 3D renders (made with tools/art/render.js) into the app's icon, splash and store images.
Usage: python3 tools/art/compose.py <folder with icon-raw.png, icon-nohill.png, sheep-raw.png, banner-raw.png>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = sys.argv[1]
ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'assets')
STORE = os.path.join(os.path.dirname(__file__), '..', '..', 'store')
os.makedirs(STORE, exist_ok=True)

SKY_TOP = (126, 200, 245)
SKY_BOTTOM = (205, 238, 255)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new('RGBA', size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,))
    return img


def sky(size):
    img = gradient(size, SKY_TOP, SKY_BOTTOM)
    # A soft sun glow in the corner
    glow = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    w, h = size
    d.ellipse([w * 0.78, -h * 0.1, w * 1.08, h * 0.2], fill=(255, 245, 200, 150))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(w * 0.04)))
    return img


def font(px):
    for path in ['/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    return ImageFont.load_default()


def outlined_text(draw, xy, text, size, fill, outline, anchor='mm'):
    f = font(size)
    draw.text(xy, text, font=f, fill=fill, anchor=anchor, stroke_width=max(2, size // 9), stroke_fill=outline)


icon_raw = Image.open(os.path.join(SRC, 'icon-raw.png')).convert('RGBA')
icon_free = Image.open(os.path.join(SRC, 'icon-nohill.png')).convert('RGBA')
sheep_raw = Image.open(os.path.join(SRC, 'sheep-raw.png')).convert('RGBA')
banner_raw = Image.open(os.path.join(SRC, 'banner-raw.png')).convert('RGBA')

# iOS / main icon: 1024x1024, no transparency.
icon = sky((1024, 1024))
icon.alpha_composite(icon_raw)
icon.convert('RGB').save(os.path.join(ASSETS, 'icon.png'))
icon.convert('RGB').resize((48, 48), Image.LANCZOS).save(os.path.join(ASSETS, 'favicon.png'))

# Android adaptive icon: background + foreground kept inside the safe circle (about 66%).
sky((1024, 1024)).convert('RGB').save(os.path.join(ASSETS, 'android-icon-background.png'))
fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
small = icon_free.resize((700, 700), Image.LANCZOS)
fg.alpha_composite(small, (162, 170))
fg.save(os.path.join(ASSETS, 'android-icon-foreground.png'))
mono = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
mono.paste(Image.new('RGBA', (1024, 1024), (255, 255, 255, 255)), (0, 0), fg.split()[3])
mono.save(os.path.join(ASSETS, 'android-icon-monochrome.png'))

# Splash: the sheep on its own (the background color is set in app.json).
bbox = sheep_raw.getbbox()
sheep = sheep_raw.crop(bbox)
side = max(sheep.size) + 80
splash = Image.new('RGBA', (side, side), (0, 0, 0, 0))
splash.alpha_composite(sheep, ((side - sheep.width) // 2, (side - sheep.height) // 2))
splash.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ASSETS, 'splash-icon.png'))

# Store banner (Google Play "feature graphic" 1024x500) with the title.
banner = sky((1024, 500))
banner.alpha_composite(banner_raw)
shade = Image.new('RGBA', (1024, 500), (0, 0, 0, 0))
ImageDraw.Draw(shade).rectangle([0, 0, 1024, 150], fill=(40, 90, 140, 70))
banner.alpha_composite(shade.filter(ImageFilter.GaussianBlur(30)))
d = ImageDraw.Draw(banner)
outlined_text(d, (512, 70), 'Sheepdog Rush!', 84, (255, 255, 255), (91, 58, 26))
banner.convert('RGB').save(os.path.join(STORE, 'feature-graphic-1024x500.png'))
icon.convert('RGB').resize((512, 512), Image.LANCZOS).save(os.path.join(STORE, 'icon-512.png'))
print('done')
