"""Render all 8 CaILens icon candidates into one contact sheet."""
import pathlib, io
import resvg_py
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
SCRATCH = pathlib.Path('C:/Users/Rem/AppData/Local/hermes/cache/scratch')

CANDS = [
    ('a-dark-dial',   'A 暗色表盘',  '近黑底 + 12 刻度，12 点暖色长刻度'),
    ('b-clay-c',      'B 陶土 C 环', '陶土渐变底 + 白 C 环 + 圆点'),
    ('c-time-blocks', 'C 时间块',    '暗底 + 7 根色阶柱 + 基线'),
    ('d-sunrise-arc', 'D 日出弧',    '暗底 + 暖色半圆弧 + 地平线'),
    ('e-paper-ink',   'E 纸墨',      '暖白底 + 墨色 C 环 + 陶土圆点'),
    ('f-swiss',       'F 瑞士',      '纯白底 + 纯黑细线 C 环 + 指针'),
    ('g-ink-plate',   'G 墨盘',      '近黑底 + 一根暖刻度 + 暗刻度环'),
    ('h-meridian',    'H 子午线',    '深蓝黑底 + 细线穿空心环'),
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


F_LBL = font(21)
F_DS = font(14)
F_SM = font(13)

BIG = 176
COLW = 268
PAD = 32
COLS = 4
ROWS = 2
W = PAD * 2 + COLW * COLS
H = 1130
sheet = Image.new('RGB', (W, H), '#F7F4F1')
d = ImageDraw.Draw(sheet)


def grid(y_top, bg, caption, caption_col, big=True, sizelist=None):
    d.rectangle([0, y_top, W, y_top + 40], fill=bg)
    d.text((PAD, y_top + 10), caption, fill=caption_col, font=F_SM)
    for i, (name, lbl, desc) in enumerate(CANDS):
        r, c = divmod(i, COLS)
        x = PAD + c * COLW
        y = y_top + 40 + r * (BIG + 96) if big else y_top + 40 + r * 96
        if big:
            im = render(name, BIG)
            sheet.paste(im, (x + (COLW - BIG) // 2, y), im)
            d.text((x + 6, y + BIG + 8), lbl, fill=caption_col, font=F_LBL)
            d.text((x + 6, y + BIG + 36), desc, fill='#8C837B', font=F_DS)
        else:
            cx = x
            for s in sizelist:
                im = render(name, s)
                sheet.paste(im, (cx, y + 8), im)
                d.text((cx, y + 8 + 64), str(s), fill='#B0A79F', font=F_SM)
                cx += s + 14


# 1) 浅色背景大图
grid(0, '#F7F4F1', '浅色背景', '#2E2823')
# 2) 深色背景大图
grid(600, '#151318', '深色背景', '#EDE7E1')
# 3) 小尺寸两行
d.rectangle([0, 1130 - 150, W, 1130], fill='#F7F4F1')

out = SCRATCH / 'cailens-icon-8.png'
sheet.save(out)
print('saved', out, sheet.size)
