"""CaILens icon candidates D/E — quieter, more 'premium software' direction."""
import math, pathlib

OUT = pathlib.Path(__file__).parent
C = 512.0
R_SQ = 230


def wrap(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n'
            f'  <defs>{defs}</defs>\n{body}\n</svg>\n')


def pt(r, deg):
    a = math.radians(deg)
    return C + r * math.cos(a), C + r * math.sin(a)


# ------------------------------------------------------- D: sunrise arc on baseline
def d_arc():
    defs = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#211E26"/>'
            '<stop offset="1" stop-color="#131217"/></linearGradient>'
            '<linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">'
            '<stop offset="0" stop-color="#F2B58C"/>'
            '<stop offset="0.5" stop-color="#E08F5F"/>'
            '<stop offset="1" stop-color="#C9703F"/></linearGradient>')
    r = 236
    x1, y1 = pt(r, 180)
    x2, y2 = pt(r, 360)
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>',
         f'<path d="M {x1:.1f} {y1:.1f} A {r} {r} 0 0 1 {x2:.1f} {y2:.1f}" fill="none" '
         f'stroke="url(#arc)" stroke-width="86" stroke-linecap="round"/>',
         f'<line x1="{C - 300}" y1="{C + 118}" x2="{C + 300}" y2="{C + 118}" '
         f'stroke="#F2B58C" stroke-width="22" stroke-linecap="round" stroke-opacity="0.55"/>',
         f'<circle cx="{C}" cy="{C - 176}" r="0" fill="none"/>']
    return wrap('\n  '.join(p), defs)


# ------------------------------------------------- E: paper-white, ink C + warm dot
def e_paper():
    r = 250.0
    circ = 2 * math.pi * r
    gap = 86.0
    dash = circ * (360 - gap) / 360
    off = -circ * (gap / 2) / 360
    defs = ('<linearGradient id="bg" x1="0.15" y1="0" x2="0.85" y2="1">'
            '<stop offset="0" stop-color="#FBF8F4"/>'
            '<stop offset="1" stop-color="#F1EAE2"/></linearGradient>')
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>',
         f'<circle cx="{C}" cy="{C}" r="{r}" fill="none" stroke="#262229" stroke-width="96" '
         f'stroke-linecap="round" stroke-dasharray="{dash:.2f} {circ - dash:.2f}" '
         f'stroke-dashoffset="{off:.2f}"/>',
         f'<circle cx="{C + r:.1f}" cy="{C}" r="48" fill="#C9703F"/>']
    return wrap('\n  '.join(p), defs)


for name, fn in [('d-sunrise-arc', d_arc), ('e-paper-ink', e_paper)]:
    (OUT / f'{name}.svg').write_text(fn(), encoding='utf-8')
    print('wrote', name)
