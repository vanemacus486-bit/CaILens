"""Render all 5 CaILens icon candidates into one contact sheet."""
import pathlib, io
import resvg_py
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
SCRATCH = pathlib.Path('C:/Users/Rem/AppData/Local/hermes/cache/scratch')

CANDS = [
    ('a-dark-dial',    'A · 暗色表盘',    '近黑底 + 12 道刻度，12 点一道暖色长刻度'),
    ('b-clay-c',       'B · 陶土 C 环',   '暖陶土渐变底 + 白色 C 形开口环 + 圆点'),
    ('c-time-blocks',  'C · 时间块',      '暗底 + 7 根递增色阶柱，底部一条基线'),
    ('d-sunrise-arc',  'D · 日出弧',      '暗底 + 暖色半圆弧 + 下方地平线'),
    ('e-paper-ink',    'E · 纸墨',        '暖白底 + 墨色 C 环 + 陶土色圆点'),
]


def render(name, size):
    svg = (HERE / f'{name}.svg').read_text(encoding='utf-8')
    data = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    return Image.open(io.BytesIO(bytes(data))).convert('RGBA')


def font(sz):
    for f in ['C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/segoeui.ttf']:
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            continue
    return ImageFont.load_default()


F_LABEL = font(24)
F_DESC = font(16)
F_SM = font(14)

BIG = 210
COLW = 340
PAD = 40
W = PAD * 2 + COLW * len(CANDS)
H = 1000
sheet = Image.new('RGB', (W, H), '#F6F3F0')
d = ImageDraw.Draw(sheet)

# row 1: light bg, big
sheet.paste(Image.new('RGB', (W, 330), '#F6F3F0'), (0, 0))
d.text((PAD, 12), '浅色背景', fill='#8C837B', font=F_SM)
for i, (name, label, desc) in enumerate(CANDS):
    x = PAD + i * COLW
    im = render(name, BIG)
    sheet.paste(im, (x + (COLW - BIG) // 2, 40), im)
    d.text((x + 10, 262), label, fill='#2E2823', font=F_LABEL)
    d.text((x + 10, 296), desc, fill='#8C837B', font=F_DESC)

# row 2: dark bg, big
sheet.paste(Image.new('RGB', (W, 330), '#151318'), (0, 340))
d.text((PAD, 352), '深色背景', fill='#7B7480', font=F_SM)
for i, (name, label, _) in enumerate(CANDS):
    x = PAD + i * COLW
    im = render(name, BIG)
    sheet.paste(im, (x + (COLW - BIG) // 2, 380), im)

# row 3: light, small sizes
SIZES = [64, 48, 32, 24, 16]
sheet.paste(Image.new('RGB', (W, 180), '#F6F3F0'), (0, 670))
d.text((PAD, 682), '小尺寸 · 浅色', fill='#8C837B', font=F_SM)
for i, (name, _, _) in enumerate(CANDS):
    x = PAD + i * COLW
    cx = x
    for s in SIZES:
        im = render(name, s)
        sheet.paste(im, (cx, 712), im)
        d.text((cx, 712 + 70), str(s), fill='#B0A79F', font=F_SM)
        cx += s + 20

# row 4: dark, small sizes
sheet.paste(Image.new('RGB', (W, 150), '#151318'), (0, 850))
d.text((PAD, 860), '小尺寸 · 深色', fill='#7B7480', font=F_SM)
for i, (name, _, _) in enumerate(CANDS):
    x = PAD + i * COLW
    cx = x
    for s in SIZES:
        im = render(name, s)
        sheet.paste(im, (cx, 890), im)
        cx += s + 20

out = SCRATCH / 'cailens-icon-candidates-5.png'
sheet.save(out)
print('saved', out, sheet.size)

# 16px legibility probe: how much of the 16px tile is non-background
for name, _, _ in CANDS:
    im = render(name, 16).convert('RGB')
    px = im.tobytes()
    uniq = len({px[i:i+3] for i in range(0, len(px), 3)})
    print(f'  {name:16s} 16px distinct colors={uniq}')
