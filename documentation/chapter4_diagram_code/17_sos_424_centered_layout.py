# -*- coding: utf-8 -*-
"""Redesigned layout ONLY for 'Flowchart 4.2.4: SOS Creation'.

Content is IDENTICAL to the existing flowchart (from mermaid/04_sos.mmd):
  A([User opens SOS page]) --> B[Select type, category, description, priority]
  B --> C{Use My Location?}
  C -- Yes --> D[Capture device coordinates]
  C -- No --> E[Continue without location]
  D --> F{Coordinates valid?}
  F -- No --> D
  F -- Yes --> G[Submit incident]
  E --> G
  G --> H([Stored as REPORTED + reference shown])

ONLY alignment / spacing / centering / print layout changed:
- Clean A4 portrait canvas, diagram dead-centered (equal left/right margins).
- Main vertical flow on x=50; Yes/No branches symmetric (x=30 / x=70).
- Straight arrows, Yes/No labels next to their arrows, no overlaps.
- B&W StarUML academic style, high-resolution PNG.
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon
from matplotlib.textpath import TextPath
import matplotlib.font_manager as fm

OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_bw_user\ubw_4_2_4_sos.png'
TITLE = 'Flowchart 4.2.4: SOS Creation'

# A4 portrait: 8.27 x 11.69 in. x: 0..100, y: 0..141.4 (equal aspect).
PAGE_W, PAGE_H = 8.27, 11.69
XMAX, YMAX = 100.0, 100.0 * PAGE_H / PAGE_W
FS_NODE, FS_DIAM, FS_LABEL, FS_TITLE = 9.0, 9.0, 7.5, 12.0
CX = 50.0          # main flow axis (exact page center)
XL, XR = 30.0, 70.0  # branch columns (symmetric about CX)


def pt_size(s, fs):
    fp = fm.FontProperties(family='serif', size=fs)
    mx = 0.0
    for ln in s.split('\n'):
        tp = TextPath((0, 0), ln, prop=fp)
        mx = max(mx, tp.get_extents().width)
    return mx, len(s.split('\n')) * fs * 1.40


def pt2du(w_pt):
    return w_pt / (PAGE_W * 72.0) * 100.0


def wrap(s, max_pt, fs):
    words, lines, cur = s.split(' '), [], ''
    for w in words:
        cand = (cur + ' ' + w).strip()
        if pt_size(cand, fs)[0] <= max_pt or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return '\n'.join(lines)


def rect_size(text, fs):
    t = wrap(text, 240.0, fs)
    tw, th = pt_size(t, fs)
    return t, tw + 18, th + 10


def diam_size(text, fs):
    t = wrap(text, 120.0, fs)
    tw, th = pt_size(t, fs)
    w = max(tw + 34, th * 2.4 + 26, 84)
    h = max(w * 0.52, th + 26, 52)
    return t, w, h


fig, ax = plt.subplots(figsize=(PAGE_W, PAGE_H), dpi=250)
fig.patch.set_facecolor('white')
ax.set_facecolor('white')
ax.set_xlim(0, XMAX)
ax.set_ylim(0, YMAX)
ax.set_aspect('equal')
ax.axis('off')
ax.text(CX, 131.5, TITLE, ha='center', va='top', fontsize=FS_TITLE,
        weight='bold', family='serif')

# ---- nodes: (kind, raw text, x, y-center) ----
specs = [
    ('pill', 'User opens SOS page', CX, 114.0),
    ('rect', 'Select type, category, description, priority', CX, 100.0),
    ('diam', 'Use My Location?', CX, 84.0),
    ('rect', 'Capture device coordinates', XL, 66.0),
    ('rect', 'Continue without location', XR, 66.0),
    ('diam', 'Coordinates valid?', XL, 48.0),
    ('rect', 'Submit incident', CX, 32.0),
    ('pill', 'Stored as REPORTED + reference shown', CX, 18.0),
]
nodes = {}
for kind, text, x, y in specs:
    fs = FS_DIAM if kind == 'diam' else FS_NODE
    if kind == 'diam':
        t, w, h = diam_size(text, fs)
    else:
        t, w, h = rect_size(text, fs)
    wdu, hdu = pt2du(w), pt2du(h)
    if kind == 'pill':
        ax.add_patch(FancyBboxPatch((x - wdu / 2, y - hdu / 2), wdu, hdu,
                                    boxstyle='round,pad=0.25,rounding_size=3.0',
                                    facecolor='white', edgecolor='black',
                                    linewidth=1.3, zorder=4))
    elif kind == 'rect':
        ax.add_patch(FancyBboxPatch((x - wdu / 2, y - hdu / 2), wdu, hdu,
                                    boxstyle='square,pad=0.25',
                                    facecolor='white', edgecolor='black',
                                    linewidth=1.3, zorder=4))
    else:
        ax.add_patch(Polygon([(x, y + hdu / 2), (x + wdu / 2, y),
                              (x, y - hdu / 2), (x - wdu / 2, y)],
                             closed=True, facecolor='white', edgecolor='black',
                             linewidth=1.35, zorder=4))
    ax.text(x, y, t, ha='center', va='center', fontsize=fs, family='serif',
            linespacing=1.4, zorder=6)
    nodes[text] = dict(x=x, y=y, w=wdu, h=hdu, kind=kind)


def edge(n, side):
    d = nodes[n]
    if side == 'top':
        return (d['x'], d['y'] + d['h'] / 2)
    if side == 'bottom':
        return (d['x'], d['y'] - d['h'] / 2)
    if side == 'left':
        return (d['x'] - d['w'] / 2, d['y'])
    if side == 'right':
        return (d['x'] + d['w'] / 2, d['y'])
    raise ValueError(side)


def arrow(p1, p2, label=None, lab_side='left'):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle='-|>', mutation_scale=14,
                                 linewidth=1.15, color='black', zorder=3))
    if label:
        mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
        dx = 2.6 if lab_side == 'left' else -2.6
        ax.text(mx - dx if lab_side == 'left' else mx - dx, my, label,
                ha='right' if lab_side == 'left' else 'left', va='center',
                fontsize=FS_LABEL, style='italic', family='serif', zorder=6,
                bbox=dict(facecolor='white', edgecolor='none', pad=0.6))


A = 'User opens SOS page'
B = 'Select type, category, description, priority'
C = 'Use My Location?'
D = 'Capture device coordinates'
E = 'Continue without location'
F = 'Coordinates valid?'
G = 'Submit incident'
H = 'Stored as REPORTED + reference shown'

# main vertical spine
arrow(edge(A, 'bottom'), edge(B, 'top'))
arrow(edge(B, 'bottom'), edge(C, 'top'))
# branches out of the decision (labels close to arrows)
arrow(edge(C, 'left'), edge(D, 'top'), label='Yes', lab_side='left')
arrow(edge(C, 'right'), edge(E, 'top'), label='No', lab_side='right')
# Yes branch column
arrow(edge(D, 'bottom'), edge(F, 'top'))
# No loop-back: parallel straight line just left of the D->F spine (no overlap)
nd, nf = nodes[D], nodes[F]
lx = XL - 3.2
arrow((lx, nf['y'] + nf['h'] / 2 - 0.6), (lx, nd['y'] - nd['h'] / 2 + 0.6),
      label='No', lab_side='left')
# Yes merge into Submit (diagonal, straight)
fb = edge(F, 'bottom')
gt = edge(G, 'top')
arrow((fb[0], fb[1]), (gt[0] - 6.0, gt[1]), label='Yes', lab_side='left')
# No-branch merge into Submit (diagonal, straight)
eb = edge(E, 'bottom')
arrow((eb[0], eb[1]), (gt[0] + 6.0, gt[1]))
# final spine
arrow(edge(G, 'bottom'), edge(H, 'top'))

fig.savefig(OUT, dpi=250, facecolor='white')
plt.close(fig)
print('saved', OUT)
from PIL import Image as _I
im = _I.open(OUT)
print('size:', im.size)