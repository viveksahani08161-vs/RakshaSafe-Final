"""Generate 14 colourful dummy interface screenshots for Chapter 4 (via PIL)."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_images'
os.makedirs(OUT, exist_ok=True)

FONT_R = r'C:\Windows\Fonts\segoeui.ttf'
FONT_B = r'C:\Windows\Fonts\segoeuib.ttf'
FONT_I = r'C:\Windows\Fonts\segoeuii.ttf'


def F(size, bold=False, italic=False):
    p = FONT_B if bold else (FONT_I if italic else FONT_R)
    return ImageFont.truetype(p, size)


def rr(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)


def box(d, x, y, w, h, fill='#FFFFFF', outline='#D0D7DE', r=10, width=2, shadow=False):
    if shadow:
        d.rectangle([x + 4, y + 5, x + w + 4, y + h + 5], fill='#B9C2CC')
    rr(d, [x, y, x + w, y + h], r, fill=fill, outline=outline, width=width)


def text(d, xy, s, size=13, fill='#111418', bold=False, italic=False, center=False, x2=None):
    f = F(size, bold, italic)
    if center:
        w = d.textlength(s, font=f)
        d.text((xy[0] - w / 2, xy[1]), s, font=f, fill=fill)
    else:
        d.text(xy, s, font=f, fill=fill)


def pill(d, cx, y, s, fill, fg='#FFFFFF', size=11):
    f = F(size, True)
    w = d.textlength(s, font=f) + 18
    rr(d, [cx - w / 2, y, cx + w / 2, y + 22], 11, fill=fill)
    tw = d.textlength(s, font=f)
    text(d, (cx - tw / 2, y + 3), s, size=size, fill=fg, bold=True)


def header(d, W, title, sub, color='#1F6FEB', height=150):
    d.rectangle([0, 0, W, height], fill=color)
    d.rectangle([0, height - 8, W, height], fill='#123A66')
    text(d, (40, 26), title, size=30, fill='#FFFFFF', bold=True)
    text(d, (40, 72), sub, size=15, fill='#DDEBFF', italic=True)


def navbar(d, W, items, active_idx=0, brand='RakshaSafe', color='#123A66'):
    d.rectangle([0, 0, W, 52], fill=color)
    text(d, (26, 12), brand, size=22, fill='#FFFFFF', bold=True)
    x = 240
    for i, it in enumerate(items):
        f = F(15, i == active_idx)
        w = d.textlength(it, font=f) + 20
        if i == active_idx:
            rr(d, [x - 4, 10, x + w, 42], 8, fill='#FFFFFF22')
        text(d, (x, 17), it, size=15, fill='#FFFFFF', bold=(i == active_idx))
        x += w + 14


def field(d, x, y, w, label, ph, h=36):
    f = F(13, True)
    text(d, (x, y), label, size=13, fill='#44546A', bold=True)
    rr(d, [x, y + 20, x + w, y + 20 + h], 6, fill='#FFFFFF', outline='#98A6B5', width=2)
    fp = F(14)
    wl = d.textlength(ph, font=fp)
    text(d, (x + 10, y + 20 + (h - 18) / 2), ph, size=14, fill='#9AA6B2')


def fieldbox(d, x, y, w, label, ph, h=36):
    field(d, x + 26, y, w, label, ph, h)


def btn(d, x, y, w, s, fill='#1F6FEB', h=36, fg='#FFFFFF', shadow=True):
    if shadow:
        d.rectangle([x + 3, y + 4, x + w + 3, y + h + 4], fill='#B9C2CC')
    rr(d, [x, y, x + w, y + h], 8, fill=fill)
    f = F(14, True)
    tw = d.textlength(s, font=f)
    text(d, (x + (w - tw) / 2, y + (h - 20) / 2), s, size=14, fill=fg, bold=True)


def logo(d, x, y, r=22, color='#2ECC71', prefix='R'):
    d.ellipse([x - r, y - r, x + r, y + r], fill=color, outline='#FFFFFF', width=3)
    text(d, (x - 10, y - 16), prefix, size=dir_size if False else 24, fill='#FFFFFF', bold=True)


def icons(d, x, y, color='#5B7A99'):
    for i in range(3):
        d.ellipse([x + i * 8, y, x + i * 8 + 5, y + 5], fill=color)
    d.line([x, y + 10, x + 22, y + 10], fill=color, width=2)
    d.line([x + 4, y + 16, x + 18, y + 16], fill=color, width=2)


# ================================================================= USER screens
def shot_4_2_1_login():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Home', 'Alert Us'], active_idx=-1, color='#10314F')
    header(d, W, 'Sign In to RakshaSafe', 'Women safety & disaster emergency response system', color='#1F6FEB', height=150)
    bx, by, bw, bh = W // 2 - 260, 230, 520, 340
    box(d, bx, by, bw, bh, shadow=True)
    rr(d, [bx, by, bx + bw, by + 64], 10, fill='#E8F0FE', outline='#D0D7DE')
    text(d, (bx + 26, by + 18), 'Welcome back', size=20, fill='#16437E', bold=True)
    field(d, bx + 40, by + 90, bw - 80, 'Email or Phone', 'you@example.com or 98000 00000')
    field(d, bx + 40, by + 172, bw - 80, 'Password', 'Enter your password')
    btn(d, bx + 40, by + 260, bw - 80, 'Sign In', fill='#1F6FEB')
    text(d, (bx + 40, by + 308), 'New user? Create Account', size=13, fill='#1F6FEB', bold=True)
    save(img, 'shot_4_2_1_login.png')


def shot_4_2_2_registration():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Sign In'], active_idx=-1, color='#10314F')
    header(d, W, 'Create User Account', 'One account for SOS reporting and emergency resources', color='#1F6FEB', height=150)
    bx, by, bw, bh = W // 2 - 300, 225, 600, 340
    box(d, bx, by, bw, bh, shadow=True)
    col_y = by + 20
    field(d, bx + 40, col_y, 250, 'Full Name', 'Enter full name'); field(d, bx + 310, col_y, 250, 'Email Address', 'Email')
    field(d, bx + 40, col_y + 78, 250, 'Phone Number', '+91 98...'); field(d, bx + 310, col_y + 78, 250, 'Preferred Language', 'English / हिंदी')
    field(d, bx + 40, col_y + 156, 520, 'Password', 'Minimum 8 characters with letters and digits')
    btn(d, bx + 40, col_y + 246, 250, 'Create Account', fill='#1F6FEB', h=40)
    text(d, (bx + 310, col_y + 256), 'Already have an account?  Sign In', size=13, fill='#1F6FEB', bold=True)
    save(img, 'shot_4_2_2_registration.png')


def shot_4_2_3_user_dashboard():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Contacts', 'Notifications'], active_idx=0)
    header(d, W, 'Your Dashboard', 'Hello, User — how can we help you today?', color='#1F6FEB', height=140)
    # stat cards row
    stats = [('3', 'My Incidents'), ('2', 'Active SOS'), ('1', 'Not Verified Report'), ('5', 'Contacts')]
    x0 = 40
    for i, (num, lab) in enumerate(stats):
        box(d, x0, 200, 250, 110, shadow=True)
        d.circle([x0 + 30, 250], 6, fill='#1F6FEB') if False else None
        text(d, (x0 + 22, 224), num, size=34, fill='#1F6FEB', bold=True)
        text(d, (x0 + 22, 272), lab, size=15, fill='#44546A', bold=True)
        x0 += 280
    # quick actions
    text(d, (40, 330), 'Quick Actions', size=18, fill='#16437E', bold=True)
    acts = [('Report SOS', '#E74C3C'), ('Emergency Contacts', '#1F6FEB'), ('Find Resources', '#0E9F6E'), ('Report Unsafe Area', '#B45309')]
    x0 = 40
    for i, (s, c) in enumerate(acts):
        btn(d, x0, 364, 190, s, fill=c, h=44)
        x0 += 210
    # recent incidents
    box(d, 40, 430, 1120, 220, shadow=True)
    text(d, (64, 452), 'Recent Incidents', size=17, fill='#16437E', bold=True)
    rows = [('INC-104', 'Women Safety', 'High risk area, need help', 'REPORTED', '#F59E0B'),
            ('INC-103', 'Medical Emergency', 'Need ambulance at site', 'ASSIGNED', '#1F6FEB'),
            ('INC-102', 'Accident', 'Two-wheeler crash near market', 'RESOLVED', '#0E9F6E')]
    yy = 490
    for ref, cat, desc, st, sc in rows:
        text(d, (64, yy), ref, size=14, fill='#1F6FEB', bold=True)
        text(d, (170, yy), cat, size=14, fill='#44546A', bold=True)
        text(d, (340, yy), desc, size=13, fill='#5B7A99')
        pill(d, 1020, yy, st, sc)
        yy += 50
    save(img, 'shot_4_2_3_user_dashboard.png')


def shot_4_2_4_sos():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Contacts', 'Notifications'], active_idx=1)
    header(d, W, 'Report SOS', 'Turn an emergency into a structured incident record', color='#E74C3C', height=140)
    bx, by, bw, bh = W // 2 - 320, 200, 640, 430
    box(d, bx, by, bw, bh, shadow=True)
    f = F(14, True)
    # type + category chips
    text(d, (bx + 30, by + 24), 'Incident Type', size=13, fill='#44546A', bold=True)
    chip(d, bx + 30, by + 50, 'Safety', '#E74C3C', active=True)
    chip(d, bx + 130, by + 50, 'Disaster', '#F59E0B')
    text(d, (bx + 330, by + 24), 'Category', size=13, fill='#44546A', bold=True)
    chip(d, bx + 330, by + 50, 'Women Safety', '#1F6FEB', active=True)
    chip(d, bx + 470, by + 50, 'Medical', '#0E9F6E')
    field(d, bx + 30, by + 96, 580, 'Description', "What is happening and who is affected?")
    field(d, bx + 30, by + 178, 580, 'Priority', 'HIGH')
    btn(d, bx + 30, by + 260, 250, 'Use My Location', fill='#0E9F6E', h=40)
    text(d, (bx + 300, by + 272), '19.0760° N, 72.8777° E — accuracy 45m', size=13, fill='#0E9F6E', italic=True)
    btn(d, bx + 30, by + 330, 580, 'Submit SOS Incident', fill='#E74C3C', h=46)
    text(d, (bx + 30, by + 392), 'Double submission is blocked while the request is in flight.', size=12, fill='#9AA6B2', italic=True)
    save(img, 'shot_4_2_4_sos.png')


def chip(d, x, y, s, fill, active=False):
    f = F(13, True)
    w = d.textlength(s, font=f) + 24
    rr(d, [x, y, x + w, y + 30], 15, fill=fill if active else '#FFFFFF', outline=fill, width=2)
    text(d, (x + 12, y + 6), s, size=13, fill='#FFFFFF' if active else fill, bold=True)


def shot_4_2_5_incident_detail():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources'], active_idx=0)
    header(d, W, 'Incident INC-104  ·  Women Safety', 'Reported today at 14:22 IST', color='#1F6FEB', height=140)
    # three cards
    box(d, 40, 200, 300, 210, shadow=True)
    text(d, (60, 224), 'Location', size=16, fill='#16437E', bold=True)
    text(d, (60, 260), 'Kurla, Mumbai', size=14, fill='#111418', bold=True)
    text(d, (60, 286), '19.0760° N, 72.8777° E', size=13, fill='#5B7A99')
    text(d, (60, 310), 'Accuracy 45 m · captured', size=12, fill='#0E9F6E')
    btn(d, 60, 344, 140, 'Open in Maps', fill='#0E9F6E', h=34)
    box(d, 370, 200, 420, 210, shadow=True)
    text(d, (390, 224), 'Nearby Help', size=16, fill='#16437E', bold=True)
    for i, (n, dist, c) in enumerate([('Lokmanya Hospital', '1.2 km', '#1F6FEB'), ('Bethel Police Station', '0.8 km', '#0E9F6E')]):
        text(d, (390, 260 + i * 36), n, size=14, fill='#111418', bold=True)
        text(d, (390, 282 + i * 36), dist, size=12, fill='#9AA6B2')
    box(d, 820, 200, 340, 210, shadow=True)
    text(d, (840, 224), 'Assigned Team', size=16, fill='#16437E', bold=True)
    text(d, (840, 258), 'Team Shaktikiran', size=14, fill='#111418', bold=True)
    pill(d, 1050, 258, 'EN_ROUTE', '#1F6FEB')
    text(d, (840, 296), 'Contact +91 98xxxxx12', size=13, fill='#0E9F6E')
    btn(d, 840, 330, 150, 'Call Team', fill='#0E9F6E', h=34)
    # timeline
    box(d, 40, 430, 1120, 210, shadow=True)
    text(d, (64, 452), 'History Timeline', size=16, fill='#16437E', bold=True)
    tl = [('14:22', 'Incident reported (REPORTED)', '#F59E0B'), ('14:24', 'Admin acknowledged (ACKNOWLEDGED)', '#8A5CF6'),
          ('14:27', 'Team Shaktikiran assigned (ASSIGNED)', '#1F6FEB')]
    yy = 496
    for t, s, c in tl:
        d.line([90, yy + 24, 90, yy + 50], fill='#D0D7DE', width=2)
        d.ellipse([82, yy + 16, 98, yy + 32], fill=c)
        text(d, (118, yy + 14), t, size=13, fill='#5B7A99')
        text(d, (200, yy + 14), s, size=14, fill='#111418', bold=True)
        yy += 44
    save(img, 'shot_4_2_5_incident_detail.png')


def shot_4_2_6_contacts():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Contacts'], active_idx=3)
    header(d, W, 'Emergency Contacts', 'People who should be reachable in an emergency', color='#1F6FEB', height=140)
    box(d, 40, 200, 620, 380, shadow=True)
    text(d, (64, 224), 'Add / Edit Contact', size=16, fill='#16437E', bold=True)
    field(d, 64, 252, 300, 'Name', 'Full name')
    field(d, 384, 252, 250, 'Phone', '+91 ...')
    field(d, 64, 334, 300, 'Email (optional)', 'Email')
    field(d, 384, 334, 250, 'Relationship', 'Family')
    pill(d, 330, 420, 'SMS', '#1F6FEB')
    pill(d, 430, 420, 'EMAIL', '#8A5CF6')
    btn(d, 64, 470, 200, 'Save Contact', fill='#1F6FEB', h=40)
    # list
    box(d, 690, 200, 470, 380, shadow=True)
    text(d, (718, 224), 'My Contacts', size=16, fill='#16437E', bold=True)
    rows = [('Priya Sharma', '+91 98...23', 'Family', True), ('Rahul Verma', '+91 99...07', 'Friend', False),
            ('Mumbai Police', '100', 'Police', False)]
    yy = 264
    for name, ph, rel, primary in rows:
        rr(d, [718, yy, 1128, yy + 86], 10, fill='#F6F9FC', outline='#D0D7DE')
        d.circle([744, yy + 30], 16, fill='#1F6FEB')
        text(d, (736, yy + 22), name[0], size=14, fill='#FFFFFF', bold=True)
        text(d, (772, yy + 10), name, size=14, fill='#111418', bold=True)
        text(d, (772, yy + 34), f'{ph}  ·  {rel}', size=12, fill='#5B7A99')
        if primary:
            pill(d, 1040, yy + 16, 'PRIMARY', '#0E9F6E')
        else:
            pill(d, 1040, yy + 16, 'CALL', '#1F6FEB')
        yy += 98
    save(img, 'shot_4_2_6_contacts.png')


def shot_4_2_7_resources():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Contacts'], active_idx=2)
    header(d, W, 'Find Emergency Resources', 'Hospitals, police stations, shelters and fire stations nearby', color='#0E9F6E', height=140)
    # search bar
    rr(d, [40, 196, 1160, 252], 12, fill='#FFFFFF', outline='#98A6B5', width=2, )
    text(d, (66, 214), 'Search hospitals, police stations, shelters. . .', size=16, fill='#9AA6B2')
    btn(d, 1020, 206, 160, 'Use My Location', fill='#0E9F6E', h=38)
    chips = [('All', True), ('Hospital', False), ('Police Station', False), ('Shelter', False), ('Fire Station', False)]
    x0 = 40
    for s, a in chips:
        chip2(d, x0, 288, s, '#0E9F6E', a)
        x0 += 130
    # cards
    cards = [('Lokmanya Hospital', 'Hospital', '1.2 km · Kurla', 'Call', '#0EB07E'),
             ('Bethel Police Station', 'Police Station', '0.8 km · Kurla West', 'Call', '#1F6FEB'),
             ('City Relief Shelter', 'Relief Centre', '2.1 km · Sion', 'Directions', '#B45309')]
    x0 = 40
    for name, typ, dist, act, ac in cards:
        box(d, x0, 360, 360, 280, shadow=True)
        text(d, (x0 + 24, 388), name, size=17, fill='#111418', bold=True)
        pill(d, x0 + 180, 392, typ, '#EAF7F1', fg='#0E9F6E')
        text(d, (x0 + 24, 440), dist, size=14, fill='#5B7A99')
        text(d, (x0 + 24, 470), 'Phone: +91 22 6xxx xxxx', size=13, fill='#44546A')
        btn(d, x0 + 24, 516, 150, act, fill=ac, h=40)
        btn(d, x0 + 190, 516, 146, 'Directions', fill='#FFFFFF', fg='#0E9F6E', h=40)
        x0 += 380
    text(d, (40, 660), 'Source: RakshaSafe records + live providers (badges shown on cards)', size=12, fill='#9AA6B2', italic=True)
    save(img, 'shot_4_2_7_resources.png')


def chip2(d, x, y, s, color, active):
    f = F(13, True)
    w = d.textlength(s, font=f) + 26
    rr(d, [x, y, x + w, y + 32], 16, fill='#0E9F6E' if active else '#FFFFFF', outline=color, width=2)
    text(d, (x + 13, y + 7), s, size=13, fill='#FFFFFF' if active else color, bold=True)


def shot_4_2_8_unsafe():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Contacts'], active_idx=-1)
    header(d, W, 'Report Unsafe Area', 'Flag places that felt unsafe — reviewed by administrators', color='#B45309', height=140)
    bx, by, bw, bh = W // 2 - 320, 200, 640, 430
    box(d, bx, by, bw, bh, shadow=True)
    text(d, (bx + 30, by + 24), 'Category', size=13, fill='#44546A', bold=True)
    chip(d, bx + 30, by + 52, 'Dark street', '#B45309', True)
    chip(d, bx + 170, by + 52, 'Harassment', '#E74C3C')
    chip(d, bx + 340, by + 52, 'Anti-social', '#8A5CF6')
    field(d, bx + 30, by + 100, 580, 'Severity', 'Moderate')
    field(d, bx + 30, by + 184, 580, 'Description', 'What did you observe?')
    btn(d, bx + 30, by + 268, 250, 'Use My Location', fill='#B45309', h=40)
    text(d, (bx + 300, by + 280), '19.0801° N, 72.8893° E', size=13, fill='#B45309', italic=True)
    btn(d, bx + 30, by + 336, 580, 'Submit Report', fill='#B45309', h=46)
    save(img, 'shot_4_2_8_unsafe.png')


def shot_4_2_9_risk():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources'], active_idx=0)
    header(d, W, 'AI Risk Assessment', 'Assistive scoring by the deterministic raksha-risk-v1 model', color='#8A5CF6', height=140)
    # score card
    box(d, 40, 200, 420, 400, shadow=True)
    text(d, (64, 224), 'Current Score', size=16, fill='#5B21B6', bold=True)
    d.ellipse([160, 280, 340, 460], outline='#8A5CF6', width=8)
    text(d, (250, 356), '83', size=64, fill='#8A5CF6', bold=True, center=True)
    text(d, (250, 430), '/ 100', size=16, fill='#9AA6B2', center=True)
    pill(d, 250, 500, 'CRITICAL', '#E74C3C')
    text(d, (250, 540), 'model raksha-risk-v1', size=12, fill='#9AA6B2', center=True)
    text(d, (250, 562), 'assessed 14:25 IST', size=12, fill='#9AA6B2', center=True)
    # factors
    box(d, 500, 200, 660, 280, shadow=True)
    text(d, (534, 224), 'Weighted Factors', size=16, fill='#5B21B6', bold=True)
    facts = [('Priority base (HIGH)', 0.85), ('Type modifier (Safety)', 0.60), ('Verified unsafe reports nearby', 0.90),
             ('Unverified unsafe reports nearby', 0.30), ('Active incidents nearby', 0.45)]
    yy = 262
    for lab, val in facts:
        text(d, (534, yy), lab, size=13, fill='#44546A')
        rr(d, [534, yy + 18, 534 + 500, yy + 30], 6, fill='#EDE9FE')
        rr(d, [534, yy + 18, 534 + int(500 * val), yy + 30], 6, fill='#8A5CF6')
        text(d, (1046, yy + 12), f'{int(val * 100)}', size=12, fill='#5B21B6', bold=True)
        yy += 46
    btn(d, 500, 500, 200, 'Assess Risk', fill='#8A5CF6', h=42)
    btn(d, 720, 500, 200, 'Try Again', fill='#FFFFFF', fg='#8A5CF6', h=42)
    text(d, (500, 560), 'Decision-support only — always confirm with real authorities.', size=13, fill='#0E9F6E', italic=True)
    save(img, 'shot_4_2_9_risk.png')


def shot_4_2_10_notifications():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Contacts', 'Notifications'], active_idx=4)
    header(d, W, 'Notifications', 'Lifecycle events for your incidents, with honest channel status', color='#1F6FEB', height=140)
    box(d, 40, 200, 1120, 430, shadow=True)
    rows = [('ASSIGNED', 'Team Shaktikiran assigned to INC-104', 'In-App · SENT · Email · NOT_CONFIGURED', '#1F6FEB', True),
            ('ACKNOWLEDGED', 'Incident INC-104 acknowledged by admin', 'In-App · DELIVERED', '#F59E0B', True),
            ('REPORTED', 'Your SOS INC-104 was registered', 'In-App · DELIVERED · SMS · NOT_CONFIGURED', '#0E9F6E', True)]
    yy = 236
    for tag, msg, ch, c, unread in rows:
        rr(d, [64, yy, 1076, yy + 86], 10, fill='#F6F9FC' if unread else '#FFFFFF', outline='#D0D7DE')
        d.circle([96, yy + 34], 7, fill=c if unread else '#B9C2CC')
        pill(d, 1030, yy + 14, tag, c)
        text(d, (122, yy + 12), msg, size=15, fill='#111418', bold=unread)
        text(d, (122, yy + 44), ch, size=12, fill='#5B7A99' if not unread else '#44546A')
        text(d, (122, yy + 62), '2 min ago', size=11, fill='#9AA6B2')
        yy += 98
    save(img, 'shot_4_2_10_notifications.png')


def shot_4_2_11_profile():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    navbar(d, W, ['Dashboard', 'SOS', 'Resources', 'Profile'], active_idx=-1)
    header(d, W, 'Your Profile', 'Keep reachable details current for emergency teams', color='#1F6FEB', height=140)
    bx, by, bw, bh = W // 2 - 300, 220, 600, 380
    box(d, bx, by, bw, bh, shadow=True)
    field(d, bx + 40, by + 24, 250, 'Full Name', 'Asha User')
    field(d, bx + 310, by + 24, 250, 'Email', 'asha@example.com')
    field(d, bx + 40, by + 108, 250, 'Phone', '+91 98...')
    field(d, bx + 310, by + 108, 250, 'Language', 'English')
    text(d, (bx + 40, by + 196), 'Account role:  USER (read-only)', size=14, fill='#0E9F6E', bold=True)
    text(d, (bx + 40, by + 222), 'Status:  ACTIVE', size=14, fill='#0E9F6E', bold=True)
    btn(d, bx + 40, by + 270, 200, 'Save Changes', fill='#1F6FEB', h=44)
    btn(d, bx + 270, by + 270, 200, 'Sign Out', fill='#E74C3C', h=44)
    save(img, 'shot_4_2_11_profile.png')


# ================================================================= ADMIN screens
def admin_frame(d, W, H, brand='RakshaSafe Admin', menu=(('Dashboard', True), ('Incidents', False), ('Users', False), ('Facilities', False),
                                                          ('Teams', False), ('Contacts', False), ('Reports', False), ('Logs', False))):
    d.rectangle([0, 0, 210, H], fill='#12233B')
    text(d, (24, 22), brand, size=19, fill='#8EF0C8', bold=True)
    yy = 90
    for label, active in menu:
        if active:
            rr(d, [10, yy, 200, yy + 38], 8, fill='#1F6FEB')
        text(d, (28, yy + 8), label, size=14, fill='#FFFFFF', bold=active)
        yy += 52
    return 230


def shot_4_2_12_admin_dashboard():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    menu = (('Dashboard', True), ('Incidents', False), ('Users', False), ('Facilities', False), ('Teams', False), ('Unsafe Reports', False), ('Report Generation', False), ('Admin Logs', False))
    admin_frame(d, W, H, menu=menu)
    d.rectangle([210, 0, W, 56], fill='#13294B')
    text(d, (236, 15), 'Admin Dashboard', size=22, fill='#FFFFFF', bold=True)
    # counters
    counters = [('128', 'Total Users', '#1F6FEB'), ('47', 'Total Incidents', '#E74C3C'), ('32', 'Active Families', '#0E9F6E')]
    x0 = 236
    for num, lab, c in counters:
        box(d, x0, 80, 300, 90, shadow=True)
        d.rectangle([x0, 80, x0 + 10, 170], fill=c, )
        text(d, (x0 + 30, 98), num, size=28, fill=c, bold=True)
        text(d, (x0 + 30, 132), lab, size=14, fill='#44546A', bold=True)
        x0 += 320
    # status breakdown
    box(d, 236, 200, 520, 300, shadow=True)
    text(d, (262, 222), 'Incidents by Status', size=16, fill='#13294B', bold=True)
    stat = [('REPORTED', 6, '#F59E0B'), ('ACKNOWLEDGED', 4, '#8A5CF6'), ('ASSIGNED', 8, '#1F6FEB'),
            ('IN_PROGRESS', 5, '#3B82F6'), ('RESOLVED', 14, '#0E9F6E'), ('CLOSED', 8, '#64748B'), ('CANCELLED', 2, '#E74C3C')]
    yy = 256
    for lab, n, c in stat:
        text(d, (262, yy), lab, size=13, fill='#44546A')
        rr(d, [420, yy, 420 + 200, yy + 14], 7, fill='#E2E8F0')
        rr(d, [420, yy, 420 + int(200 * n / 16), yy + 14], 7, fill=c)
        text(d, (630, yy - 2), str(n), size=12, fill='#13294B', bold=True)
        yy += 32
    # recent activity
    box(d, 776, 200, 400, 300, shadow=True)
    text(d, (804, 222), 'Recent Activity (AdminLogs)', size=15, fill='#13294B', bold=True)
    acts = [('ADMIN · INC-104 status', '14:24', '#1F6FEB'), ('ADMIN · team assigned', '14:27', '#0E9F6E'),
            ('ADMIN · report verified', '13:10', '#B45309'), ('ADMIN · facility updated', '12:40', '#8A5CF6')]
    yy = 258
    for s, t, c in acts:
        d.circle([816, yy + 6], 5, fill=c)
        text(d, (836, yy), s, size=13, fill='#111418', bold=True)
        text(d, (836, yy + 20), t, size=11, fill='#9AA6B2')
        yy += 44
    save(img, 'shot_4_2_12_admin_dashboard.png')


def shot_4_2_13_admin_incidents():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    menu = (('Dashboard', False), ('Incidents', True), ('Users', False), ('Facilities', False), ('Teams', False), ('Unsafe Reports', False), ('Report Generation', False), ('Admin Logs', False))
    admin_frame(d, W, H, menu=menu)
    d.rectangle([210, 0, W, 56], fill='#13294B')
    text(d, (236, 15), 'Incident Management', size=22, fill='#FFFFFF', bold=True)
    # filters
    rr(d, [236, 80, 1170, 124], 10, fill='#FFFFFF', outline='#98A6B5')
    bx = 250
    for s in ['All Status', 'REPORTED', 'ASSIGNED', 'WOMEN SAFETY', 'Search...']:
        rr(d, [bx, 90, bx + 140, 116], 8, fill='#F1F5F9', outline='#CBD5E1')
        text(d, (bx + 14, 97), s, size=13, fill='#44546A')
        bx += 160
    # table
    box(d, 236, 140, 936, 480, shadow=True)
    head = ['Reference', 'Category', 'Reporter', 'Status', 'Priority', 'Team']
    x0 = 260
    for hc in head:
        text(d, (x0, 156), hc, size=13, fill='#13294B', bold=True)
        x0 += 150
    d.line([236, 180, 1172, 180], fill='#CBD5E1', width=2)
    rows = [('INC-104', 'Women Safety', 'Asha U.', 'REPORTED', 'HIGH', '—', '#F59E0B'),
            ('INC-103', 'Medical', 'Meena K.', 'ASSIGNED', 'CRITICAL', 'Shaktikiran', '#1F6FEB'),
            ('INC-102', 'Accident', 'R. Desai', 'RESOLVED', 'MEDIUM', 'Rapid-1', '#0E9F6E')]
    yy = 208
    for r_ in rows:
        ref, cat, rep, st, pr, team, sc = r_
        rr(d, [246, yy, 1162, yy + 52], 8, fill='#F6F9FC', outline='#E2E8F0')
        x0 = 260
        for val in (ref, cat, rep):
            text(d, (x0, yy + 16), val, size=13, fill='#111418', bold=(val == ref))
            x0 += 150
        pill(d, 500 + 10, yy + 14, st, sc)
        text(d, (740, yy + 16), pr, size=13, fill='#111418')
        text(d, (890, yy + 16), team, size=13, fill='#111418')
        text(d, (1080, yy + 16), 'Open ▶', size=13, fill='#1F6FEB', bold=True)
        yy += 62
    text(d, (236, 632), 'Status updates only via legal workflow transitions; every change is logged.', size=12, fill='#9AA6B2', italic=True, )
    save(img, 'shot_4_2_13_admin_incidents.png')


def shot_4_2_14_admin_masters():
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), '#EEF2F7')
    d = ImageDraw.Draw(img)
    menu = (('Dashboard', False), ('Incidents', False), ('Users', True), ('Facilities', False), ('Teams', False), ('Unsafe Reports', False), ('Report Generation', False), ('Admin Logs', False))
    admin_frame(d, W, H, menu=menu)
    d.rectangle([210, 0, W, 56], fill='#13294B')
    text(d, (236, 15), 'User Management', size=22, fill='#FFFFFF', bold=True)
    # search
    rr(d, [236, 80, 460, 118], 10, fill='#FFFFFF', outline='#98A6B5')
    text(d, (256, 94), 'Search users by name / email / phone. . .', size=13, fill='#9AA6B2')
    # tabs
    tabs = ['Overview', 'Emergency Contacts', 'Incidents', 'Risk']
    x0 = 236
    for i, t in enumerate(tabs):
        rr(d, [x0, 140, x0 + 150, 172], 8, fill='#1F6FEB' if i == 0 else '#E2E8F0')
        text(d, (x0 + 32, 150), t, size=13, fill='#FFFFFF' if i == 0 else '#44546A', bold=True)
        x0 += 162
    # detail cards
    box(d, 236, 190, 460, 380, shadow=True)
    text(d, (262, 214), 'User Profile', size=16, fill='#13294B', bold=True)
    field(d, 262, 242, 400, 'Full Name', 'Asha User')
    field(d, 262, 322, 400, 'Email', 'asha@example.com')
    field(d, 262, 402, 400, 'Phone', '+91 98...')
    pill(d, 560, 486, 'ACTIVE', '#0E9F6E')
    btn(d, 262, 520, 200, 'Update User', fill='#1F6FEB', h=40)
    # right card: unsafe reports queue
    box(d, 716, 190, 460, 380, shadow=True)
    text(d, (742, 214), 'Unsafe Reports Queue', size=16, fill='#13294B', bold=True)
    rows = [('Dark street, Pune', 'VERIFIED', '#0E9F6E'), ('Harassment, Delhi', 'PENDING', '#F59E0B'), ('Suspicious persons', 'PENDING', '#F59E0B')]
    yy = 250
    for lab, st, sc in rows:
        rr(d, [742, yy, 1148, yy + 56], 8, fill='#F6F9FC', outline='#E2E8F0')
        text(d, (758, yy + 18), lab, size=13, fill='#111418', bold=True)
        pill(d, 1110, yy + 16, st, sc)
        yy += 66
    btn(d, 742, 542, 200, 'Generate Report (PDF)', fill='#B45309', h=40)
    save(img, 'shot_4_2_14_admin_masters.png')


def save(img, fname):
    img.save(os.path.join(OUT, fname))
    print('shot', fname)


# fix missing reference in logo fn
dir_size = 24

shot_4_2_1_login()
shot_4_2_2_registration()
shot_4_2_3_user_dashboard()
shot_4_2_4_sos()
shot_4_2_5_incident_detail()
shot_4_2_6_contacts()
shot_4_2_7_resources()
shot_4_2_8_unsafe()
shot_4_2_9_risk()
shot_4_2_10_notifications()
shot_4_2_11_profile()
shot_4_2_12_admin_dashboard()
shot_4_2_13_admin_incidents()
shot_4_2_14_admin_masters()
print('DONE screenshots')