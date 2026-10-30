"""Render the three icon candidates into one comparison sheet."""
import pathlib, io
import resvg_py
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
SCRATCH = pathlib.Path('C:/Users/Rem/AppData/Local/hermes/cache/scratch')

CANDS = [('a-dark-dial', 'A · 暗色表盘'),
         ('b-clay-c',   'B · 陶土 C 环'),
         ('c-time-blocks', 'C · 时间块')]


def render(name, size):
    svg = (HERE / f'{name}.svg').read_text(encoding='utf-8')
    data = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    return Image.open(io.BytesIO(bytes(data))).convert('RGBA')


FONT = None
FONT_S = None
for f in ['C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf']:
    try:
        FONT = ImageFont.truetype(f, 22)
        FONT_S = ImageFont.truetype(f, 16)
        break
    except Exception:
        continue
if FONT is None:
    FONT = FONT_S = ImageFont.load_default()

BIG = 232
COL = 300
PAD = 36
W = PAD * 2 + COL * 3
H = 1050
sheet = Image.new('RGB', (W, H), '#F7F4F1')
d = ImageDraw.Draw(sheet)

# section 1: light bg
d.rectangle([0, 0, W, 330], fill='#F7F4F1')
d.text((PAD, 14), '浅色背景 / LIGHT', fill='#8A8078', font=FONT_S)
for i, (name, label) in enumerate(CANDS):
    x = PAD + i * COL
    im = render(name, BIG)
    sheet.paste(im, (x + (COL - BIG) // 2, 52), im)
    d.text((x + (COL - BIG) // 2, 296), label, fill='#3A332E', font=FONT_S)

# section 2: dark bg
d.rectangle([0, 330, W, 700], fill='#141319')
d.text((PAD, 344), '深色背景 / DARK', fill='#7A7480', font=FONT_S)
for i, (name, label) in enumerate(CANDS):
    x = PAD + i * COL
    im = render(name, BIG)
    sheet.paste(im, (x + (COL - BIG) // 2, 382), im)

# section 3: small sizes on both bgs
SIZES = [64, 48, 32, 24, 16]
d.rectangle([0, 700, W, 880], fill='#F7F4F1')
d.text((PAD, 712), '小尺寸 / SMALL (浅)', fill='#8A8078', font=FONT_S)
for i, (name, label) in enumerate(CANDS):
    x = PAD + i * COL
    cx = x
    for s in SIZES:
        im = render(name, s)
        sheet.paste(im, (cx, 752), im)
        d.text((cx, 748 + 68), str(s), fill='#A29890', font=FONT_S)
        cx += s + 18

d.rectangle([0, 880, W, H], fill='#141319')
d.text((PAD, 892), '小尺寸 / SMALL (深)', fill='#7A7480', font=FONT_S)
for i, (name, label) in enumerate(CANDS):
    x = PAD + i * COL
    cx = x
    for s in SIZES:
        im = render(name, s)
        sheet.paste(im, (cx, 932), im)
        cx += s + 18

out = SCRATCH / 'cailens-candidates.png'
sheet.save(out)
print('saved', out, sheet.size)
for name, _ in CANDS:
    for s in (256, 32, 16):
        im = render(name, s)
        a = im.split()[-1]
        tot = s * s
        z = sum(1 for v in a.getdata() if v == 0)
        print(f'  {name} {s}px  transparent {100*z/tot:.1f}%')
