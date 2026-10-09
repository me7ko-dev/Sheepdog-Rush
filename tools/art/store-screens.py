"""
Makes App Store / Google Play screenshots with a caption on top.
Usage: python3 tools/art/store-screens.py <folder with raw 1290x2796 screenshots>
Raw screenshots (1-start.png ... 5-levels.png) come from the browser build (see README).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'store', 'screenshots')

SIZES = {
    'ios-6.9': (1320, 2868),
    'ios-6.5': (1284, 2778),
    'android': (1080, 1920),
}
CAPTIONS = {
    'en': {
        '1-start': 'Herd the flock\ninto the barn!',
        '2-play': 'Drag your finger -\nthe dog runs there',
        '3-wolf': 'Chase away\nthe hungry wolf!',
        '4-win': 'Earn 3 stars\non every level',
        '5-levels': '10 levels of\nfarm fun',
    },
    'bg': {
        '1-start': 'Прибери стадото\nв хамбара!',
        '2-play': 'Плъзни пръст -\nкучето тича натам',
        '3-wolf': 'Прогони\nгладния вълк!',
        '4-win': 'Събери 3 звезди\nна всяко ниво',
        '5-levels': '10 нива\nфермерско забавление',
    },
}


def font(px):
    for path in ['/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    return ImageFont.load_default()


def background(size):
    w, h = size
    img = Image.new('RGB', size)
    d = ImageDraw.Draw(img)
    top, bottom = (110, 196, 240), (124, 203, 91)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    out = Image.new('RGBA', img.size)
    out.paste(img, (0, 0), mask)
    return out


def make(raw, size, caption):
    w, h = size
    canvas = background(size).convert('RGBA')
    cap_h = int(h * 0.2)
    d = ImageDraw.Draw(canvas)
    f = font(int(w * 0.082))
    d.multiline_text((w / 2, cap_h * 0.55), caption, font=f, fill='white', anchor='mm', align='center',
                     spacing=int(w * 0.02), stroke_width=int(w * 0.008), stroke_fill=(91, 58, 26))
    # Phone screenshot below the caption
    avail_h = h - cap_h - int(h * 0.03)
    scale = min(avail_h / raw.height, (w * 0.86) / raw.width)
    shot = raw.resize((int(raw.width * scale), int(raw.height * scale)), Image.LANCZOS)
    shot = rounded(shot.convert('RGBA'), int(w * 0.05))
    x = (w - shot.width) // 2
    y = cap_h
    shadow = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x + 8, y + 16, x + shot.width + 8, y + shot.height + 16], int(w * 0.05), fill=(0, 0, 0, 90))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    canvas.alpha_composite(shot, (x, y))
    return canvas.convert('RGB')


for lang, captions in CAPTIONS.items():
    for name, caption in captions.items():
        raw = Image.open(os.path.join(SRC, name + '.png')).convert('RGB')
        for size_name, size in SIZES.items():
            folder = os.path.join(OUT, lang, size_name)
            os.makedirs(folder, exist_ok=True)
            make(raw, size, caption).save(os.path.join(folder, name + '.png'))
print('done')
