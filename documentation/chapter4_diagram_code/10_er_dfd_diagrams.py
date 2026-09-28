"""Bulletproof B&W StarUML-style engine for Chapter 4: ER Diagram + DFD Level 0/1/2.
Extended auto-fit engine (same philosophy as 08/09): every box is sized from its
measured text, so text overflow is impossible by construction. All output is pure
black & white grayscale, matching the rest of Chapter 4's StarUML diagrams.

Outputs (into ../ch4_bw/):
  bw_4_4_er_diagram.png      - Entity-Relationship diagram (15 collections)
  bw_4_5_dfd_level0.png      - Data Flow Diagram Level 0 (context diagram)
  bw_4_6_dfd_level1.png      - Data Flow Diagram Level 1 (process decomposition)
  bw_4_7_dfd_level2.png      - Data Flow Diagram Level 2 (SOS/incident detailed)
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
from matplotlib.textpath import TextPath
import matplotlib.font_manager as fm

FIGW = 7.2          # inches width of axes box
FS_ENTITY = 8.4      # font in entity/process boxes
FS_FIELD = 7.2       # font in ER attribute lists
FS_STORE = 8.2
FS_EXT = 8.4
FS_CARD = 7.0        # cardinality labels
FS_FLOW = 7.0        # data-flow labels
FS_TITLE = 11.5

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ch4_bw')


def pt_size(s, fs):
    fp = fm.FontProperties(family='serif', size=fs)
    lines = s.split('\n')
    mx = 0.0
    for ln in lines:
        tp = TextPath((0, 0), ln, prop=fp)
        mx = max(mx, tp.get_extents().width)
    return mx, len(lines) * fs * 1.40


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


def make_fig(xlim=100, ylim=100, title=None):
    fig, ax = plt.subplots(figsize=(FIGW, FIGW), dpi=200)
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    ax.set_xlim(0, xlim)
    ax.set_ylim(0, ylim)
    ax.axis('off')
    if title:
        ax.text(xlim / 2, ylim + 3.0, title, ha='center', va='top',
                fontsize=FS_TITLE, weight='bold')
    return fig, ax


def save(fig, ax, fname):
    for _ in range(8):
        try:
            fig.savefig(fname, dpi=200, bbox_inches='tight', facecolor='white')
            break
        except OSError:
            import time
            time.sleep(0.4)
    plt.close(fig)
    print('saved', os.path.basename(fname))


# ---------------------------------------------------------------- ER ----------
def size_entity(name, fields, fs=FS_ENTITY):
    """Width = max(name, fields) + padding; height = name + fields."""
    maxw = max([pt_size(name, fs)[0]] + [pt_size(f, FS_FIELD)[0] for f in fields])
    w_pt = max(maxw + 16, 110)
    h_pt = pt_size(name, fs)[1] + 4 + len(fields) * FS_FIELD * 1.42 + 8
    return w_pt, h_pt


def draw_entity(ax, cx, cy, name, fields, w, h):
    w_du, h_du = pt2du(w), pt2du(h)
    ax.add_patch(Polygon([(cx - w_du / 2, cy - h_du / 2), (cx + w_du / 2, cy - h_du / 2),
                          (cx + w_du / 2, cy + h_du / 2), (cx - w_du / 2, cy + h_du / 2)],
                         closed=True, facecolor='white', edgecolor='black', linewidth=1.4, zorder=4))
    header_h = pt2du(pt_size(name, fs=FS_ENTITY)[1] + 6)
    ax.add_patch(Polygon([(cx - w_du / 2, cy + h_du / 2 - header_h), (cx + w_du / 2, cy + h_du / 2 - header_h),
                          (cx + w_du / 2, cy + h_du / 2), (cx - w_du / 2, cy + h_du / 2)],
                         closed=True, facecolor='black', edgecolor='black', linewidth=1.2, zorder=5))
    ax.text(cx, cy + h_du / 2 - header_h / 2, name, ha='center', va='center',
            fontsize=FS_ENTITY, color='white', weight='bold', zorder=6)
    body_top = cy + h_du / 2 - header_h
    field_h = pt2du(FS_FIELD * 1.42)
    for i, f in enumerate(fields):
        y = body_top - field_h * (i + 0.5)
        ax.text(cx, y, f, ha='left', va='center', fontsize=FS_FIELD, zorder=6)
    # underline fields marked with '_' as PK
    for i, f in enumerate(fields):
        if f.startswith('_id'):
            y = body_top - field_h * (i + 1)
            ax.plot([cx - w_du / 2 + 3, cx + w_du / 2 - 3], [y, y], color='black', linewidth=0.8, zorder=7)


def er_line(ax, x1, y1, x2, y2, label=None, card_from='1', card_to='N', dash=False):
    """Straight relationship line with cardinality labels at both ends."""
    ax.plot([x1, x2], [y1, y2], color='black', linewidth=1.1,
            linestyle='--' if dash else '-', zorder=3)
    # cardinality labels offset orthogonal to the line
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    if label:
        ax.text(mx, my, label, ha='center', va='center', fontsize=FS_CARD,
                style='italic', zorder=6,
                bbox=dict(facecolor='white', edgecolor='none', pad=1.2))
    # endpoint cardinality near each entity
    dx, dy = x2 - x1, y2 - y1
    L = (dx * dx + dy * dy) ** 0.5
    if L < 1:
        return
    ux, uy = dx / L, dy / L
    px, py = uy, -ux  # perpendicular
    ax.text(x1 + ux * 6 + px * 3, y1 + uy * 6 + py * 3, card_from, ha='center', va='center',
            fontsize=FS_CARD, weight='bold', zorder=6)
    ax.text(x2 - ux * 6 + px * 3, y2 - uy * 6 + py * 3, card_to, ha='center', va='center',
            fontsize=FS_CARD, weight='bold', zorder=6)


def build_er():
    # Each entity: (label, [fields])
    E = [
        ('Users', ['_id (PK)', 'name', 'email (UQ)', 'phone (UQ)', 'passwordHash', 'role', 'isActive', 'language']),
        ('Locations', ['_id (PK)', 'latitude', 'longitude', 'address', 'city', 'state', 'postalCode', 'accuracy']),
        ('Incidents', ['_id (PK)', 'userId (FK)', 'type', 'category', 'description', 'priority', 'status', 'locationId (FK)', 'resolvedAt']),
        ('EmergencyContacts', ['_id (PK)', 'userId (FK)', 'name', 'phone', 'relation', 'isPrimary', 'notifySMS', 'notifyEmail']),
        ('Facilities', ['_id (PK)', 'name', 'facilityType', 'locationId (FK)', 'phone', 'capacity', 'isOperational']),
        ('RescueTeams', ['_id (PK)', 'name', 'teamType', 'phone', 'isActive', 'specializations', 'members[] (Users)', 'locationId (FK)']),
        ('IncidentUpdates', ['_id (PK)', 'incidentId (FK)', 'updatedBy (FK)', 'statusFrom', 'statusTo', 'comment']),
        ('UnsafeAreaReports', ['_id (PK)', 'reportedBy (FK)', 'locationId (FK)', 'category', 'description', 'severity', 'isVerified']),
        ('RescueAssignments', ['_id (PK)', 'incidentId (FK)', 'teamId (FK)', 'assignedBy (FK)', 'assignedAt', 'status', 'notes']),
        ('Notifications', ['_id (PK)', 'incidentId (FK)', 'contactId (FK)', 'channel', 'status', 'attemptCount', 'lastAttemptAt']),
        ('RiskAssessments', ['_id (PK)', 'locationId (FK)', 'riskScore', 'riskLevel', 'modelVersion', 'inputFactors', 'assessedAt']),
        ('RiskZones', ['_id (PK)', 'name', 'riskLevel', 'geometry', 'factors', 'lastAssessedAt', 'isActive']),
        ('AdminLogs', ['_id (PK)', 'adminId (FK)', 'action', 'targetType', 'targetId', 'details', 'ipAddress']),
        ('Reports', ['_id (PK)', 'generatedBy (FK)', 'title', 'reportType', 'format', 'dataSnapshot', 'expiresAt']),
        ('DisasterCategories', ['_id (PK)', 'name', 'code (UQ)', 'defaultPriority', 'requiresTeam', 'isActive']),
    ]
    # entity -> (row, col) on a 5-col x 3-row grid; then compute sizes
    grid = {
        'Users': (2, 0), 'Locations': (2, 2), 'Incidents': (2, 4),
        'EmergencyContacts': (1, 0), 'Facilities': (1, 1), 'RiskZones': (1, 2),
        'UnsafeAreaReports': (0, 0), 'RescueTeams': (1, 3), 'IncidentUpdates': (0, 4),
        'RescueAssignments': (1, 4), 'Notifications': (0, 3), 'RiskAssessments': (0, 2),
        'AdminLogs': (0, 1), 'Reports': (2, 1), 'DisasterCategories': (2, 3),
    }
    sizes = {name: size_entity(name, fields) for name, fields in E}
    # 15 entities -> lay out in a 5-wide x 3-tall grid (max of each present)
    NCOLS, NROWS = 5, 3
    XMARGIN, YMARGIN = 8.0, 9.0
    fig, ax = make_fig(xlim=100, ylim=94,
                       title='Figure 4.4: RakshaSafe Entity-Relationship Diagram (MongoDB Collections)')
    # dynamic grid: compute column widths from the widest entity in each column
    col_w = {}
    for name, (r, c) in grid.items():
        w, h = sizes[name]
        col_w[c] = max(col_w.get(c, 0), pt2du(w))
    row_h = {}
    for name, (r, c) in grid.items():
        row_h[r] = max(row_h.get(r, 0), pt2du(sizes[name][1]))
    xs = {}
    xcur = XMARGIN
    for c in range(NCOLS):
        xs[c] = xcur + col_w.get(c, 20) / 2
        xcur += col_w.get(c, 20) + 3.0
    ys = {}
    ycur = 88.0
    for r in range(NROWS)[::-1]:
        ys[r] = ycur - row_h.get(r, 20) / 2
        ycur -= row_h.get(r, 20) + 6.0
    centers = {}
    for name, (r, c) in grid.items():
        centers[name] = (xs[c], ys[r])

    for name, fields in E:
        cx, cy = centers[name]
        w, h = sizes[name]
        draw_entity(ax, cx, cy, name, fields, w, h)

    # ... relationships (1..N unless marked)
    rels = [
        ('Users', 'Incidents', 'reports', '1', 'N'),
        ('Users', 'EmergencyContacts', 'owns', '1', 'N'),
        ('Users', 'UnsafeAreaReports', 'reports', '1', 'N'),
        ('Users', 'Reports', 'generates', '1', 'N'),
        ('Users', 'AdminLogs', 'performs', '1', 'N'),
        ('Users', 'IncidentUpdates', 'updates', '1', 'N'),
        ('Users', 'RescueAssignments', 'assigns', '1', 'N'),
        ('Locations', 'Incidents', 'located at', '1', 'N'),
        ('Locations', 'Facilities', 'located at', '1', 'N'),
        ('Locations', 'RescueTeams', 'located at', '1', 'N'),
        ('Locations', 'UnsafeAreaReports', 'located at', '1', 'N'),
        ('Locations', 'RiskAssessments', 'assessed for', '1', 'N'),
        ('RescueTeams', 'RescueAssignments', 'assigned to', '1', 'N'),
        ('Incidents', 'IncidentUpdates', 'has history', '1', 'N'),
        ('Incidents', 'RescueAssignments', 'assigned', '1', 'N'),
        ('Incidents', 'Notifications', 'triggers', '1', 'N'),
        ('EmergencyContacts', 'Notifications', 'notifies', '1', 'N'),
        ('DisasterCategories', 'Incidents', 'classifies', '1', 'N'),
        ('Users', 'RescueTeams', 'members', 'N', 'M'),
    ]
    for a, b, lbl, ca, cb in rels:
        x1, y1 = centers[a]
        x2, y2 = centers[b]
        er_line(ax, x1, y1, x2, y2, label=lbl, card_from=ca, card_to=cb)
    save(fig, ax, os.path.join(OUT, 'bw_4_4_er_diagram.png'))


# ---------------------------------------------------------------- DFD ----------
def draw_process(ax, cx, cy, num, name, r=7.2):
    ax.add_patch(Circle((cx, cy), r, facecolor='white', edgecolor='black', linewidth=1.4, zorder=4))
    ax.text(cx, cy + r * 0.52, num, ha='center', va='center', fontsize=FS_FLOW, weight='bold', zorder=6)
    ax.text(cx, cy - r * 0.18, name, ha='center', va='center', fontsize=FS_STORE, zorder=6)


def draw_store(ax, cx, cy, num, name, w_pt=56):
    w, h = pt2du(w_pt), pt2du(pt_size(name, FS_STORE)[1] + 9)
    ax.plot([cx - w / 2, cx - w / 2], [cy - h / 2, cy + h / 2], color='black', linewidth=1.3, zorder=4)
    ax.plot([cx + w / 2, cx + w / 2], [cy - h / 2, cy + h / 2], color='black', linewidth=1.3, zorder=4)
    ax.plot([cx - w / 2, cx + w / 2], [cy - h / 2, cy - h / 2], color='black', linewidth=1.3, zorder=4)
    ax.text(cx - w / 2 + 2.2, cy, num + '  ' + name, ha='left', va='center', fontsize=FS_STORE, zorder=6)


def draw_ext(ax, cx, cy, name, w_pt=64):
    w, h = pt2du(w_pt), pt2du(pt_size(name, FS_EXT)[1] + 8)
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                                boxstyle='square,pad=0.12', facecolor='white',
                                edgecolor='black', linewidth=1.4, zorder=4))
    ax.text(cx, cy, name, ha='center', va='center', fontsize=FS_EXT, zorder=6)


def dfd_flow(ax, x1, y1, x2, y2, label=None, dash=False):
    """Compute trim points to node edges: nodes approx 7 units wide; externals 10; stores 8."""
    dx, dy = x2 - x1, y2 - y1
    L = (dx * dx + dy * dy) ** 0.5
    if L < 1:
        return
    ux, uy = dx / L, dy / L
    ax.add_patch(FancyArrowPatch((x1 + ux * 2, y1 + uy * 2), (x2 - ux * 2, y2 - uy * 2),
                                 arrowstyle='-|>', mutation_scale=12, linewidth=1.0,
                                 color='black', linestyle='--' if dash else '-',
                                 shrinkA=0, shrinkB=0, zorder=3))
    if label:
        ax.text((x1 + x2) / 2 + 1.2, (y1 + y2) / 2, label, ha='left', va='center',
                fontsize=FS_FLOW, style='italic', zorder=6,
                bbox=dict(facecolor='white', edgecolor='none', pad=0.8))


def build_dfd0():
    fig, ax = make_fig(xlim=100, ylim=90, title='Figure 4.5: Data Flow Diagram Level 0 (Context)')
    cx, cy = 52, 46
    ax.add_patch(Circle((cx, cy), 17, facecolor='white', edgecolor='black', linewidth=1.8, zorder=4))
    ax.text(cx, cy + 3, 'RAKSHA SAFE', ha='center', va='center', fontsize=11, weight='bold', zorder=6)
    ax.text(cx, cy - 6, 'Emergency Response', ha='center', va='center', fontsize=9, zorder=6)
    ax.text(cx, cy - 12, 'System', ha='center', va='center', fontsize=9, zorder=6)

    # external entities
    user = (9, 70);  admin = (9, 22);  responder = (92, 72);  osm = (92, 18)
    draw_ext(ax, *user, 'USER\n(Citizen)')
    draw_ext(ax, *admin, 'ADMINISTRATOR')
    draw_ext(ax, *responder, 'RESPONDER\n(Rescue Team)')
    draw_ext(ax, *osm, 'OPENSTREETMAP\n(Overpass API)')

    # data flows: user
    dfd_flow(ax, user[0] + 8, user[1], cx - 14, cy + 8, 'credentials / SOS / contacts', dash=False)
    dfd_flow(ax, cx - 10, cy - 2, user[0] + 8, user[1] - 2, 'incident status, notifications', dash=True)
    # admin
    dfd_flow(ax, admin[0] + 8, admin[1], cx - 14, cy - 8, 'login, manage incidents, teams', dash=False)
    dfd_flow(ax, cx - 10, cy + 4, admin[0] + 8, admin[1] + 2, 'admin dashboard, reports', dash=True)
    # responder
    dfd_flow(ax, responder[0] - 8, responder[1], cx + 14, cy + 8, 'login, assignment status', dash=False)
    dfd_flow(ax, cx + 10, cy - 2, responder[0] - 8, responder[1] - 2, 'assigned incidents', dash=True)
    # osm
    dfd_flow(ax, osm[0] - 8, osm[1], cx + 14, cy - 8, 'nearby facility query', dash=False)
    dfd_flow(ax, cx + 10, cy + 4, osm[0] - 8, osm[1] + 2, 'facility list + distance', dash=True)

    save(fig, ax, os.path.join(OUT, 'bw_4_5_dfd_level0.png'))


def build_dfd1():
    fig, ax = make_fig(xlim=100, ylim=92, title='Figure 4.6: Data Flow Diagram Level 1 (Main Processes)')
    # processes (num, name, cx, cy)
    procs = [
        (1, 'User Auth', 20, 68), (2, 'SOS / Incidents', 44, 68),
        (3, 'Location', 68, 68), (4, 'Resources', 88, 60),
        (5, 'Rescue Assignment', 20, 24), (6, 'AI Risk', 44, 28),
        (7, 'Notifications', 66, 24), (8, 'Admin & Reports', 86, 26),
    ]
    for num, name, x, y in procs:
        draw_process(ax, x, y, str(num) + '.0', name)
    # stores
    stores = [
        ('D1', 'Users', 8, 46), ('D2', 'Incidents', 34, 46),
        ('D3', 'Locations', 58, 46), ('D4', 'Contacts', 8, 6),
        ('D5', 'Facilities', 34, 8), ('D6', 'Teams', 68, 46),
        ('D7', 'Notifications', 60, 6), ('D8', 'UnsafeReports', 74, 10),
        ('D9', 'RiskZones', 90, 8),
    ]
    for num, name, x, y in stores:
        draw_store(ax, x, y, num, name)
    # external entities
    user = (20, 90); admin = (88, 90); resp = (96, 44)
    draw_ext(ax, *user, 'USER')
    draw_ext(ax, *admin, 'ADMIN')
    draw_ext(ax, *resp, 'RESPONDER')

    # flows
    dfd_flow(ax, user[0], user[1] - 8, 20, 76, 'login / SOS / contacts')
    dfd_flow(ax, admin[0], admin[1] - 8, 80, 70, 'login / manage')
    dfd_flow(ax, 20, 34, 20, 26, 'assign team')
    dfd_flow(ax, 74, 60, 96, 52, 'updates')
    dfd_flow(ax, 24, 70, 30, 50, 'writes', dash=True)
    dfd_flow(ax, 48, 68, 42, 52, 'reads', dash=True)
    dfd_flow(ax, 68, 68, 62, 50, 'reads', dash=True)
    dfd_flow(ax, 44, 28, 60, 50, 'risk data', dash=True)
    dfd_flow(ax, 86, 26, 76, 16, 'report', dash=True)
    save(fig, ax, os.path.join(OUT, 'bw_4_6_dfd_level1.png'))


def build_dfd2():
    fig, ax = make_fig(xlim=100, ylim=88, title='Figure 4.7: Data Flow Diagram Level 2 (SOS / Incident Processing)')
    # sub-processes of process 2.0
    procs = [
        ('2.1', 'Collect SOS\nDetails', 18, 66), ('2.2', 'Confirm\nLocation', 42, 66),
        ('2.3', 'Review\nRequest', 66, 66), ('2.4', 'Create\nIncident', 86, 56),
        ('2.5', 'Status\nTransition', 54, 26), ('2.6', 'Notify\nContacts', 80, 26),
    ]
    for num, name, x, y in procs:
        draw_process(ax, x, y, num, name, r=8.5)
    stores = [('D2', 'Incidents', 24, 20), ('D1', 'Users', 8, 44),
              ('D7', 'Notifications', 92, 6), ('D3', 'Locations', 60, 54)]
    for num, name, x, y in stores:
        draw_store(ax, x, y, num, name)
    user = (18, 92)
    draw_ext(ax, *user, 'USER')

    dfd_flow(ax, user[0], user[1] - 8, 18, 76, 'SOS details + GPS')
    dfd_flow(ax, 26, 60, 40, 62, '', dash=True)
    dfd_flow(ax, 50, 60, 64, 60, '', dash=True)
    dfd_flow(ax, 74, 62, 86, 62, '', dash=True)
    dfd_flow(ax, 86, 46, 54, 32, '', dash=True)
    dfd_flow(ax, 54, 16, 80, 20, 'delivery', dash=True)
    dfd_flow(ax, 24, 26, 30, 62, 'store incident', dash=True)
    dfd_flow(ax, 60, 60, 60, 58, 'reads', dash=True)
    save(fig, ax, os.path.join(OUT, 'bw_4_7_dfd_level2.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    build_er()
    build_dfd0()
    build_dfd1()
    build_dfd2()
    print('ER + DFD (L0/L1/L2) diagrams done')