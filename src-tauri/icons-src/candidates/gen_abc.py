"""CaILens icon candidates — batch A/B/C. Outputs 1024x1024 SVG."""
import math, pathlib

OUT = pathlib.Path(__file__).parent
C = 512.0
R_SQ = 230


def svg(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n'
            f'  <defs>{defs}</defs>\n{body}\n</svg>\n')


def pt(r, deg):
    a = math.radians(deg)
    return C + r * math.cos(a), C + r * math.sin(a)


# ---------------------------------------------------------------- A: dark dial
# near-black slab, 12 hairline ticks, one warm tick at 12 o'clock, one warm dot.
def a_dark_dial():
    defs = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#1D1B22"/>'
            '<stop offset="1" stop-color="#111015"/></linearGradient>'
            '<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.09"/>'
            '<stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>')
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>',
         f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#sheen)"/>',
         f'<rect x="1.5" y="1.5" width="1021" height="1021" rx="{R_SQ - 1.5}" fill="none" '
         'stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="3"/>']
    for i in range(12):
        deg = i * 30 - 90
        top = (i == 0)
        r_out, length = 322, (78 if top else 34)
        x1, y1 = pt(r_out, deg)
        x2, y2 = pt(r_out - length, deg)
        col = '#EDA981' if top else '#4E4956'
        w = 22 if top else 14
        p.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                 f'stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>')
    p.append(f'<circle cx="{C}" cy="{C}" r="30" fill="#EDA981"/>')
    return svg('\n  '.join(p), defs)


# ------------------------------------------------- B: clay negative-space C
def b_clay():
    r = 292.0
    circ = 2 * math.pi * r
    gap = 74.0
    dash = circ * (360 - gap) / 360
    off = -circ * (gap / 2) / 360
    defs = ('<linearGradient id="bg" x1="0.1" y1="0" x2="0.6" y2="1">'
            '<stop offset="0" stop-color="#E3A07A"/>'
            '<stop offset="0.55" stop-color="#CE8058"/>'
            '<stop offset="1" stop-color="#B96C46"/></linearGradient>'
            '<radialGradient id="glow" cx="0.3" cy="0.15" r="0.9">'
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/>'
            '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>')
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>',
         f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#glow)"/>',
         f'<circle cx="{C}" cy="{C}" r="{r}" fill="none" stroke="#FCF4ED" stroke-width="98" '
         f'stroke-linecap="round" stroke-dasharray="{dash:.2f} {circ - dash:.2f}" '
         f'stroke-dashoffset="{off:.2f}"/>',
         f'<circle cx="{C + r:.1f}" cy="{C}" r="44" fill="#FCF4ED"/>']
    return svg('\n  '.join(p), defs)


# --------------------------------------------------------- C: time blocks (bars)
def c_blocks():
    heights = [158, 264, 196, 372, 236, 314, 174]
    cols = ['#6D3A24', '#8B492C', '#A75C37', '#C07146', '#D58B5B', '#E4A176', '#F0BD9B']
    bw, gap = 46, 36
    total = len(heights) * bw + (len(heights) - 1) * gap
    x0 = C - total / 2
    base = 706
    defs = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#1C1A20"/>'
            '<stop offset="1" stop-color="#100F14"/></linearGradient>'
            '<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.08"/>'
            '<stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>')
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>',
         f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#sheen)"/>']
    for i, (h, col) in enumerate(zip(heights, cols)):
        x = x0 + i * (bw + gap)
        p.append(f'<rect x="{x:.1f}" y="{base - h}" width="{bw}" height="{h}" rx="15" fill="{col}"/>')
    p.append(f'<rect x="{x0:.1f}" y="{base + 22}" width="{total:.1f}" height="9" rx="4.5" '
             'fill="#EDA981" fill-opacity="0.85"/>')
    return svg('\n  '.join(p), defs)


for name, fn in [('a-dark-dial', a_dark_dial), ('b-clay-c', b_clay), ('c-time-blocks', c_blocks)]:
    (OUT / f'{name}.svg').write_text(fn(), encoding='utf-8')
    print('wrote', name)
