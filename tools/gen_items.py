#!/usr/bin/env python3
"""
Generates placeholder 32x32 item icons -> assets/items.png  and  data/items.js

You do NOT need to run this. The game only reads assets/items.png and data/items.js.
Run it only if you want to regenerate the placeholders:   python3 tools/gen_items.py
(needs Pillow:  pip install pillow)

Once you have your own item art, just replace assets/items.png (keep 32x32 cells,
16 per row) and edit the `icon` number of each item in the editor.
"""
import json, math, os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLS = 16
OUTLINE = (24, 18, 36, 255)

def h(x):
    x = x.lstrip('#')
    return tuple(int(x[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

# palettes: (dark, mid, light)
P = {k: tuple(h(c) for c in v) for k, v in {
    'green':   ('#2f7d32', '#5ccf4a', '#b6f58a'),
    'teal':    ('#1d6b5a', '#3fbf8f', '#9ef0c4'),
    'water':   ('#1f4fa0', '#3f8fe8', '#a8d8ff'),
    'bone':    ('#9a9484', '#d8d2c0', '#fff8e8'),
    'red':     ('#8a1f22', '#e0443a', '#ff9a7a'),
    'glow':    ('#4a2f8f', '#8f6bf0', '#d0c0ff'),
    'ghost':   ('#5a8fa0', '#a8e8f0', '#f0ffff'),
    'moss':    ('#2a4a22', '#4f8a3a', '#8fc060'),
    'silk':    ('#8a8aa0', '#c8c8dc', '#ffffff'),
    'iron':    ('#3a4048', '#6a7480', '#aab4c0'),
    'night':   ('#3a1f5a', '#7a3fa8', '#c58ae8'),
    'fang':    ('#b8ac90', '#ece4cc', '#fffaf0'),
    'ash':     ('#3a3636', '#6a6460', '#a8a29c'),
    'sulfur':  ('#a08a10', '#e8d020', '#fff58a'),
    'scale':   ('#8a2a18', '#d8502a', '#ffa070'),
    'horn':    ('#4a1418', '#8a2a30', '#c05a50'),
    'blood':   ('#5a0a14', '#b01830', '#ff5a6a'),
    'magma':   ('#8a2a08', '#ff7a18', '#ffd060'),
    'star':    ('#a08a30', '#ffd84a', '#fff8b0'),
    'void':    ('#2a1a4a', '#5a3a9a', '#a08ae8'),
    'phoenix': ('#b03a10', '#ff8a20', '#ffe060'),
    'moon':    ('#4a6aa0', '#a0c0f0', '#f0f8ff'),
    'angel':   ('#b0b0c8', '#f0f0ff', '#ffffff'),
    'comet':   ('#3a3a52', '#6a7090', '#a0c8ff'),
    'wood':    ('#5a3a1e', '#9a6a36', '#d0a060'),
    'gold':    ('#8a6418', '#e0b030', '#fff0a0'),
    'sludge':  ('#3a2a18', '#6a5030', '#9a8050'),
    'dragon':  ('#7a1a30', '#c02a50', '#ff7a90'),
}.items()}

# ---------------------------------------------------------------- drawing helpers
def poly(d, pts, c): d.polygon(pts, fill=c)
def ell(d, box, c): d.ellipse(box, fill=c)

def leaf(d, cx, cy, ang, ln, w, c1, c2):
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    px, py = -uy, ux
    tip = (cx + ux * ln, cy + uy * ln)
    m = (cx + ux * ln * .5, cy + uy * ln * .5)
    pts = [(cx, cy), (m[0] + px * w, m[1] + py * w), tip, (m[0] - px * w, m[1] - py * w)]
    poly(d, pts, c1)
    d.line([(cx, cy), tip], fill=c2, width=1)

def star_pts(cx, cy, ro, ri, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts

def shine(d, x, y, c): d.rectangle([x, y, x + 1, y + 1], fill=c)

# ---------------------------------------------------------------- shapes
def s_jelly(d, p, q):
    ell(d, (5, 12, 27, 28), p[1]); ell(d, (9, 7, 23, 19), p[1])
    ell(d, (7, 20, 25, 28), p[0]); ell(d, (8, 12, 26, 26), p[1])
    shine(d, 11, 11, p[2]); shine(d, 13, 14, p[2]); d.rectangle([19, 18, 20, 19], fill=p[0])

def s_herb(d, p, q):
    d.line([(16, 29), (16, 14)], fill=p[0], width=2)
    for ang, cx, cy, ln in [(-60, 16, 18, 13), (-120, 16, 18, 13), (-20, 16, 24, 11), (-160, 16, 24, 11), (-90, 16, 15, 12)]:
        leaf(d, cx, cy, ang, ln, 4, p[1], p[2])
    shine(d, 15, 6, p[2])

def s_drop(d, p, q):
    poly(d, [(16, 3), (7, 17), (25, 17)], p[1]); ell(d, (6, 13, 26, 30), p[1])
    ell(d, (9, 20, 24, 30), p[0]); ell(d, (8, 14, 24, 28), p[1])
    shine(d, 11, 17, p[2]); shine(d, 11, 20, p[2])

def s_dust(d, p, q):
    poly(d, [(3, 28), (9, 17), (14, 20), (17, 9), (22, 18), (29, 28)], p[1])
    poly(d, [(3, 28), (29, 28), (27, 24), (5, 24)], p[0])
    for x, y in [(15, 15), (19, 21), (10, 22), (23, 24), (14, 10), (6, 27)]: shine(d, x, y, p[2])

def s_crystal(d, p, q):
    poly(d, [(16, 2), (26, 11), (22, 30), (10, 30), (6, 11)], p[1])
    poly(d, [(16, 2), (26, 11), (16, 14)], p[2]); poly(d, [(6, 11), (16, 2), (16, 14)], p[1])
    poly(d, [(16, 14), (26, 11), (22, 30), (16, 30)], p[0])
    d.line([(16, 14), (10, 30)], fill=p[0]); shine(d, 11, 8, (255, 255, 255, 255))

def s_mushroom(d, p, q):
    ell(d, (4, 4, 28, 22), p[1]); d.rectangle([4, 14, 27, 22], fill=(0, 0, 0, 0))
    poly(d, [(4, 18), (28, 18), (26, 22), (6, 22)], p[0])
    d.rectangle([12, 19, 19, 29], fill=q[1]); d.rectangle([12, 19, 13, 29], fill=q[2])
    d.rectangle([17, 22, 19, 29], fill=q[0])
    for x, y in [(8, 9), (15, 6), (21, 10), (12, 13), (19, 15)]: ell(d, (x, y, x + 3, y + 3), p[2])

def s_wisp(d, p, q):
    poly(d, [(16, 3), (24, 10), (26, 22), (22, 27), (19, 24), (16, 30), (13, 24), (10, 27), (6, 22), (8, 10)], p[1])
    poly(d, [(6, 22), (10, 27), (13, 24), (16, 30), (16, 22)], p[0])
    d.rectangle([11, 12, 13, 15], fill=p[0]); d.rectangle([19, 12, 21, 15], fill=p[0])
    d.rectangle([14, 19, 17, 20], fill=p[0]); shine(d, 12, 7, p[2])

def s_moss(d, p, q):
    for (x, y, r, c) in [(9, 20, 7, p[0]), (21, 20, 7, p[0]), (15, 13, 8, p[1]), (10, 22, 6, p[1]), (22, 22, 6, p[1]), (16, 22, 7, p[1])]:
        ell(d, (x - r, y - r, x + r, y + r), c)
    for x, y in [(12, 12), (19, 15), (8, 21), (22, 22), (15, 24)]: shine(d, x, y, p[2])

def s_web(d, p, q):
    c = p[1]
    for a in range(0, 360, 45):
        r = math.radians(a); d.line([(16, 16), (16 + math.cos(r) * 14, 16 + math.sin(r) * 14)], fill=c)
    for R in (5, 9, 13):
        pts = [(16 + math.cos(math.radians(a)) * R, 16 + math.sin(math.radians(a)) * R) for a in range(0, 361, 45)]
        d.line(pts, fill=p[2])
    ell(d, (14, 14, 18, 18), p[0])

def s_ingot(d, p, q):
    poly(d, [(3, 27), (8, 16), (24, 16), (29, 27)], p[1]); poly(d, [(8, 16), (24, 16), (22, 12), (10, 12)], p[2])
    poly(d, [(3, 27), (29, 27), (28, 24), (4, 24)], p[0])
    poly(d, [(8, 12), (24, 12), (27, 4), (5, 4)], p[1]); poly(d, [(5, 4), (27, 4), (26, 2), (6, 2)], p[2])
    shine(d, 10, 6, p[2])

def s_flower(d, p, q):
    d.line([(16, 29), (16, 15)], fill=q[0], width=2)
    leaf(d, 16, 25, -30, 9, 3, q[1], q[2]); leaf(d, 16, 22, -150, 9, 3, q[1], q[2])
    for a in range(0, 360, 60):
        r = math.radians(a); cx, cy = 16 + math.cos(r) * 6, 10 + math.sin(r) * 6
        ell(d, (cx - 4, cy - 4, cx + 4, cy + 4), p[1])
    ell(d, (13, 7, 19, 13), p[2]); shine(d, 15, 9, p[0])

def s_fang(d, p, q):
    poly(d, [(8, 4), (24, 4), (22, 12), (18, 30), (15, 30), (11, 12)], p[1])
    poly(d, [(15, 30), (18, 30), (22, 12), (16, 12)], p[0]); d.rectangle([8, 4, 24, 7], fill=p[0])
    d.line([(12, 9), (15, 24)], fill=p[2], width=1)

def s_ash(d, p, q):
    poly(d, [(3, 28), (8, 18), (14, 21), (18, 11), (23, 20), (29, 28)], p[1])
    poly(d, [(3, 28), (29, 28), (27, 24), (5, 24)], p[0])
    for x, y in [(14, 17), (20, 23), (9, 23), (17, 14)]: shine(d, x, y, q[1])
    shine(d, 22, 8, q[2]); shine(d, 10, 11, q[1])

def s_sulfur(d, p, q):
    for (x, y, w, hh) in [(5, 28, 8, 14), (12, 28, 9, 22), (20, 28, 8, 16)]:
        poly(d, [(x, y), (x + w / 2, y - hh), (x + w, y)], p[1])
        poly(d, [(x + w / 2, y - hh), (x + w, y), (x + w / 2, y)], p[0])
    shine(d, 15, 9, p[2]); shine(d, 7, 18, p[2])

def s_scale(d, p, q):
    poly(d, [(16, 2), (28, 8), (26, 22), (16, 30), (6, 22), (4, 8)], p[1])
    poly(d, [(16, 2), (28, 8), (26, 22), (16, 30)], p[0])
    for y in (10, 16, 22):
        d.arc((8, y - 4, 24, y + 4), 0, 180, fill=p[2])
    shine(d, 9, 7, p[2])

def s_horn(d, p, q):
    poly(d, [(6, 28), (6, 18), (12, 8), (22, 3), (24, 6), (17, 12), (14, 20), (14, 28)], p[1])
    poly(d, [(14, 28), (14, 20), (17, 12), (24, 6), (22, 3), (18, 10), (12, 20), (10, 28)], p[0])
    d.rectangle([6, 24, 14, 28], fill=p[2]); d.line([(8, 20), (13, 10)], fill=p[2])

def s_blood(d, p, q):
    s_drop(d, p, q); d.rectangle([13, 23, 17, 24], fill=p[0])

def s_orb(d, p, q):
    ell(d, (3, 3, 29, 29), p[0]); ell(d, (5, 5, 27, 27), p[1]); ell(d, (8, 8, 24, 24), q[1] if q else p[2])
    ell(d, (11, 11, 20, 20), p[2]); shine(d, 8, 8, (255, 255, 255, 255))

def s_star(d, p, q):
    poly(d, star_pts(16, 17, 14, 6), p[1]); poly(d, star_pts(16, 17, 8, 3.5), p[2])
    shine(d, 15, 16, (255, 255, 255, 255)); shine(d, 25, 4, p[2]); shine(d, 5, 5, p[2])

def s_pearl(d, p, q):
    ell(d, (4, 4, 28, 28), p[0]); ell(d, (5, 5, 27, 26), p[1]); ell(d, (8, 8, 22, 20), p[1])
    ell(d, (9, 8, 15, 14), p[2]); shine(d, 18, 20, p[0]); shine(d, 22, 22, p[2])

def s_feather(d, p, q):
    poly(d, [(26, 3), (10, 8), (5, 18), (8, 24), (14, 22), (26, 3)], p[1])
    poly(d, [(26, 3), (14, 22), (22, 18), (28, 9)], p[0])
    d.line([(26, 3), (6, 29)], fill=p[2], width=1)
    for i in range(4):
        d.line([(22 - i * 4, 7 + i * 5), (14 - i * 3, 11 + i * 5)], fill=p[2])

def s_tear(d, p, q):
    s_drop(d, p, q); shine(d, 18, 22, p[2]); shine(d, 21, 8, p[2]); shine(d, 7, 6, p[2])

def s_comet(d, p, q):
    poly(d, [(2, 30), (20, 12), (16, 22)], p[0]); poly(d, [(2, 30), (14, 14), (10, 24)], p[1])
    poly(d, [(18, 8), (26, 10), (29, 18), (23, 25), (15, 23), (13, 15)], p[1])
    poly(d, [(18, 8), (26, 10), (22, 15), (14, 15)], p[2]); poly(d, [(29, 18), (23, 25), (15, 23), (22, 18)], p[0])

def s_sludge(d, p, q):
    poly(d, [(3, 27), (7, 17), (25, 17), (29, 27)], p[1]); ell(d, (6, 11, 24, 24), p[1])
    for x, y, r in [(10, 14, 2), (18, 11, 3), (22, 17, 2)]: ell(d, (x - r, y - r, x + r, y + r), p[2])
    d.rectangle([5, 25, 27, 28], fill=p[0])

def _glass(d, body, p, q, neck=(13, 3, 19, 11), cork=True):
    pass

def s_flask(d, p, q):
    glass = (210, 235, 255, 255)
    d.rectangle([12, 4, 19, 12], fill=glass)
    poly(d, [(12, 12), (19, 12), (28, 25), (24, 30), (7, 30), (4, 25)], glass)
    poly(d, [(11, 17), (20, 17), (27, 26), (24, 29), (7, 29), (5, 26)], p[1])
    d.rectangle([12, 13, 19, 16], fill=p[1]); d.rectangle([7, 26, 24, 29], fill=p[0])
    d.rectangle([11, 1, 20, 4], fill=h('#9a6a36')); shine(d, 9, 21, p[2]); shine(d, 14, 22, p[2])

def s_vial(d, p, q):
    glass = (210, 235, 255, 255)
    d.rectangle([11, 5, 20, 30], fill=glass); ell(d, (10, 25, 21, 31), glass)
    d.rectangle([12, 13, 19, 29], fill=p[1]); ell(d, (11, 25, 20, 30), p[1])
    d.rectangle([12, 25, 19, 29], fill=p[0]); d.rectangle([12, 13, 19, 14], fill=p[2])
    d.rectangle([10, 2, 21, 5], fill=h('#9a6a36')); shine(d, 13, 17, p[2]); shine(d, 13, 20, p[2])

def s_bottle(d, p, q):
    glass = (210, 235, 255, 255)
    poly(d, [(12, 3), (20, 3), (20, 9), (27, 14), (27, 30), (5, 30), (5, 14), (12, 9)], glass)
    poly(d, [(7, 17), (25, 17), (25, 28), (7, 28)], p[1]); d.rectangle([7, 25, 25, 28], fill=p[0])
    d.rectangle([13, 0, 19, 4], fill=h('#9a6a36')); shine(d, 9, 19, p[2]); shine(d, 12, 20, p[2])
    d.rectangle([13, 21, 19, 24], fill=p[2])  # label

def s_wand(d, p, q):
    d.line([(6, 28), (22, 12)], fill=q[0], width=4); d.line([(6, 28), (22, 12)], fill=q[1], width=2)
    poly(d, star_pts(23, 9, 7, 3), p[1]); shine(d, 22, 8, p[2]); shine(d, 28, 3, p[2]); shine(d, 17, 3, p[2])

def s_amulet(d, p, q):
    d.line([(7, 3), (16, 17), (25, 3)], fill=q[1], width=2)
    poly(d, [(16, 12), (25, 19), (22, 28), (10, 28), (7, 19)], q[1])
    poly(d, [(16, 15), (22, 20), (20, 26), (12, 26), (10, 20)], p[1]); shine(d, 13, 19, p[2])
    d.line([(16, 12), (16, 14)], fill=q[0])

def s_ring(d, p, q):
    ell(d, (6, 11, 26, 30), q[1]); ell(d, (10, 15, 22, 27), (0, 0, 0, 0))
    d.ellipse((10, 15, 22, 27), fill=(0, 0, 0, 0))
    d.arc((6, 11, 26, 30), 20, 160, fill=q[0], width=2)
    poly(d, [(16, 2), (22, 8), (16, 14), (10, 8)], p[1]); poly(d, [(16, 2), (22, 8), (16, 8)], p[2])

def s_stone(d, p, q):
    for r, c in [(15, q[0]), (13, q[1])]: pass
    ell(d, (2, 2, 30, 30), (p[2][0], p[2][1], p[2][2], 90))
    poly(d, [(16, 3), (27, 12), (23, 28), (9, 28), (5, 12)], p[1])
    poly(d, [(16, 3), (27, 12), (16, 16)], p[2]); poly(d, [(16, 16), (27, 12), (23, 28), (16, 28)], p[0])
    d.line([(16, 16), (9, 28)], fill=p[0]); shine(d, 11, 9, (255, 255, 255, 255)); shine(d, 17, 20, p[2])

def s_bag(d, p, q):
    ell(d, (4, 10, 28, 30), p[1]); poly(d, [(10, 4), (22, 4), (20, 12), (12, 12)], p[1])
    d.rectangle([10, 9, 22, 11], fill=p[0]); d.rectangle([14, 17, 18, 21], fill=q[1]); shine(d, 9, 15, p[2])

def s_hat(d, p, q):
    poly(d, [(16, 1), (24, 20), (8, 20)], p[1]); poly(d, [(16, 1), (24, 20), (16, 20)], p[0])
    ell(d, (2, 18, 30, 26), p[1]); d.rectangle([9, 15, 23, 18], fill=q[1]); shine(d, 14, 8, p[2])

def s_eye(d, p, q):
    poly(d, [(2, 16), (10, 8), (22, 8), (30, 16), (22, 24), (10, 24)], (240, 240, 240, 255))
    ell(d, (10, 9, 22, 23), p[1]); ell(d, (13, 12, 19, 20), (20, 16, 30, 255)); shine(d, 14, 13, (255, 255, 255, 255))

def s_coin(d, p, q):
    ell(d, (3, 3, 29, 29), p[0]); ell(d, (5, 5, 27, 27), p[1]); ell(d, (9, 9, 23, 23), p[0]); ell(d, (10, 10, 22, 22), p[1])
    d.rectangle([15, 12, 17, 20], fill=p[0]); shine(d, 8, 8, p[2])

def s_hands(d, p, q):
    ell(d, (2, 14, 11, 25), p[1])                                  # thumb
    for x in (7, 12, 17, 22):
        d.rounded_rectangle([x, 4 if x in (12, 17) else 6, x + 5, 18], radius=2, fill=p[1])
    d.rounded_rectangle([6, 13, 27, 28], radius=4, fill=p[1])
    d.rectangle([8, 25, 25, 30], fill=h('#e0b030')); d.rectangle([8, 25, 25, 26], fill=h('#fff0a0'))
    for x in (11, 16, 21): d.line([(x, 8), (x, 15)], fill=p[0])
    shine(d, 9, 17, p[2])

SHAPES = {k[2:]: v for k, v in globals().items() if k.startswith('s_')}

# ---------------------------------------------------------------- item table
# (id, name, kind, tier, value, desc, shape, palette, accent-palette, extra-dict)
def I(id, name, kind, tier, value, desc, shape, pal, acc=None, **extra):
    return dict(id=id, name=name, kind=kind, tier=tier, value=value, desc=desc, _shape=shape, _pal=pal, _acc=acc, **extra)

def eff(stat, secs, mult=None, add=None):
    e = {'stat': stat, 'secs': secs}
    if mult is not None: e['mult'] = mult
    if add is not None: e['add'] = add
    return e

ITEMS = [
    # ---- Tier 0: Mossy Marsh ingredients
    I('slime_jelly', 'Slime Jelly', 'ingredient', 0, 1, 'Wobbly marsh ooze. The base of half the potions in the book.', 'jelly', 'green'),
    I('mana_herb', 'Mana Herb', 'ingredient', 0, 1, 'Tingles when you hold it.', 'herb', 'teal'),
    I('spring_water', 'Spring Water', 'ingredient', 0, 1, 'Clear, cold and oddly sweet.', 'drop', 'water'),
    I('bone_dust', 'Bone Dust', 'ingredient', 0, 2, 'Ground fine. Do not sneeze.', 'dust', 'bone'),
    I('fire_crystal', 'Fire Crystal', 'ingredient', 0, 3, 'Warm to the touch, even in winter.', 'crystal', 'red'),
    I('glow_mushroom', 'Glowcap', 'ingredient', 0, 3, 'Shines faintly. Tastes like regret.', 'mushroom', 'glow', 'bone'),
    # ---- Tier 0 potions
    I('slime_tonic', 'Slime Tonic', 'potion', 0, 8, 'A soothing green tonic. A good base for stronger brews.', 'flask', 'green'),
    I('haste_draught', 'Haste Draught', 'potion', 0, 14, 'Apprentices work twice as fast for 90s.', 'vial', 'teal', effect=eff('auto', 90, mult=2)),
    I('fortune_elixir', 'Fortune Elixir', 'potion', 0, 16, '+25% drop chance for 90s.', 'vial', 'star', effect=eff('drop', 90, add=0.25)),
    I('fire_tonic', 'Fire Tonic', 'potion', 0, 18, 'Double click power for 60s.', 'bottle', 'red', effect=eff('click', 60, mult=2)),
    # ---- Tier 0 relics
    I('mana_wand', 'Mana Wand', 'relic', 0, 30, '+2 click power.', 'wand', 'teal', 'wood', slot='tool', bonus={'click': 2}),
    I('bone_charm', 'Bone Charm', 'relic', 0, 30, '+8% drop chance.', 'amulet', 'bone', 'wood', slot='charm', bonus={'drop': 0.08}),
    I('glowcap_ring', 'Glowcap Ring', 'relic', 0, 30, '+25% coins.', 'ring', 'glow', 'gold', slot='trinket', bonus={'coin': 0.25}),
    I('stone_0', 'Ascension Elixir', 'stone', 0, 0, 'Drink it and be reborn, with the Crypt thrown open.', 'stone', 'red'),
    # ---- Tier 1: Haunted Crypt ingredients
    I('ectoplasm', 'Ectoplasm', 'ingredient', 1, 5, 'Ghost goo. Cold, clingy.', 'wisp', 'ghost'),
    I('grave_moss', 'Grave Moss', 'ingredient', 1, 4, 'Grows only where something has been buried.', 'moss', 'moss'),
    I('spider_silk', 'Spider Silk', 'ingredient', 1, 4, 'Stronger than it looks. Stickier too.', 'web', 'silk'),
    I('grave_iron', 'Grave Iron', 'ingredient', 1, 6, 'Black iron from coffin fittings.', 'ingot', 'iron'),
    I('nightshade', 'Nightshade', 'ingredient', 1, 6, 'Pretty. Poisonous. Useful.', 'flower', 'night', 'moss'),
    I('wolf_fang', 'Wolf Fang', 'ingredient', 1, 5, 'Sharp enough to open a lock.', 'fang', 'fang'),
    # ---- Tier 1 potions
    I('ghost_brew', 'Ghost Brew', 'potion', 1, 40, 'Doubles all coin gains for 90s.', 'flask', 'ghost', effect=eff('coin', 90, mult=2)),
    I('spider_tincture', 'Spider Tincture', 'potion', 1, 36, '+30% drop chance for 90s.', 'vial', 'silk', effect=eff('drop', 90, add=0.3)),
    # ---- Tier 1 relics
    I('crypt_scepter', 'Crypt Scepter', 'relic', 1, 120, '+6 click power.', 'wand', 'ghost', 'iron', slot='tool', bonus={'click': 6}),
    I('wolf_talisman', 'Wolf Fang Talisman', 'relic', 1, 120, '+15% drop chance.', 'amulet', 'fang', 'iron', slot='charm', bonus={'drop': 0.15}),
    I('wraith_signet', 'Wraith Signet', 'relic', 1, 120, '+50% coins, +1 apprentice.', 'ring', 'ghost', 'iron', slot='trinket', bonus={'coin': 0.5, 'auto': 1}),
    I('stone_1', "Philosopher's Stone", 'stone', 1, 0, 'The crypt gives way to the Ember Pit.', 'stone', 'glow'),
    # ---- Tier 2: Ember Pit ingredients
    I('ember_ash', 'Ember Ash', 'ingredient', 2, 14, 'Still glowing, somehow.', 'ash', 'ash', 'magma'),
    I('sulfur', 'Sulfur', 'ingredient', 2, 12, 'Smells like a bad idea.', 'sulfur', 'sulfur'),
    I('dragon_scale', 'Dragon Scale', 'ingredient', 2, 22, 'Fireproof, naturally.', 'scale', 'scale'),
    I('demon_horn', 'Demon Horn', 'ingredient', 2, 18, 'Chipped from something that was very annoyed.', 'horn', 'horn'),
    I('imp_blood', 'Imp Blood', 'ingredient', 2, 16, 'Sizzles on contact with air.', 'blood', 'blood'),
    I('magma_core', 'Magma Core', 'ingredient', 2, 28, 'A pocket of the pit itself.', 'orb', 'magma'),
    # ---- Tier 2 potions
    I('inferno_draught', 'Inferno Draught', 'potion', 2, 120, 'Triple click power for 60s.', 'bottle', 'magma', effect=eff('click', 60, mult=3)),
    I('brimstone_brew', 'Brimstone Brew', 'potion', 2, 110, 'Triple coin gains for 60s.', 'flask', 'sulfur', effect=eff('coin', 60, mult=3)),
    # ---- Tier 2 relics
    I('ember_staff', 'Ember Staff', 'relic', 2, 400, '+20 click power.', 'wand', 'magma', 'wood', slot='tool', bonus={'click': 20}),
    I('imp_amulet', 'Imp-Horn Amulet', 'relic', 2, 400, '+25% drop chance.', 'amulet', 'horn', 'gold', slot='charm', bonus={'drop': 0.25}),
    I('dragon_band', 'Dragonscale Band', 'relic', 2, 400, '+120% coins, +2 apprentices.', 'ring', 'dragon', 'gold', slot='trinket', bonus={'coin': 1.2, 'auto': 2}),
    I('stone_2', 'Dragonheart Stone', 'stone', 2, 0, 'Fire made solid. The stars wait beyond it.', 'stone', 'magma'),
    # ---- Tier 3: Astral Spire ingredients
    I('star_dust', 'Star Dust', 'ingredient', 3, 40, 'Fell from somewhere very far away.', 'star', 'star'),
    I('void_pearl', 'Void Pearl', 'ingredient', 3, 55, 'Looking at it makes your ears ring.', 'pearl', 'void'),
    I('phoenix_feather', 'Phoenix Feather', 'ingredient', 3, 65, 'Warm. Occasionally on fire.', 'feather', 'phoenix'),
    I('moon_tear', 'Moon Tear', 'ingredient', 3, 50, 'Collected at midnight, in silence.', 'tear', 'moon'),
    I('angel_feather', 'Angel Feather', 'ingredient', 3, 45, 'Impossibly light.', 'feather', 'angel'),
    I('comet_iron', 'Comet Iron', 'ingredient', 3, 60, 'Metal that has seen the edge of the sky.', 'comet', 'comet'),
    # ---- Tier 3 potions
    I('starlight_elixir', 'Starlight Elixir', 'potion', 3, 350, 'Apprentices work 4x as fast for 90s.', 'vial', 'star', effect=eff('auto', 90, mult=4)),
    I('void_draught', 'Void Draught', 'potion', 3, 380, 'Quadruple click power for 60s.', 'bottle', 'void', effect=eff('click', 60, mult=4)),
    # ---- Tier 3 relics
    I('astral_scepter', 'Astral Scepter', 'relic', 3, 1200, '+60 click power.', 'wand', 'comet', 'gold', slot='tool', bonus={'click': 60}),
    I('phoenix_charm', 'Phoenix Charm', 'relic', 3, 1200, '+35% drop chance.', 'amulet', 'phoenix', 'gold', slot='charm', bonus={'drop': 0.35}),
    I('void_crown', 'Void Pearl Ring', 'relic', 3, 1200, '+300% coins, +4 apprentices.', 'ring', 'void', 'gold', slot='trinket', bonus={'coin': 3.0, 'auto': 4}),
    I('stone_3', 'Eternal Stone', 'stone', 3, 0, 'The end of the book, and the start of the next.', 'stone', 'star'),
    # ---- misc / UI
    I('sludge', 'Murky Sludge', 'junk', 0, 1, 'What happens when the recipe is wrong.', 'sludge', 'sludge'),
    I('ui_bag', 'Bag', 'ui', 0, 0, 'UI icon', 'bag', 'wood', 'gold'),
    I('ui_apprentice', 'Hat', 'ui', 0, 0, 'UI icon', 'hat', 'night', 'gold'),
    I('ui_eye', 'Eye', 'ui', 0, 0, 'UI icon', 'eye', 'teal'),
    I('ui_coin', 'Coin', 'ui', 0, 0, 'UI icon', 'coin', 'gold'),
    I('ui_hands', 'Hands', 'ui', 0, 0, 'UI icon', 'hands', 'bone'),
    I('ui_jar', 'Jar', 'ui', 0, 0, 'UI icon', 'flask', 'glow'),
]

def render(spec):
    layer = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    p = P[spec['_pal']]
    q = P[spec['_acc']] if spec['_acc'] else p
    SHAPES[spec['_shape']](d, p, q)
    # 1px outline
    alpha = layer.split()[3].point(lambda a: 255 if a > 40 else 0)
    grown = alpha.filter(ImageFilter.MaxFilter(3))
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    out.paste(Image.new('RGBA', (32, 32), OUTLINE), (0, 0), grown)
    out.alpha_composite(layer)
    return out

def main():
    rows = (len(ITEMS) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * 32, rows * 32), (0, 0, 0, 0))
    lines = []
    for i, spec in enumerate(ITEMS):
        sheet.paste(render(spec), ((i % COLS) * 32, (i // COLS) * 32))
        rec = {k: v for k, v in spec.items() if not k.startswith('_')}
        rec['icon'] = i
        # stable key order
        order = ['id', 'name', 'kind', 'tier', 'icon', 'value', 'desc', 'slot', 'bonus', 'effect']
        rec = {k: rec[k] for k in order if k in rec}
        lines.append('  ' + json.dumps(rec, ensure_ascii=False))
    sheet.save(os.path.join(ROOT, 'assets', 'items.png'))
    js = ("window.ALCH_DATA = window.ALCH_DATA || {};\n"
          "// kind: ingredient | potion | relic | stone | junk | ui\n"
          "// potion  -> effect { stat, secs, mult | add }      (stat: click | drop | coin | auto)\n"
          "// relic   -> slot (tool | charm | trinket), bonus { click, drop, coin, auto }\n"
          "// icon    -> cell number in assets/items.png (16 per row, 32x32 each)\n"
          "ALCH_DATA.items = [\n" + ',\n'.join(lines) + "\n];\n")
    open(os.path.join(ROOT, 'data', 'items.js'), 'w', encoding='utf-8').write(js)
    print('items:', len(ITEMS), 'sheet', sheet.size)

if __name__ == '__main__':
    main()
