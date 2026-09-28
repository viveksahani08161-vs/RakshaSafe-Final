# -*- coding: utf-8 -*-
"""Convert user-provided colored diagrams (C:\\Users\\SAI\\Desktop\\Raksha\\png)
to clean print-ready BLACK & WHITE for Chapter 4.

Method: grayscale -> soft white-push curve (light blue/yellow/pink fills become
white, black text and edges stay black). No hard threshold, so anti-aliased
text stays sharp and readable.
"""
import os
from PIL import Image, ImageEnhance

SRC = r'C:\Users\SAI\Desktop\Raksha\png'
OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_bw_user'
os.makedirs(OUT, exist_ok=True)

NAMES = {
    1: 'ubw_4_2_1_login.png',
    2: 'ubw_4_2_2_registration.png',
    3: 'ubw_4_2_3_user_dashboard.png',
    4: 'ubw_4_2_4_sos.png',
    5: 'ubw_4_2_5_incident_detail.png',
    6: 'ubw_4_2_6_contacts.png',
    7: 'ubw_4_2_7_resources.png',
    8: 'ubw_4_2_8_unsafe.png',
    9: 'ubw_4_2_9_risk.png',
    10: 'ubw_4_2_10_notifications.png',
    11: 'ubw_4_2_11_profile.png',
    12: 'ubw_4_2_12_admin_dashboard.png',
    13: 'ubw_4_2_13_admin_incidents.png',
    14: 'ubw_4_2_14_admin_masters.png',
    15: 'ubw_4_1_architecture.png',
    16: 'ubw_4_3_deployment.png',
}

# soft white-push LUT: below 150 unchanged, 150->225 blends to white
LUT = []
for i in range(256):
    if i <= 150:
        LUT.append(i)
    elif i >= 225:
        LUT.append(255)
    else:
        t = (i - 150) / 75.0
        s = t * t * (3 - 2 * t)  # smoothstep
        LUT.append(int(round(i + (255 - i) * s)))

for n in range(1, 17):
    src = os.path.join(SRC, 'diagram_%02d.png' % n)
    im = Image.open(src).convert('RGB')
    g = im.convert('L')
    g = g.point(LUT)
    # gentle contrast to deepen blacks
    g = ImageEnhance.Contrast(g).enhance(1.12)
    dst = os.path.join(OUT, NAMES[n])
    g.save(dst)
    print('saved', NAMES[n], g.size)

print('DONE -', len(NAMES), 'B&W diagrams in', OUT)