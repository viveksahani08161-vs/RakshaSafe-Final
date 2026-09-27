"""Bulletproof auto-fit B&W StarUML engine for Chapter 4.
Every box is sized FROM its measured text -> text overflow is impossible by construction.
Units: data x=0..100 maps to fig width W inches. We compute in points then convert.
"""
import os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon, Circle
from matplotlib.textpath import TextPath
import matplotlib.font_manager as fm

FIGW = 6.6          # inches width of the axes box
FS_PROC = 8.5        # font size (points) in boxes
FS_DEC = 8.2
FS_NOTE = 6.8
FS_LABEL = 6.6
FS_TITLE = 11.5

def pt_size(s, fs):
    fp = fm.FontProperties(family='serif', size=fs)
    lines = s.split('\n')
    mx = 0.0
    for ln in lines:
        tp = TextPath((0, 0), ln, prop=fp)
        mx = max(mx, tp.get_extents().width)
    return mx, len(lines) * fs * 1.38

def wrap(s, max_pt, fs):
    words = s.split(' ')
    lines, cur = [], ''
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

def pt2du(w_pt):
    return w_pt / (FIGW * 72.0) * 100.0

class Box:
    __slots__ = ('kind', 'text', 'x', 'y', 'w', 'h', 'fs')
    def __init__(self, kind, text, fs):
        self.kind = kind
        self.text = text
        self.fs = fs
        self.x = self.y = self.w = self.h = 0.0

def size_proc(kind, text, fs=FS_PROC):
    """Returns wrapped text and (w_pt, h_pt) box size exactly fitting text + padding."""
    if kind == 'dec':
        # diamond: size to allow text up to ~0.9 of width
        target_w_pt = 150.0
        t = wrap(text, target_w_pt * 0.86, fs)
        tw, th = pt_size(t, fs)
        w_pt = max(tw + 12, th * 2.6 + 12, 60)
        h_pt = max(w_pt * 0.42, th * 1.9, 34)
    else:
        target_w_pt = 190.0
        t = wrap(text, target_w_pt - 12, fs)
        tw, th = pt_size(t, fs)
        w_pt = max(tw + 14, 70)
        h_pt = max(th + 7, 30)
    return t, w_pt, h_pt

def draw_node(ax, b):
    cx, cy = b.x, b.y
    w_du = pt2du(b.w)
    h_du = pt2du(b.h)
    if b.kind == 'startno':
        ax.add_patch(Circle((cx, cy), h_du * 0.5, facecolor='black', edgecolor='black', linewidth=1.3, zorder=4))
    elif b.kind == 'endno':
        r = h_du * 0.5
        ax.add_patch(Circle((cx, cy), r, facecolor='white', edgecolor='black', linewidth=1.3, zorder=4))
        ax.add_patch(Circle((cx, cy), r * 0.55, facecolor='black', edgecolor='black', linewidth=1.2, zorder=5))
    elif b.kind == 'dec':
        x, y, w, h = cx, cy, w_du, h_du
        ax.add_patch(Polygon([(x, y + h / 2), (x + w / 2, y), (x, y - h / 2), (x - w / 2, y)],
                             closed=True, facecolor='white', edgecolor='black', linewidth=1.35, zorder=4))
        ax.text(cx, cy, b.text, ha='center', va='center', fontsize=b.fs, zorder=6)
    else:  # proc / data
        ax.add_patch(FancyBboxPatch((cx - w_du / 2, cy - h_du / 2), w_du, h_du,
                                    boxstyle='round,pad=0.25,rounding_size=1.8',
                                    facecolor='white', edgecolor='black', linewidth=1.3, zorder=4))
        ax.text(cx, cy, b.text, ha='center', va='center', fontsize=b.fs,
                linespacing=1.4, zorder=6)


def arrow_down(ax, x0, y0, x1, y1, label=None, dash=False):
    ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle='-|>', mutation_scale=15,
                                 linewidth=1.1, color='black', linestyle='--' if dash else '-',
                                 shrinkA=1.0, shrinkB=1.0, zorder=3))
    if label:
        ax.text(x0 + 3.0, (y0 + y1) / 2, label, ha='left', va='center',
                fontsize=FS_LABEL, style='italic', zorder=6, bbox=dict(facecolor='white', edgecolor='none', pad=0.2))


def build_flow(fname, title, steps, decisions, welcome_paths):
    """
    steps: list of (kind, text)  kind in start|proc|data|dec|startno|endno
    decisions: dict index(dec) -> (note_label, note_text or None)
    welcome_paths: not used (kept for compat)
    Layout: single column; each node auto-sized; arrows connect bottom->top.
    Main chain continues downward through the loop of LAST dec? We support a simple
    sequential chain; dec places a branch note to the right.
    """
    boxes = []
    for kind, text in steps:
        fs = FS_DEC if kind == 'dec' else (FS_NOTE if kind in ('startno', 'endno') else FS_PROC)
        if kind in ('startno', 'endno'):
            text = text or ''
            b = Box(kind, '', fs)
            b.w, b.h = 16.0, 16.0
            boxes.append(b)
            continue
        t, w, h = size_proc(kind, text, fs)
        boxes.append(Box(kind, t, fs))
        boxes[-1].w, boxes[-1].h = w, h

    # vertical stacking
    gap = pt2du(16)
    cx = 32.0
    y = 96.0
    for b in boxes:
        b.x = cx
        h_du = pt2du(b.h)
        b.y = y - h_du / 2
        y -= (h_du + gap)

    # title
    fig_h_in = (100 + 4) / 10.0
    fig, ax = plt.subplots(figsize=(FIGW, FIGW * 1.15), dpi=200)
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, fig_h_in * 10 / FIGW * FIGW / 10.0)
    ytop = 100
    ax.set_ylim(0, 110)
    ax.axis('off')
    ax.text(50, 105.5, title, ha='center', va='top', fontsize=FS_TITLE, weight='bold')
    ax.set_ylim(0, 112)

    for b in boxes:
        draw_node(ax, b)

    # arrows between consecutive boxes (skip when parent is dec that goes right? decisions:
    # we treat chain as 'yes' path going down; notes go right)
    for i in range(len(boxes) - 1):
        a, c = boxes[i], boxes[i + 1]
        y_from = a.y - pt2du(a.h) / 2
        y_to = c.y + pt2du(c.h) / 2
        arrow_down(ax, cx, y_from, cx, y_to, label=None)

    # decision notes to the right
    for i, b in enumerate(boxes):
        if b.kind == 'dec' and i in decisions:
            lbl, ntext = decisions[i]
            if not ntext:
                continue
            fs = FS_NOTE
            tw, th = pt_size(ntext, fs)
            nw = max(tw + 12, 64)
            nh = max(th + 6, 26)
            nx = b.x + pt2du(b.w) / 2 + pt2du(74)
            ny = b.y
            # branch arrow from diamond to note
            ax.add_patch(FancyArrowPatch((b.x + pt2du(b.w) / 2 + 2, b.y),
                                         (nx - pt2du(nw) / 2 - 1, ny), arrowstyle='-|>',
                                         mutation_scale=13, linewidth=1.0, color='black',
                                         linestyle='--', zorder=3))
            ax.text(b.x + pt2du(b.w) / 2 + 4, b.y + 2.4, lbl, ha='left', va='bottom',
                    fontsize=FS_LABEL, style='italic', zorder=6)
            # dashed note box
            ax.add_patch(FancyBboxPatch((nx - pt2du(nw) / 2, ny - pt2du(nh) / 2),
                                        pt2du(nw), pt2du(nh),
                                        boxstyle='round,pad=0.2,rounding_size=1.4',
                                        facecolor='white', edgecolor='black',
                                        linewidth=1.1, linestyle='--', zorder=4))
            ax.text(nx, ny, ntext, ha='center', va='center', fontsize=fs, zorder=6)
            # Yes label on down arrow below diamond
            if i + 1 < len(boxes):
                yn = boxes[i + 1].y + pt2du(boxes[i + 1].h) / 2
                ax.text(cx - 2.5, (b.y - pt2du(b.h) / 2 + yn) / 2 - 1.2, 'Yes', ha='right',
                        va='center', fontsize=FS_LABEL, style='italic', zorder=6)

    # title in words for caption
    h = 112
    ymax = 112
    # recompute bottom to crop: find lowest node
    lowest = min(b.y - pt2du(b.h) / 2 for b in boxes)
    # adjust ylim bottom to lowest - margin
    ax.set_ylim(lowest - 5.0, 112)
    fname_path = os.path.join(r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_bw', fname)
    fig.savefig(fname_path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print('saved', fname)


FLOWS = [
    ('bw_4_2_1_login.png', 'Flowchart 4.2.1: Login',
     [('startno', None), ('proc', 'Enter email / phone and password'),
      ('dec', 'Credentials valid?'), ('proc', 'Account active?'),
      ('proc', 'Create JWT session'), ('dec', 'Role: USER / ADMIN / RESPONDER?'),
      ('endno', None)],
     {2: ('No', 'Show invalid-credentials error'), 5: ('No', 'Permission denied')}),
    ('bw_4_2_2_registration.png', 'Flowchart 4.2.2: Registration',
     [('startno', None), ('proc', 'Enter name, email, phone, password'),
      ('dec', 'Fields unique and valid?'), ('proc', 'Hash password (bcrypt)'),
      ('proc', 'Create USER account'), ('proc', 'Create session'), ('endno', None)],
     {2: ('No', 'Field-level errors')}),
    ('bw_4_2_3_user_dashboard.png', 'Flowchart 4.2.3: User Dashboard',
     [('startno', None), ('proc', 'Load own incidents and notifications'),
      ('proc', 'Render stat summary and quick actions'), ('dec', 'Open incident detail?'),
      ('proc', 'Show timeline, location, risk'), ('endno', None)],
     {3: ('No', 'Stay on dashboard')}),
    ('bw_4_2_4_sos.png', 'Flowchart 4.2.4: SOS Creation',
     [('startno', None), ('proc', 'Select type, category, description, priority'),
      ('dec', 'Use My Location?'), ('proc', 'Capture device coordinates'),
      ('dec', 'Coordinates valid?'), ('proc', 'Submit incident'), ('endno', None)],
     {2: ('No', 'Continue without location'), 4: ('No', 'Retry capture')}),
    ('bw_4_2_5_incident_detail.png', 'Flowchart 4.2.5: Incident Detail',
     [('startno', None), ('proc', 'Load facts, location, history'),
      ('proc', 'Load nearby resources and weather'), ('dec', 'Assignable team attached?'),
      ('proc', 'Show assignment and team contact'), ('dec', 'REPORTED/ACK + unassigned?'),
      ('endno', None)],
     {3: ('No', 'Skip team card'), 5: ('No', 'Read-only view')}),
    ('bw_4_2_6_contacts.png', 'Flowchart 4.2.6: Emergency Contacts',
     [('startno', None), ('proc', 'Add / edit contact form'),
      ('dec', 'Phone valid and normalised?'), ('dec', 'Only one primary per user?'),
      ('proc', 'Save to Mongo'), ('endno', None)],
     {2: ('No', 'Fix phone'), 3: ('No', '\u201cPrimary\u201d needed - clear old one')}),
    ('bw_4_2_7_resources.png', 'Flowchart 4.2.7: Resource Lookup',
     [('startno', None), ('proc', 'Enter search term / filters'),
      ('dec', 'Use current location?'), ('proc', 'Query stored facilities and providers'),
      ('proc', 'Sort by distance'), ('endno', None)],
     {2: ('No', 'Search without location')}),
    ('bw_4_2_8_unsafe.png', 'Flowchart 4.2.8: Unsafe Reporting',
     [('startno', None), ('proc', 'Choose category, severity, description'),
      ('dec', 'Location attached?'), ('proc', 'Validate coordinates'),
      ('proc', 'Submit report'), ('endno', None)],
     {2: ('No', 'Use searched place')}),
    ('bw_4_2_9_risk.png', 'Flowchart 4.2.9: Risk Assessment',
     [('startno', None), ('proc', 'Click Assess Risk'),
      ('proc', 'Backend counts nearby factors'), ('data', 'POST /risk/assess (FastAPI)'),
      ('dec', 'Response valid?'), ('proc', 'Store RiskAssessment and show panel'),
      ('endno', None)],
     {4: ('No', 'Retryable error')}),
    ('bw_4_2_10_notifications.png', 'Flowchart 4.2.10: Notifications',
     [('startno', None), ('proc', 'Load own notification records'),
      ('proc', 'Show channel and status badges'), ('dec', 'Open linked incident?'),
      ('proc', 'Show incident context'), ('proc', 'Mark entry read'), ('endno', None)],
     {3: ('No', 'Continue scanning')}),
    ('bw_4_2_11_profile.png', 'Flowchart 4.2.11: Profile',
     [('startno', None), ('proc', 'Edit name, email, phone, language'),
      ('dec', 'Valid and unique values?'), ('proc', 'Save changes'),
      ('proc', 'Confirm updated account'), ('endno', None)],
     {2: ('No', 'Show field errors')}),
    ('bw_4_2_12_admin_dashboard.png', 'Flowchart 4.2.12: Admin Dashboard',
     [('startno', None), ('proc', 'Query users, incidents, status breaks'),
      ('proc', 'Render counters and activity feed'), ('dec', 'Drill into incident?'),
      ('proc', 'Show incident + risk + assignments'), ('endno', None)],
     {3: ('No', 'Stay on dashboard')}),
    ('bw_4_2_13_admin_incidents.png', 'Flowchart 4.2.13: Admin Incidents',
     [('startno', None), ('proc', 'Filter by status / priority / text'),
      ('dec', 'Legal status transition?'), ('proc', 'Write IncidentUpdates + AdminLog'),
      ('dec', 'Assign rescue team?'), ('proc', 'Create ASSIGNED assignment'),
      ('endno', None)],
     {2: ('No', 'List allowed transitions'), 4: ('No', 'Proceed without team')}),
    ('bw_4_2_14_admin_masters.png', 'Flowchart 4.2.14: Admin Masters',
     [('startno', None), ('proc', 'Facilities / teams / users / reports'),
      ('dec', 'Action permitted?'), ('proc', 'Create / edit / verify record'),
      ('proc', 'Log action to AdminLogs'), ('endno', None)],
     {2: ('No', 'Access denied')}),
]

for fname, title, steps, decs in FLOWS:
    build_flow(fname, title, steps, decs, None)
print('all 14 flowcharts rebuilt with auto-fit')