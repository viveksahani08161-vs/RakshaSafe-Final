"""Generate colorful Chapter 4 images:
14 flowcharts (matplotlib) + 14 dummy interface screenshots (PIL)
+ system architecture + deployment diagrams. Output -> documentation/ch4_images/
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon
from matplotlib.lines import Line2D
from PIL import Image, ImageDraw, ImageFont

OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_images'
os.makedirs(OUT, exist_ok=True)

SEGOE = r'C:\Windows\Fonts\segoeui.ttf'
SEGOEB = r'C:\Windows\Fonts\segoeuib.ttf'
ARIAL = r'C:\Windows\Fonts\arial.ttf'
ARIALB = r'C:\Windows\Fonts\arialbd.ttf'
FB = r'C:\Windows\Fonts\seguisb.ttf'

# ---------------------------------------------------------------- flowcharts
BLUE = '#2E86DE'
BLUE_F = '#D6EAF8'
GREEN = '#229954'
GREEN_F = '#D5F5E3'
AMBER = '#B9770E'
AMBER_F = '#FDEBD0'
RED = '#C0392B'
RED_F = '#FADBD8'
INK = '#17202A'
EDGE = '#34495E'


def slot(x, y, w, h, text, fc, ec, dtype='rect'):
    sh = {'rect': 'round4', 'oval': 'round4', 'diamond': 'round4'}[dtype]
    if dtype == 'diamond':
        d = Polygon([[x, y], [x + w / 2, y + h / 2], [x, y + h], [x - w / 2, y + h / 2]],
                    fc=fc, ec=ec, lw=1.6, zorder=3)
        return d
    p = FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle=f'{sh},pad=0.02,rounding_size=0.08',
                       fc=fc, ec=ec, lw=1.6, zorder=3)
    return p


def flow_image(fname, title, steps):
    """steps: list of (kind, text). kind in start|proc|dec|data|end
    Vertical flow; a dec spawns 'Yes' down / 'No' to right-error box."""
    n = len(steps)
    W = 9.5
    H = 1.6 + n * 1.25
    fig, ax = plt.subplots(figsize=(W, H), dpi=170)
    ax.set_xlim(0, W); ax.set_ylim(0, H)
    ax.axis('off')
    ax.text(W / 2, H - 0.35, title, ha='center', va='center', fontsize=15, weight='bold', color=INK)
    node_y = H - 1.15
    cy = H - 1.15
    step_h = (cy + 0.4) / max(n, 1)
    ys = [cy - i * step_h for i in range(n)]
    coords = {}
    for i, (kind, text) in enumerate(steps):
        x, y = W / 2, ys[i]
        if kind == 'start':
            p = slot(x, y, 2.4, 0.75, '', GREEN_F, GREEN)
            coords[i] = (x, y, 'start')
        elif kind == 'end':
            p = slot(x, y, 2.6, 0.8, '', RED_F, RED)
            coords[i] = (x, y, 'end')
        elif kind == 'proc':
            p = slot(x, y, 4.6, 0.85, '', BLUE_F, BLUE)
            coords[i] = (x, y, 'proc')
        elif kind == 'dec':
            p = slot(x, y, 3.4, 1.15, '', AMBER_F, AMBER, 'diamond')
            coords[i] = (x, y, 'dec')
        else:  # data
            p = slot(x, y, 4.6, 0.85, '', '#E8DAEF', '#8E44AD')
            coords[i] = (x, y, 'data')
        ax.add_patch(p)
        fs = 10.2 if kind == 'dec' else 11
        ax.text(x, y, text, ha='center', va='center', fontsize=fs, color=INK, zorder=4, linespacing=1.15)
    # arrows
    axs = []
    for i in range(n - 1):
        x0, y0, k0 = coords[i]
        x1, y1, k1 = coords[i + 1]
        axs.append(FancyArrowPatch((x0, y0 - 0.55), (x1, y1 + 0.5), arrowstyle='-|>',
                                   mutation_scale=16, lw=1.7, color=EDGE, zorder=2))
        ax.add_patch(axs[-1])
    # decision 'No' branches
    for i, (kind, text) in enumerate(steps):
        if kind == 'dec':
            x, y, _ = coords[i]
            errx, erry = W - 1.75, y
            ax.add_patch(FancyBboxPatch((errx - 1.35, erry - 0.28), 2.7, 0.56,
                                        boxstyle='round4,pad=0.02,rounding_size=0.06',
                                        fc=RED_F, ec=RED, lw=1.4, zorder=3))
            ax.text(errx, erry, 'No -> reject / retry', fontsize=8.4, ha='center', va='center',
                    color=RED, zorder=4)
            # elbow arrow
            ax.add_patch(FancyArrowPatch((x + 1.75, erry), (errx - 1.35, erry),
                                         arrowstyle='-|>', mutation_scale=15, lw=1.5,
                                         color=RED, zorder=2, linestyle='--'))
            ax.text(x + 1.0, erry + 0.22, 'No', ha='center', fontsize=8.5, color=RED, weight='bold')
            ax.text(x + 1.0, erry + 0.44, 'Yes \u2193', ha='center', fontsize=8.5, color=GREEN, weight='bold')
    fig.tight_layout(pad=0.4)
    fig.savefig(os.path.join(OUT, fname), facecolor='white')
    plt.close(fig)
    print('flow', fname)


# ------------------------------------------------------------------ screenshots
def F(path, size, bold=False, italic=False):
    try:
        if bold:
            f = r'C:\Windows\Fonts\segoeuib.ttf' if not italic else r'C:\Windows\Fonts\segoeuiz.ttf'
            return ImageFont.truetype(f, size)
        f = r'C:\Windows\Fonts\segoeui.ttf' if not italic else r'C:\Windows\Fonts\segoeuii.ttf'
        return ImageFont.truetype(f, size)
    except Exception:
        return ImageFont.truetype(ARIALB if bold else ARIAL, size)


def rr(d, xy, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def window_base(W=1180, H=760, brand='RakshaSafe', links=('SOS', 'Resources', 'Contacts', 'Profile')):
    img = Image.new('RGB', (W, H), '#F4F6F7')
    d = ImageDraw.Draw(img)
    # browser bar
    d.rectangle([0, 0, W, 34], fill='#2C3E50')
    for i, c in enumerate(('#FF5F57', '#FEBC2E', '#28C840')):
        d.ellipse([12 + i * 22, 11, 22 + i * 22, 21], fill=c)
    d.text((78, 8), 'rakhashafe - secure emergency workspace', font=F(SEGOE, 14), fill='#BDC3C7')
    # top brand band
    d.rectangle([0, 34, W, 92], fill='#1B4F72')
    d.ellipse([22, 48, 62, 88], fill='#2ECC71')
    d.text((24, 55), 'R', font=F(SEGOEB, 30), fill='white')
    d.text((72, 55), brand, font=F(SEGOEB, 24), fill='white')
    if links:
        x0 = W - 30
        for link in reversed(links):
            w = d.textlength(link, font=F(SEGOE, 17))
            d.text((x0 - w, 60), link, font=F(SEGOE, 17), fill='#AED6F1')
            x0 -= w + 30
    return img, d


def text(d, xy, s, f=None, fill='#17202A'):
    d.text(xy, s, font=f or F(SEGOE, 16), fill=fill)


def field(d, xy, w, label, ph=''):
    x, y = xy
    text(d, (x, y), label, f=F(SEGOE, 14), fill='#5D6D7E')
    rr(d, [x, y + 18, x + w, y + 52], 6, fill='white', outline='#7F8C8D', width=1)
    if ph:
        text(d, (x + 12, y + 25), ph, f=F(SEGOE, 15), fill='#AEB6BF')


def button(d, xy, w, s, fill='#2E86C1', h=46, fg='white'):
    x, y = xy
    rr(d, [x, y, x + w, y + h], 8, fill=fill)
    tw = d.textlength(s, font=F(SEGOEB, 16))
    text(d, (x + (w - tw) / 2, y + 11), s, f=F(SEGOEB, 16), fill=fg)


def card(d, xy, wh, title=None, fill='white'):
    x, y = xy
    w, h = wh
    rr(d, [x, y, x + w, y + h], 10, fill=fill, outline='#D5D8DC', width=1)
    if title:
        d.rectangle([x + 0, y + 0, x + w, y + 40], fill='#EBF5FB')
        text(d, (x + 16, y + 9), title, f=F(SEGOEB, 16), fill='#1B4F72')
    return x, y, w, h


def badge(d, xy, s, fill='#2ECC71', fg='white'):
    x, y = xy
    w = d.textlength(s, font=F(SEG, 13)) + 18 if False else d.textlength(s, font=F(SEGOE, 13)) + 18
    rr(d, [x, y, x + w, y + 24], 12, fill=fill)
    text(d, (x + 9, y + 5), s, f=F(SEGOE, 13), fill=fg)


def save(img, fname):
    img.save(os.path.join(OUT, fname))
    print('shot', fname)


# ============================================================ FLOWCHARTS
FLOWS = [
    ('flow_4_2_1_login.png', 'Flowchart 4.2.1: Login',
     [('start', 'User opens Login page'),
      ('proc', 'Enter email / phone and password'),
      ('dec', 'Valid credentials?'),
      ('proc', 'Account active?'),
      ('proc', 'Create JWT session'),
      ('dec', 'Role: USER / ADMIN / RESPONDER?'),
      ('end', 'Redirect to role dashboard')]),
    ('flow_4_2_2_registration.png', 'Flowchart 4.2.2: Registration',
     [('start', 'User opens Registration page'),
      ('proc', 'Enter name, email, phone, password'),
      ('dec', 'Fields valid & unique?'),
      ('proc', 'Hash password (bcrypt)'),
      ('proc', 'Create USER account'),
      ('proc', 'Create session'),
      ('end', 'Open user dashboard')]),
    ('flow_4_2_3_user_dashboard.png', 'Flowchart 4.2.3: User Dashboard',
     [('start', 'User signs in'),
      ('proc', 'Load own incidents & notifications'),
      ('proc', 'Render stat summary + quick actions'),
      ('dec', 'Open incident detail?'),
      ('proc', 'Show timeline, location, risk'),
      ('end', 'Continue using dashboard')]),
    ('flow_4_2_4_sos.png', 'Flowchart 4.2.4: SOS Creation',
     [('start', 'User opens SOS page'),
      ('proc', 'Select type, category, description, priority'),
      ('dec', 'Use My Location?'),
      ('proc', 'Capture device coordinates'),
      ('dec', 'Coordinates valid?'),
      ('proc', 'Submit incident'),
      ('end', 'Stored as REPORTED + reference shown')]),
    ('flow_4_2_5_incident_detail.png', 'Flowchart 4.2.5: Incident Detail',
     [('start', 'Open an incident'),
      ('proc', 'Load facts, location, history'),
      ('proc', 'Load nearby resources + weather'),
      ('dec', 'Assignable team attached?'),
      ('proc', 'Show assignment + team contact'),
      ('dec', 'REPORTED/ACKNOWLEDGED & unassigned?'),
      ('end', 'Allow edit / delete')]),
    ('flow_4_2_6_contacts.png', 'Flowchart 4.2.6: Emergency Contacts',
     [('start', 'Open Emergency Contacts'),
      ('proc', 'Add / edit contact form'),
      ('dec', 'Phone valid & normalised?'),
      ('dec', 'Only one primary per user?'),
      ('proc', 'Save to Mongo'),
      ('end', 'Contact list refreshed')]),
    ('flow_4_2_7_resources.png', 'Flowchart 4.2.7: Resource Lookup',
     [('start', 'Open Resources'),
      ('proc', 'Enter search term / filters'),
      ('dec', 'Use current location?'),
      ('proc', 'Query stored facilities + providers'),
      ('proc', 'Sort by distance'),
      ('end', 'Show call + directions cards')]),
    ('flow_4_2_8_unsafe.png', 'Flowchart 4.2.8: Unsafe Reporting',
     [('start', 'Open Unsafe Area Report'),
      ('proc', 'Choose category, severity, description'),
      ('dec', 'Location attached?'),
      ('proc', 'Validate coordinates'),
      ('proc', 'Submit report'),
      ('end', 'Stored unverified, queued for admin')]),
    ('flow_4_2_9_risk.png', 'Flowchart 4.2.9: Risk Assessment',
     [('start', 'Open incident with location'),
      ('proc', 'Click Assess Risk'),
      ('proc', 'Backend counts nearby factors'),
      ('data', 'POST /risk/assess (FastAPI)'),
      ('dec', 'Response valid (0-100, enum level)?'),
      ('proc', 'Store RiskAssessment + show panel'),
      ('end', 'Decision-support disclaimer shown')]),
    ('flow_4_2_10_notifications.png', 'Flowchart 4.2.10: Notifications',
     [('start', 'Open Notifications'),
      ('proc', 'Load own notification records'),
      ('proc', 'Show channel + status badges'),
      ('dec', 'Open linked incident?'),
      ('proc', 'Show incident context'),
      ('proc', 'Mark entry read'),
      ('end', 'Continue scanning')]),
    ('flow_4_2_11_profile.png', 'Flowchart 4.2.11: Profile',
     [('start', 'Open Profile'),
      ('proc', 'Edit name, email, phone, language'),
      ('dec', 'Valid & unique values?'),
      ('proc', 'Save changes'),
      ('proc', 'Confirm updated account'),
      ('end', 'Sign out / continue')]),
    ('flow_4_2_12_admin_dashboard.png', 'Flowchart 4.2.12: Admin Dashboard',
     [('start', 'Admin signs in'),
      ('proc', 'Query users, incidents, status breaks'),
      ('proc', 'Render counters + activity feed'),
      ('dec', 'Drill into incident?'),
      ('proc', 'Show incident + risk + assignments'),
      ('end', 'Continue administration')]),
    ('flow_4_2_13_admin_incidents.png', 'Flowchart 4.2.13: Admin Incidents',
     [('start', 'Open admin incident list'),
      ('proc', 'Filter by status / priority / text'),
      ('dec', 'Update status workflow legal?'),
      ('proc', 'Write IncidentUpdates + AdminLog'),
      ('dec', 'Assign rescue team?'),
      ('proc', 'Create ASSIGNED assignment'),
      ('end', 'Review detail / resolve')]),
    ('flow_4_2_14_admin_masters.png', 'Flowchart 4.2.14: Admin Masters',
     [('start', 'Open admin master screen'),
      ('proc', 'Facilities / teams / users / reports'),
      ('dec', 'Action permitted (requireAdmin)?'),
      ('proc', 'Create / edit / verify record'),
      ('proc', 'Log action to AdminLogs'),
      ('end', 'List refreshed')]),
]

for fn, title, steps in FLOWS:
    flow_image(fn, title, steps)

# ============================================================ SYSTEM DIAGRAMS
def arch_image(fname):
    W, H = 15.5, 9.6
    fig, ax = plt.subplots(figsize=(W, H), dpi=150)
    ax.set_xlim(0, 15.5); ax.set_ylim(0, 9.6); ax.axis('off')
    ax.text(7.75, 9.2, 'RakshaSafe System Architecture', ha='center', fontsize=19, weight='bold', color=INK)

    def layer_box(x, y, w, h, label, fc, ec, fs=12, sub=''):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round4,pad=0.02,rounding_size=0.15',
                                    fc=fc, ec=ec, lw=1.8, zorder=3))
        ax.text(x + w / 2, y + h / 2 + (0.35 if sub else 0), label, ha='center', va='center',
                fontsize=fs, weight='bold', color=INK, zorder=4)
        if sub:
            ax.text(x + w / 2, y + h / 2 - 0.5, sub, ha='center', va='center', fontsize=10.5, color='#2C3E50', zorder=4)

    # react layer
    layer_box(1.3, 6.9, 12.9, 1.9, 'FRONTEND  (React + TypeScript + Vite)', '#D6EAF8', BLUE, fs=13,
              sub='Pages & components - roles: USER | ADMIN | RESPONDER - i18n dictionary')
    # backend layer
    layer_box(1.3, 3.7, 12.9, 2.6, 'BACKEND  (Node.js + Express + Mongoose)  :5000', '#D5F5E3', GREEN, fs=13,
              sub='REST API /api - JWT + role guards - controllers - 15 Mongoose collections\nservices: geocoding, weather, OSM nearby, reports, notifications, risk assembly')
    # ai layer
    layer_box(1.3, 1.9, 6.0, 1.5, 'AI SERVICE  (FastAPI)  :8000', '#FDEBD0', AMBER, fs=12,
              sub='POST /risk/assess  -  raksha-risk-v1 deterministic scoring')
    # db
    layer_box(8.5, 1.9, 5.7, 1.5, 'MongoDB  :27017', '#E8DAEF', '#8E44AD', fs=12,
              sub='15 collections - schema-validated')
    # connectors
    ax.add_patch(FancyArrowPatch((7.75, 6.85), (7.75, 6.35), arrowstyle='-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.text(8.05, 6.55, 'HTTPS / REST  (Vite proxy)', fontsize=9.5, color='#2C3E50')
    ax.add_patch(FancyArrowPatch((4.3, 3.65), (4.3, 3.4), arrowstyle='-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.add_patch(FancyArrowPatch((11.35, 3.65), (11.35, 3.4), arrowstyle='-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.text(4.55, 3.45, 'risk factors', fontsize=9, color='#2C3E50')
    ax.text(11.65, 3.45, 'stored records', fontsize=9, color='#2C3E50')
    ax.text(10.7, 2.55, 'Mongoose ODM', fontsize=9.5, color='#2C3E50')
    fig.tight_layout(pad=0.4)
    fig.savefig(os.path.join(OUT, fname), facecolor='white')
    plt.close(fig)
    print('arch', fname)


def deploy_image(fname):
    W, H = 14.5, 8.6
    fig, ax = plt.subplots(figsize=(W, H), dpi=150)
    ax.set_xlim(0, 14.5); ax.set_ylim(0, 8.6); ax.axis('off')
    ax.text(7.25, 8.25, 'RakshaSafe Deployment View', ha='center', fontsize=19, weight='bold', color=INK)

    def node(x, y, w, h, title, sub, fc, ec):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round4,pad=0.02,rounding_size=0.15',
                                    fc=fc, ec=ec, lw=1.8, zorder=3))
        ax.add_patch(FancyBboxPatch((x, y + h - 0.75), w, 0.75, boxstyle='round4,pad=0.0,rounding_size=0.1',
                                    fc=ec, ec=ec, lw=0, zorder=4))
        ax.text(x + w / 2, y + h - 0.38, title, ha='center', va='center', fontsize=11.5, weight='bold', color='white', zorder=5)
        ax.text(x + w / 2, y + h / 2 - 0.15, sub, ha='center', va='center', fontsize=9.5, color=INK, zorder=4)

    node(0.7, 5.6, 4.1, 2.2, 'CLIENT  (Browser)', 'React SPA\nport 5173 (dev)\nvite build (prod)', '#AED6F1', BLUE)
    node(5.6, 5.6, 3.9, 2.2, 'BACKEND  (Node)', 'Express API\nport 5000\n/api + /api/health', '#A9DFBF', GREEN)
    node(10.3, 5.6, 3.5, 2.2, 'AI SERVICE  (Python)', 'FastAPI\nport 8000\n/risk/assess', '#F9E79F', AMBER)
    node(0.7, 1.6, 3.6, 2.0, 'MongoDB', '127.0.0.1:27017\n15 collections', '#D2B4DE', '#8E44AD')
    node(5.6, 1.6, 3.9, 2.0, 'External APIs', 'Open-Meteo (weather)\nOSM Nominatim / Overpass', '#FADBD8', RED)

    ax.add_patch(FancyArrowPatch((4.8, 6.7), (5.6, 6.7), arrowstyle='<|-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.text(5.2, 7.02, 'HTTP proxy /api', fontsize=9, color='#2C3E50', ha='center')
    ax.add_patch(FancyArrowPatch((9.5, 6.7), (10.3, 6.7), arrowstyle='<|-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.text(9.9, 7.02, 'factors \u2192 / risk \u2190', fontsize=9, color='#2C3E50', ha='center')
    ax.add_patch(FancyArrowPatch((4.3, 2.6), (4.3, 5.6), arrowstyle='<|-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.text(4.0, 4.1, 'Mongoose ODM', fontsize=9, color='#2C3E50', rotation=90, va='center', ha='center')
    ax.add_patch(FancyArrowPatch((7.55, 4.0), (7.55, 5.6), arrowstyle='<|-|>', mutation_scale=20, lw=2.0, color=EDGE))
    ax.text(8.0, 4.8, 'fetch (proxy)', fontsize=9, color='#2C3E50')
    ax.text(7.25, 0.9, 'No browser code touches MongoDB or external APIs directly.', ha='center', fontsize=10.5, color='#2C3E50')
    fig.tight_layout(pad=0.4)
    fig.savefig(os.path.join(OUT, fname), facecolor='white')
    plt.close(fig)
    print('deploy', fname)


arch_image('diagram_4_1_architecture.png')
deploy_image('diagram_4_3_deployment.png')

print('DONE flowcharts + diagrams')