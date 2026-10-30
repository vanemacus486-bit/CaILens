"""Zoom strips: render each candidate at 16/24/32px then nearest-neighbour upscale x8
so small-size legibility can be judged by eye instead of trusted."""
import pathlib, io
import resvg_py
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
SCRATCH = pathlib.Path('C:/Users/Rem/AppData/Local/hermes/cache/scratch')

CANDS = [('a-dark-dial', 'A'), ('b-clay-c', 'B'), ('c-time-blocks', 'C'),
         ('d-sunrise-arc', 'D'), ('e-paper-ink', 'E'), ('f-swiss', 'F'),
         ('g-ink-plate', 'G'), ('h-meridian', 'H')]
SIZES = [16, 24, 32]
ZOOM = 8


def render(name, size):
    svg = (HERE / f'{name}.svg').read_text(encoding='utf-8')
    d = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    return Image.open(io.BytesIO(bytes(d))).convert('RGBA')


def font(sz):
    for f in ['C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/segoeui.ttf']:
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            continue
    return ImageFont.load_default()


F = font(15)
CW = 32 * ZOOM + 24          # one candidate cell
RH = 32 * ZOOM + 30
W = 60 + CW * len(CANDS)
H = 36 + RH
sheet = Image.new('RGB', (W, H), '#1b1a1f')
dr = ImageDraw.Draw(sheet)
dr.text((14, 10), '1:1 pixel zoom x8  —  32 / 24 / 16 px', fill='#8b8794', font=F)

for i, (name, letter) in enumerate(CANDS):
    x0 = 60 + i * CW
    dr.text((x0 + 4, 10), letter, fill='#e0a882', font=F)
    cx = x0
    for s in SIZES:
        im = render(name, s).resize((s * ZOOM, s * ZOOM), Image.Resampling.NEAREST)
        sheet.paste(im, (cx, 36), im)
        cx += s * ZOOM + 8

out = SCRATCH / 'cailens-zoom-8.png'
sheet.save(out)
print('saved', out, sheet.size)
