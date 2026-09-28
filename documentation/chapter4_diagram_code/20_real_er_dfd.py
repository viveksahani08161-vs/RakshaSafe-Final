# -*- coding: utf-8 -*-
"""REAL RakshaSafe ER + DFD diagrams (user + admin, all levels).

Content is derived from the ACTUAL source:
  - models  : backend/src/models/*.ts   (15 Mongoose collections, exact fields/refs)
  - routes  : backend/src/routes/*.ts    (real endpoints -> processes & data stores)

Outputs (B&W high-res PNG, onto documentation/ch4_bw/):
  bw_4_4_er_diagram.png         ER diagram (15 collections, real FKs)
  bw_4_5_dfd_level0.png         DFD Level 0 - context (real external systems)
  bw_4_6_dfd_level1_user.png    DFD Level 1 - USER domain
  bw_4_7_dfd_level1_admin.png   DFD Level 1 - ADMIN domain
  bw_4_8_dfd_level2_user.png    DFD Level 2 - SOS creation (USER)
  bw_4_9_dfd_level2_admin.png   DFD Level 2 - incident administration (ADMIN)
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
from matplotlib.textpath import TextPath
import matplotlib.font_manager as fm

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ch4_bw')
FIGW = 7.2
FS_ENTITY = 8.2
FS_FIELD = 6.8
FS_STORE = 8.0
FS_EXT = 8.0
FS_PROC = 7.6
FS_CARD = 6.8
FS_FLOW = 6.6
FS_TITLE = 11.5


def pt_size(s, fs):
    fp = fm.FontProperties(family='serif', size=fs)
    mx = 0.0
    for ln in s.split('\n'):
        mx = max(mx, TextPath((0, 0), ln, prop=fp).get_extents().width)
    return mx, len(s.split('\n')) * fs * 1.40


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


def pt2du(w_pt):
    return w_pt / (FIGW * 72.0) * 100.0


def make_fig(xlim=100, ylim=100, title=None):
    fig, ax = plt.subplots(figsize=(FIGW, FIGW), dpi=220)
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    ax.set_xlim(0, xlim)
    ax.set_ylim(0, ylim)
    ax.axis('off')
    if title:
        ax.text(xlim / 2, ylim + 4.0, title, ha='center', va='top',
                fontsize=FS_TITLE, weight='bold', family='serif')
    return fig, ax


def save(fig, fname):
    for _ in range(8):
        try:
            fig.savefig(fname, dpi=220, bbox_inches='tight', facecolor='white')
            break
        except OSError:
            import time
            time.sleep(0.4)
    plt.close(fig)
    print('saved', os.path.basename(fname))


# ================================================================ ER ==========
def size_entity(name, fields):
    maxw = max([pt_size(name, FS_ENTITY)[0]] + [pt_size(f[0], FS_FIELD)[0] for f in fields])
    w_pt = max(maxw + 18, 108)
    h_pt = pt_size(name, FS_ENTITY)[1] + 4 + len(fields) * FS_FIELD * 1.40 + 8
    return w_pt, h_pt


def draw_entity(ax, cx, cy, name, fields, w, h, tag):
    w_du, h_du = pt2du(w), pt2du(h)
    ax.add_patch(Polygon([(cx - w_du / 2, cy - h_du / 2), (cx + w_du / 2, cy - h_du / 2),
                          (cx + w_du / 2, cy + h_du / 2), (cx - w_du / 2, cy + h_du / 2)],
                         closed=True, facecolor='white', edgecolor='black', linewidth=1.4, zorder=4))
    header_h = pt2du(pt_size(name, FS_ENTITY)[1] + 6)
    ax.add_patch(Polygon([(cx - w_du / 2, cy + h_du / 2 - header_h), (cx + w_du / 2, cy + h_du / 2 - header_h),
                          (cx + w_du / 2, cy + h_du / 2), (cx - w_du / 2, cy + h_du / 2)],
                         closed=True, facecolor='black', edgecolor='black', linewidth=1.2, zorder=5))
    ax.text(cx, cy + h_du / 2 - header_h / 2, name, ha='center', va='center',
            fontsize=FS_ENTITY, color='white', weight='bold', zorder=6)
    body_top = cy + h_du / 2 - header_h
    field_h = pt2du(FS_FIELD * 1.40)
    for i, (f, note) in enumerate(fields):
        y = body_top - field_h * (i + 0.5)
        ax.text(cx, y, f, ha='left', va='center', fontsize=FS_FIELD, zorder=6)
        if note:
            ax.text(cx - w_du / 2 + 4.5, y, note[0], ha='left', va='center',
                    fontsize=FS_FIELD, weight='bold', zorder=6)
        if '(PK)' in note or '(UQ)' in note:
            ax.plot([cx - w_du / 2 + 2, cx + w_du / 2 - 2], [y, y], color='black', linewidth=0.8, zorder=7)


def er_line(ax, x1, y1, x2, y2, label=None, card_from='1', card_to='N'):
    ax.plot([x1, x2], [y1, y2], color='black', linewidth=1.1, zorder=3)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    if label:
        ax.text(mx, my, label, ha='center', va='center', fontsize=FS_CARD,
                style='italic', zorder=6, bbox=dict(facecolor='white', edgecolor='none', pad=1.2))
    dx, dy = x2 - x1, y2 - y1
    L = (dx * dx + dy * dy) ** 0.5
    if L < 1:
        return
    ux, uy = dx / L, dy / L
    px, py = uy, -ux
    ax.text(x1 + ux * 6 + px * 3, y1 + uy * 6 + py * 3, card_from, ha='center', va='center',
            fontsize=FS_CARD, weight='bold', zorder=6)
    ax.text(x2 - ux * 6 + px * 3, y2 - uy * 6 + py * 3, card_to, ha='center', va='center',
            fontsize=FS_CARD, weight='bold', zorder=6)


# REAL entities from backend/src/models/*.ts (15 collections)
ER_ENTITIES = [
    ('Users', [('_id', '(PK)'), ('name', ''), ('email', '(UQ)'), ('phone', '(UQ)'),
               ('passwordHash', ''), ('role USER/ADMIN/RESPONDER', ''), ('language', ''),
               ('isActive', ''), ('timestamps', '')]),
    ('Locations', [('_id', '(PK)'), ('latitude', ''), ('longitude', ''), ('address', ''),
                   ('city', ''), ('district', ''), ('state', ''), ('postalCode', ''),
                   ('country', ''), ('accuracy', ''), ('timestamps', '')]),
    ('Incidents', [('_id', '(PK)'), ('userId', '(FK)'), ('type Safety/Disaster', ''),
                   ('category', ''), ('description', ''), ('priority LOW..CRITICAL', ''),
                   ('status REPORTED..CLOSED', ''), ('locationId (opt)', '(FK)'),
                   ('resolvedAt', ''), ('timestamps', '')]),
    ('EmergencyContacts', [('_id', '(PK)'), ('userId', '(FK)'), ('name', ''),
                           ('phone', ''), ('email (opt)', ''), ('relationship', ''),
                           ('notifyViaSms', ''), ('notifyViaEmail', ''), ('isPrimary', ''),
                           ('timestamps', '')]),
    ('Facilities', [('_id', '(PK)'), ('name', ''), ('facilityType', ''),
                    ('locationId', '(FK)'), ('phone', ''), ('capacity (opt)', ''),
                    ('isOperational', ''), ('operatingHours (opt)', ''), ('timestamps', '')]),
    ('RescueTeams', [('_id', '(PK)'), ('name', ''), ('teamType', ''),
                     ('phone', ''), ('email (opt)', ''), ('isActive', ''),
                     ('specializations[]', ''), ('members[] (Users)', '(FK)'),
                     ('locationId (opt)', '(FK)'), ('timestamps', '')]),
    ('IncidentUpdates', [('_id', '(PK)'), ('incidentId', '(FK)'), ('updatedBy', '(FK)'),
                         ('statusFrom (opt)', ''), ('statusTo', ''), ('comment (opt)', ''),
                         ('createdAt', '')]),
    ('UnsafeAreaReports', [('_id', '(PK)'), ('reportedBy', '(FK)'), ('locationId', '(FK)'),
                           ('category', ''), ('description', ''), ('severity', ''),
                           ('isVerified', ''), ('timestamps', '')]),
    ('RescueAssignments', [('_id', '(PK)'), ('incidentId', '(FK)'), ('teamId', '(FK)'),
                           ('assignedBy', '(FK)'), ('assignedAt', ''),
                           ('status ASSIGNED..CANCELLED', ''), ('notes (opt)', ''),
                           ('timestamps', '')]),
    ('Notifications', [('_id', '(PK)'), ('incidentId', '(FK)'), ('contactId (opt)', '(FK)'),
                       ('channel Email/SMS/WP/InApp', ''), ('status QUEUED..Unavail', ''),
                       ('providerResponse (opt)', ''), ('attemptCount', ''),
                       ('lastAttemptAt (opt)', ''), ('timestamps', '')]),
    ('RiskAssessments', [('_id', '(PK)'), ('locationId', '(FK)'), ('riskScore 0-100', ''),
                         ('riskLevel LOW..CRITICAL', ''), ('modelVersion', ''),
                         ('inputFactors[]', ''), ('assessedAt', ''), ('timestamps', '')]),
    ('RiskZones', [('_id', '(PK)'), ('name', ''), ('riskLevel', ''), ('geometry', ''),
                   ('factors[]', ''), ('lastAssessedAt (opt)', ''), ('isActive', ''),
                   ('timestamps', '')]),
    ('AdminLogs', [('_id', '(PK)'), ('adminId', '(FK)'), ('action', ''),
                   ('targetType', ''), ('targetId (opt)', ''), ('details (opt)', ''),
                   ('ipAddress (opt)', ''), ('createdAt', '')]),
    ('Reports', [('_id', '(PK)'), ('generatedBy', '(FK)'), ('title', ''),
                 ('reportType', ''), ('filters (opt)', ''), ('dataSnapshot (opt)', ''),
                 ('format PDF/CSV/JSON', ''), ('expiresAt (opt)', ''), ('createdAt', '')]),
    ('DisasterCategories', [('_id', '(PK)'), ('name', ''), ('code', '(UQ)'),
                            ('description (opt)', ''), ('defaultPriority', ''),
                            ('requiresResponseTeam', ''), ('isActive', ''),
                            ('timestamps', '')]),
]

# REAL relationships derived from ref: fields in the schemas
ER_RELS = [
    ('Users', 'Incidents', 'reports (userId)', '1', 'N'),
    ('Users', 'EmergencyContacts', 'owns (userId)', '1', 'N'),
    ('Users', 'UnsafeAreaReports', 'reports (reportedBy)', '1', 'N'),
    ('Users', 'IncidentUpdates', 'updates (updatedBy)', '1', 'N'),
    ('Users', 'RescueAssignments', 'assigns (assignedBy)', '1', 'N'),
    ('Users', 'AdminLogs', 'performs (adminId)', '1', 'N'),
    ('Users', 'Reports', 'generates (generatedBy)', '1', 'N'),
    ('Users', 'RescueTeams', 'member of (members[])', 'N', 'M'),
    ('Locations', 'Incidents', 'located at (locationId)', '1', 'N'),
    ('Locations', 'Facilities', 'located at (locationId)', '1', 'N'),
    ('Locations', 'RescueTeams', 'located at (locationId)', '1', 'N'),
    ('Locations', 'UnsafeAreaReports', 'located at (locationId)', '1', 'N'),
    ('Locations', 'RiskAssessments', 'assessed for (locationId)', '1', 'N'),
    ('Incidents', 'IncidentUpdates', 'has log (incidentId)', '1', 'N'),
    ('Incidents', 'RescueAssignments', 'assigned (incidentId)', '1', 'N'),
    ('Incidents', 'Notifications', 'triggers (incidentId)', '1', 'N'),
    ('EmergencyContacts', 'Notifications', 'notified via (contactId)', '1', 'N'),
    ('RescueTeams', 'RescueAssignments', 'receives (teamId)', '1', 'N'),
]


def build_er():
    grid = {
        'Users': (2, 0), 'Locations': (2, 2), 'Incidents': (2, 4),
        'EmergencyContacts': (1, 0), 'Facilities': (1, 1), 'RiskZones': (1, 2),
        'UnsafeAreaReports': (0, 0), 'RescueTeams': (1, 3), 'IncidentUpdates': (0, 4),
        'RescueAssignments': (1, 4), 'Notifications': (0, 3), 'RiskAssessments': (0, 2),
        'AdminLogs': (0, 1), 'Reports': (2, 1), 'DisasterCategories': (2, 3),
    }
    sizes = {n: size_entity(n, f) for n, f in ER_ENTITIES}
    NCOLS, NROWS = 5, 3
    XM, YM = 10.0, 11.0
    fig, ax = make_fig(xlim=100, ylim=118,
                       title='Figure 4.4: RakshaSafe Entity-Relationship Diagram (15 MongoDB Collections)')
    col_w = {}
    for n, (r, c) in grid.items():
        col_w[c] = max(col_w.get(c, 0), pt2du(sizes[n][0]))
    row_h = {}
    for n, (r, c) in grid.items():
        row_h[r] = max(row_h.get(r, 0), pt2du(sizes[n][1]))
    xs = {}
    xcur = XM
    for c in range(NCOLS):
        xs[c] = xcur + col_w.get(c, 20) / 2
        xcur += col_w.get(c, 20) + 3.5
    ys = {}
    ycur = 110.0
    for r in range(NROWS)[::-1]:
        ys[r] = ycur - row_h.get(r, 20) / 2
        ycur -= row_h.get(r, 20) + 8.0
    centers = {n: (xs[c], ys[r]) for n, (r, c) in grid.items()}
    E = dict(ER_ENTITIES)
    for n, f in E.items():
        draw_entity(ax, centers[n][0], centers[n][1], n, f, sizes[n][0], sizes[n][1], None)
    for a, b, lbl, ca, cb in ER_RELS:
        er_line(ax, centers[a][0], centers[a][1], centers[b][0], centers[b][1],
                label=lbl, card_from=ca, card_to=cb)
    save(fig, os.path.join(OUT, 'bw_4_4_er_diagram.png'))


# ================================================================ DFD ==========
def draw_process(ax, cx, cy, num, name, r=8.2):
    ax.add_patch(Circle((cx, cy), r, facecolor='white', edgecolor='black', linewidth=1.4, zorder=4))
    ax.text(cx, cy + r * 0.55, num, ha='center', va='center', fontsize=FS_PROC, weight='bold', zorder=6)
    ax.text(cx, cy - r * 0.20, wrap(name, 150, FS_PROC), ha='center', va='center', fontsize=FS_PROC, zorder=6)


def draw_store(ax, cx, cy, num, name, w_pt=64):
    w, h = pt2du(w_pt), pt2du(pt_size(name, FS_STORE)[1] + 9)
    ax.plot([cx - w / 2, cx - w / 2], [cy - h / 2, cy + h / 2], color='black', linewidth=1.3, zorder=4)
    ax.plot([cx + w / 2, cx + w / 2], [cy - h / 2, cy + h / 2], color='black', linewidth=1.3, zorder=4)
    ax.plot([cx - w / 2, cx + w / 2], [cy - h / 2, cy - h / 2], color='black', linewidth=1.3, zorder=4)
    ax.text(cx - w / 2 + 2.2, cy, num + '  ' + name, ha='left', va='center', fontsize=FS_STORE, zorder=6)


def draw_ext(ax, cx, cy, name, w_pt=70):
    w, h = pt2du(w_pt), pt2du(pt_size(name, FS_EXT)[1] + 9)
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle='square,pad=0.12',
                                facecolor='white', edgecolor='black', linewidth=1.4, zorder=4))
    ax.text(cx, cy, name, ha='center', va='center', fontsize=FS_EXT, zorder=6)


def dfd_flow(ax, x1, y1, x2, y2, label=None, dash=False):
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
        ax.text((x1 + x2) / 2 + 1.5, (y1 + y2) / 2, label, ha='left', va='center',
                fontsize=FS_FLOW, style='italic', zorder=6,
                bbox=dict(facecolor='white', edgecolor='none', pad=0.8))


def build_dfd0():
    fig, ax = make_fig(xlim=100, ylim=92,
                       title='Figure 4.5: Data Flow Diagram Level 0 (Context)')
    cx, cy = 50, 44
    ax.add_patch(Circle((cx, cy), 15.5, facecolor='white', edgecolor='black', linewidth=1.8, zorder=4))
    ax.text(cx, cy + 3, 'RAKSHA SAFE', ha='center', va='center', fontsize=11, weight='bold', zorder=6)
    ax.text(cx, cy - 5, 'Emergency Response', ha='center', va='center', fontsize=8.5, zorder=6)
    ax.text(cx, cy - 11, 'System (1.0)', ha='center', va='center', fontsize=8.5, zorder=6)
    ext = [
        ('USER (Citizen)', 8, 80, 64), ('ADMINISTRATOR', 8, 44, 70),
        ('WEATHER API', 8, 8, 58), ('RESPONDER (Rescue Team)', 92, 82, 70),
        ('OPENSTREETMAP\nOverpass + Nominatim', 92, 44, 90),
        ('AI RISK SERVICE\n(raksha-risk-v1)', 92, 8, 86),
    ]
    for n, x, y, w in ext:
        draw_ext(ax, x, y, n, w)
    flows = [
        (10, 73, cx - 12, cy + 6, 'credentials, SOS, contacts,\nunsafe-area report, GPS', False, 'left'),
        (cx - 10, cy - 2, 10, 73, 'JWT session, incident status,\nnotifications, nearby list', True, 'left'),
        (cx - 10, cy - 4, 10, 46, 'login, manage users / incidents /\nteams, generate reports', False, 'left'),
        (10, 42, cx - 10, cy + 4, 'dashboard stats, queues,\nreports, audit trail', True, 'left'),
        (cx - 6, cy - 11, 10, 10, 'incident coordinates', False, 'left'),
        (10, 6, cx - 6, cy - 11, 'current weather data', True, 'left'),
        (92, 74, cx + 11, cy + 6, 'login, assignment status update', False, 'right'),
        (cx + 10, cy - 2, 92, 74, 'assigned incidents,\nnotifications', True, 'right'),
        (cx + 10, cy - 4, 92, 46, 'nearby facility query /\nreverse geocode', False, 'right'),
        (92, 42, cx + 10, cy + 4, 'facility list + distance,\naddress', True, 'right'),
        (cx + 6, cy - 11, 92, 10, 'incident inputs +\nlocation factors', False, 'right'),
        (92, 6, cx + 6, cy - 11, 'risk score + level', True, 'right'),
    ]
    for x1, y1, x2, y2, lbl, dash, _side in flows:
        dfd_flow(ax, x1, y1, x2, y2, lbl, dash)
    save(fig, os.path.join(OUT, 'bw_4_5_dfd_level0.png'))


def build_dfd1_user():
    fig, ax = make_fig(xlim=100, ylim=92,
                       title='Figure 4.6: Data Flow Diagram Level 1 - User Domain')
    procs = [
        ('1.0', 'Account &\nAccess', 16, 66), ('2.0', 'Incident (SOS)\nManagement', 42, 66),
        ('3.0', 'Emergency\nContacts', 68, 66), ('4.0', 'Resource\nDirectory', 92, 62),
        ('5.0', 'Unsafe-Area\nReporting', 24, 32), ('6.0', 'Notification\nFeed', 52, 32),
    ]
    for num, name, x, y in procs:
        draw_process(ax, x, y, num, name)
    stores = [
        ('D1', 'Users', 10, 6), ('D2', 'Locations', 26, 6), ('D3', 'Incidents', 42, 6),
        ('D4', 'IncidentUpdates', 57, 6), ('D5', 'EmergencyContacts', 72, 6),
        ('D6', 'Notifications', 88, 6), ('D7', 'Facilities', 78, 34),
        ('D8', 'RescueTeams', 94, 40), ('D9', 'UnsafeAreaReports', 36, 6),
        ('D10', 'RiskAssessments', 6, 34), ('D11', 'RiskZones', 14, 34),
    ]
    for num, name, x, y in stores:
        draw_store(ax, x, y, num, name)
    draw_ext(ax, 4, 84, 'USER', 60)
    flows = [
        (6, 78, 15, 74, 'credentials', False), (6, 78, 40, 72, 'SOS + GPS', False),
        (6, 78, 68, 72, 'contacts data', False), (6, 78, 26, 36, 'unsafe report', False),
        (10, 60, 14, 42, 'reads', True), (44, 60, 44, 12, 'store incident', False),
        (42, 60, 56, 12, 'store updates', False), (66, 60, 74, 12, 'store', False),
        (40, 66, 36, 40, 'writes', False), (70, 62, 88, 46, 'feedback', True),
        (54, 38, 80, 40, 'read', True), (26, 36, 36, 12, 'store', False),
        (20, 30, 12, 12, 'store', False), (48, 36, 82, 12, 'deliver', True),
        (38, 66, 10, 50, 'log', True),
    ]
    for x1, y1, x2, y2, lbl, dash in flows:
        dfd_flow(ax, x1, y1, x2, y2, lbl, dash)
    save(fig, os.path.join(OUT, 'bw_4_6_dfd_level1_user.png'))


def build_dfd1_admin():
    fig, ax = make_fig(xlim=100, ylim=92,
                       title='Figure 4.6: Data Flow Diagram Level 1 - Admin Domain')
    procs = [
        ('1.0', 'Dashboard &\nAnalytics', 16, 66), ('2.0', 'Incident\nAdministration', 42, 66),
        ('3.0', 'User &\nContact Admin', 68, 66), ('4.0', 'Master Data\n(Facilities / Teams)', 93, 58),
        ('5.0', 'Unsafe-Report\nModeration + Risk', 26, 32), ('6.0', 'Reports\n& Audit', 54, 32),
    ]
    for num, name, x, y in procs:
        draw_process(ax, x, y, num, name)
    stores = [
        ('D1', 'Users', 10, 6), ('D2', 'Incidents', 27, 6), ('D3', 'Locations', 42, 6),
        ('D4', 'IncidentUpdates', 57, 6), ('D5', 'RescueTeams', 72, 6),
        ('D6', 'RescueAssignments', 88, 6), ('D7', 'Facilities', 76, 34),
        ('D8', 'UnsafeAreaReports', 38, 6), ('D9', 'RiskAssessments', 6, 34),
        ('D10', 'Reports', 66, 34), ('D11', 'AdminLogs', 92, 42), ('D12', 'Notifications', 52, 6),
    ]
    for num, name, x, y in stores:
        draw_store(ax, x, y, num, name)
    draw_ext(ax, 96, 84, 'ADMINISTRATOR', 60)
    flows = [
        (93, 78, 16, 72, 'login', False), (93, 78, 44, 72, 'manage incidents', False),
        (93, 78, 70, 72, 'manage users', False), (93, 78, 94, 64, 'facility/team CRUD', False),
        (93, 78, 27, 38, 'moderate + verify', False), (93, 78, 56, 38, 'generate reports', False),
        (20, 60, 12, 12, 'stats (read)', True), (46, 60, 42, 12, 'write', False),
        (44, 60, 57, 12, 'write', False), (44, 60, 52, 12, 'write notify', False),
        (45, 60, 88, 48, 'assign', False), (72, 60, 72, 12, 'write', False),
        (30, 60, 88, 12, 'write', False), (28, 38, 38, 12, 'store', False),
        (20, 30, 8, 12, 'store', False), (60, 36, 66, 40, 'report data', True),
        (58, 38, 92, 48, 'audit log', False), (56, 38, 72, 36, 'read', True),
        (70, 60, 76, 40, 'read', True), (44, 60, 10, 40, 'read users', True),
    ]
    for x1, y1, x2, y2, lbl, dash in flows:
        dfd_flow(ax, x1, y1, x2, y2, lbl, dash)
    save(fig, os.path.join(OUT, 'bw_4_7_dfd_level1_admin.png'))


def build_dfd2_user():
    fig, ax = make_fig(xlim=100, ylim=88,
                       title='Figure 4.7: Data Flow Diagram Level 2 - SOS Creation (User)')
    procs = [
        ('2.1', 'Input SOS\ndetails', 14, 66), ('2.2', 'Resolve\nLocation', 36, 66),
        ('2.3', 'Review\nRequest', 58, 66), ('2.4', 'Create\nIncident', 80, 58),
        ('2.5', 'Assess\nRisk', 30, 24), ('2.6', 'Notify\nContacts', 64, 24),
    ]
    for num, name, x, y in procs:
        draw_process(ax, x, y, num, name)
    stores = [
        ('D2', 'Locations', 20, 6), ('D3', 'Incidents', 40, 6),
        ('D5', 'EmergencyContacts', 62, 6), ('D6', 'Notifications', 80, 6),
        ('D10', 'RiskAssessments', 6, 44), ('D11', 'RiskZones', 6, 24),
    ]
    for num, name, x, y in stores:
        draw_store(ax, x, y, num, name)
    draw_ext(ax, 6, 82, 'USER', 56)
    draw_ext(ax, 88, 82, 'OSM / Nominatim', 66)
    draw_ext(ax, 94, 40, 'AI RISK\nSERVICE', 60)
    flows = [
        (9, 76, 13, 72, 'type, category, description,\npriority', False),
        (20, 60, 34, 60, 'GPS / without location', False),
        (34, 60, 66, 60, 'confirm request', False),
        (58, 60, 70, 60, 'submit', False),
        (42, 60, 20, 48, 'reverse geocode', False),
        (40, 54, 12, 50, 'store location', False),
        (82, 52, 86, 44, 'risk request', False),
        (90, 44, 86, 44, '', False),
        (34, 38, 77, 34, 'risk result', True),
        (82, 52, 80, 12, 'store incident', False),
        (66, 60, 62, 12, 'store sent', False),
        (40, 64, 26, 20, 'risk factors', False),
        (13, 52, 16, 32, 'also read risk zone', True),
        (62, 62, 60, 34, '', True),
    ]
    for x1, y1, x2, y2, lbl, dash in flows:
        dfd_flow(ax, x1, y1, x2, y2, lbl, dash)
    save(fig, os.path.join(OUT, 'bw_4_8_dfd_level2_user.png'))


def build_dfd2_admin():
    fig, ax = make_fig(xlim=100, ylim=88,
                       title='Figure 4.8: Data Flow Diagram Level 2 - Incident Administration (Admin)')
    procs = [
        ('2.1', 'Review\nIncident Queue', 16, 66), ('2.2', 'Assign\nRescue Team', 40, 66),
        ('2.3', 'Update\nStatus', 64, 66), ('2.4', 'Review AI\nRisk Result', 87, 52),
        ('2.5', 'Write Audit\nTrail', 88, 22),
    ]
    for num, name, x, y in procs:
        draw_process(ax, x, y, num, name)
    stores = [
        ('D2', 'Incidents', 18, 6), ('D4', 'IncidentUpdates', 36, 6),
        ('D5', 'RescueTeams', 54, 6), ('D6', 'RescueAssignments', 72, 6),
        ('D9', 'RiskAssessments', 12, 28), ('D11', 'AdminLogs', 90, 6),
        ('D12', 'Notifications', 46, 22),
    ]
    for num, name, x, y in stores:
        draw_store(ax, x, y, num, name)
    draw_ext(ax, 6, 84, 'ADMINISTRATOR', 62)
    flows = [
        (10, 78, 16, 74, 'view queue (filter status / priority)', False),
        (22, 60, 38, 60, 'assign team', False),
        (46, 60, 62, 60, 'status transition', False),
        (70, 60, 86, 58, 'risk result + updates', False),
        (66, 60, 54, 12, 'store update', False),
        (20, 60, 18, 12, 'write', False),
        (36, 60, 72, 12, 'write', False),
        (40, 66, 54, 12, 'store', False),
        (42, 60, 46, 28, 'notify (write)', False),
        (86, 46, 90, 12, 'write', False),
        (87, 46, 14, 34, 'read', True),
        (30, 66, 14, 34, 'read', True),
        (18, 72, 12, 44, '', True),
    ]
    for x1, y1, x2, y2, lbl, dash in flows:
        dfd_flow(ax, x1, y1, x2, y2, lbl, dash)
    save(fig, os.path.join(OUT, 'bw_4_9_dfd_level2_admin.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    build_er()
    build_dfd0()
    build_dfd1_user()
    build_dfd1_admin()
    build_dfd2_user()
    build_dfd2_admin()
    print('REAL ER + DFD (L0/L1-user/L1-admin/L2-user/L2-admin) done')