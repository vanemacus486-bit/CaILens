"""Clean contact sheet: 8 CaILens icon candidates (light / dark / small sizes)."""
import pathlib, io
import resvg_py
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
SCRATCH = pathlib.Path('C:/Users/Rem/AppData/Local/hermes/cache/scratch')

CANDS = [
    ('a-dark-dial',   'A 暗色表盘'),
    ('b-clay-c',      'B 陶土C环'),
    ('c-time-blocks', 'C 时间块'),
    ('d-sunrise-arc', 'D 日出弧'),
    ('e-paper-ink',   'E 纸墨'),
    ('f-swiss',       'F 瑞士'),
    ('g-ink-plate',   'G 墨盘'),
    ('h-meridian',    'H 子午线'),
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


F_LBL, F_SM = font(19), font(13)
BIG, CELL, PAD, COLS = 190, 250, 30, 4
W = PAD * 2 + CELL * COLS
ROW_H = BIG + 34
BLOCK = 34 + ROW_H * 2
H = BLOCK * 2 + 34 + 2 * 78 + 20

sheet = Image.new('RGB', (W, H), '#F7F4F1')
d = ImageDraw.Draw(sheet)


def block(y0, bg, cap, cap_col, label_col):
    d.rectangle([0, y0, W, y0 + BLOCK], fill=bg)
    d.text((PAD, y0 + 10), cap, fill=cap_col, font=F_SM)
    for i, (name, lbl) in enumerate(CANDS):
        r, c = divmod(i, COLS)
        x = PAD + c * CELL + (CELL - BIG) // 2
        y = y0 + 34 + r * ROW_H
        im = render(name, BIG)
        sheet.paste(im, (x, y), im)
        d.text((x, y + BIG + 6), lbl, fill=label_col, font=F_LBL)


block(0, '#F7F4F1', 'LIGHT  ·  浅色背景', '#8C837B', '#2E2823')
block(BLOCK, '#151318', 'DARK  ·  深色背景', '#7B7480', '#EDE7E1')

y0 = BLOCK * 2
d.rectangle([0, y0, W, H], fill='#F7F4F1')
d.text((PAD, y0 + 10), 'SMALL  ·  48 / 32 / 24 / 16 px', fill='#8C837B', font=F_SM)
for i, (name, lbl) in enumerate(CANDS):
    r, c = divmod(i, COLS)
    x = PAD + c * CELL
    y = y0 + 34 + r * 78
    cx = x
    for s in (48, 32, 24, 16):
        im = render(name, s)
        sheet.paste(im, (cx, y + (48 - s) // 2), im)
        cx += s + 14
    d.text((x, y + 52), lbl, fill='#8C837B', font=F_SM)

out = SCRATCH / 'cailens-icons-v2.png'
sheet.save(out)
print('saved', out, sheet.size)

# 16px silhouette contrast: mean abs diff vs. a flat mid-grey tile
for name, _ in CANDS:
    im = render(name, 16).convert('RGB')
    px = im.tobytes()
    vals = [(px[i] + px[i+1] + px[i+2]) / 3 for i in range(0, len(px), 3)]
    mean = sum(vals) / len(vals)
    spread = sum(abs(v - mean) for v in vals) / len(vals)
    print(f'  {name:15s} 16px contrast={spread:5.1f}  mean_lum={mean:5.1f}')
