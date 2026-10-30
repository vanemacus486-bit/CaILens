"""CaILens icon candidates F/G/H — restrained, 'premium software' direction.

F  Swiss     : 纯白底 + 纯黑细线符号（无渐变、无圆角底）
G  Ink plate : 近黑底 + 一根暖色细刻度 + 一枚极小的日角标
H  Meridian  : 极深蓝黑底 + 单根竖向细线穿过一枚空心环（时钟指针 + 镜头）
"""
import math, pathlib

OUT = pathlib.Path(__file__).parent
C = 512.0
R_SQ = 232


def wrap(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n'
            f'  <defs>{defs}</defs>\n{body}\n</svg>\n')


def pt(r, deg):
    a = math.radians(deg)
    return C + r * math.cos(a), C + r * math.sin(a)


# ------------------------------------------------------------------ F: Swiss
def f_swiss():
    # 白底、黑细线：一个开口 3/4 环 + 一根从圆心指向缺口的指针
    r = 268.0
    circ = 2 * math.pi * r
    gap = 96.0                      # 缺口角度
    dash = circ * (360 - gap) / 360
    off = -circ * (gap / 2) / 360   # 让缺口正对 +x
    hx, hy = pt(r * 0.62, 180 + gap / 2)
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="#FFFFFF"/>',
         f'<circle cx="{C}" cy="{C}" r="{r}" fill="none" stroke="#0F0F10" stroke-width="52" '
         f'stroke-linecap="butt" stroke-dasharray="{dash:.2f} {circ - dash:.2f}" '
         f'stroke-dashoffset="{off:.2f}"/>',
         f'<line x1="{C}" y1="{C}" x2="{hx:.1f}" y2="{hy:.1f}" stroke="#0F0F10" '
         'stroke-width="52" stroke-linecap="butt"/>',
         f'<circle cx="{C}" cy="{C}" r="34" fill="#0F0F10"/>']
    return wrap('\n  '.join(p))


# --------------------------------------------------------------- G: Ink plate
def g_ink():
    defs = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#141417"/>'
            '<stop offset="1" stop-color="#0B0B0D"/></linearGradient>')
    # 12 点方向一根暖色细刻度；其余用极低对比的暗刻度暗示表盘
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>']
    for i in range(12):
        deg = i * 30 - 90
        if i == 0:
            continue
        x1, y1 = pt(300, deg)
        x2, y2 = pt(268, deg)
        p.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                 'stroke="#F0F0F2" stroke-opacity="0.13" stroke-width="13" stroke-linecap="round"/>')
    x1, y1 = pt(300, -90)
    x2, y2 = pt(206, -90)
    p.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
             'stroke="#E8A177" stroke-width="26" stroke-linecap="round"/>')
    p.append(f'<circle cx="{C}" cy="{C}" r="148" fill="none" stroke="#F0F0F2" '
             'stroke-opacity="0.22" stroke-width="4"/>')
    return wrap('\n  '.join(p), defs)


# --------------------------------------------------------------- H: Meridian
def h_meridian():
    defs = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#101823"/>'
            '<stop offset="1" stop-color="#0A0F16"/></linearGradient>'
            '<linearGradient id="line" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#F6C79E"/>'
            '<stop offset="1" stop-color="#D98A5C"/></linearGradient>')
    r = 214.0
    p = [f'<rect width="1024" height="1024" rx="{R_SQ}" fill="url(#bg)"/>',
         f'<circle cx="{C}" cy="{C}" r="{r}" fill="none" stroke="#8FA3B8" '
         'stroke-opacity="0.55" stroke-width="16"/>',
         f'<line x1="{C}" y1="{C - r - 128}" x2="{C}" y2="{C + r + 128}" '
         'stroke="url(#line)" stroke-width="22" stroke-linecap="round"/>',
         f'<circle cx="{C}" cy="{C}" r="54" fill="#0A0F16"/>',
         f'<circle cx="{C}" cy="{C}" r="54" fill="none" stroke="#F6C79E" stroke-width="16"/>']
    return wrap('\n  '.join(p), defs)


for name, fn in [('f-swiss', f_swiss), ('g-ink-plate', g_ink), ('h-meridian', h_meridian)]:
    (OUT / f'{name}.svg').write_text(fn(), encoding='utf-8')
    print('wrote', name)
