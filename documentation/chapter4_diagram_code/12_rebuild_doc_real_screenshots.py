# -*- coding: utf-8 -*-
"""Rebuild Chapter 4 System Design with REAL interface screenshots.
Takes the base document, replaces the 14 interface screenshot slots with the
live-captured REAL screenshots, keeps the 16 B&W StarUML diagrams, and the
architecture + deployment diagrams. Output is a new FINAL docx."""
import os, re, shutil
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

BASE = r'C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_4_RakshaSafe_System_Design.docx'
OUT  = r'C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_4_RakshaSafe_System_Design_UML_REAL.docx'
BW   = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_bw'
REAL = r'C:\Users\SAI\Desktop\Raksha\documentation\test-evidence\screenshots'

# section 4.2.x -> (bw diagram filename, real screenshot filename)
SLUG_MAP = {
    1:  ('bw_4_2_1_login.png',            '01_login_page.png'),
    2:  ('bw_4_2_2_registration.png',     '03_register_form_filled.png'),
    3:  ('bw_4_2_3_user_dashboard.png',   '04_user_dashboard_after_register.png'),
    4:  ('bw_4_2_4_sos.png',              '06_sos_form_filled.png'),
    5:  ('bw_4_2_5_incident_detail.png',  '27_user_incident_detail.png'),
    6:  ('bw_4_2_6_contacts.png',         '13_emergency_contacts_page.png'),
    7:  ('bw_4_2_7_resources.png',        '12_resources_page.png'),
    8:  ('bw_4_2_8_unsafe.png',           '25_user_unsafe_report.png'),
    9:  ('bw_4_2_9_risk.png',             '26_risk_assessment_admin.png'),
    10: ('bw_4_2_10_notifications.png',   '11_notifications_page.png'),
    11: ('bw_4_2_11_profile.png',         '14_profile_page.png'),
    12: ('bw_4_2_12_admin_dashboard.png', '17_admin_dashboard.png'),
    13: ('bw_4_2_13_admin_incidents.png', '18_admin_incidents.png'),
    14: ('bw_4_2_14_admin_masters.png',   '20_admin_facilities.png'),
}

doc = Document(BASE)

# Sanity: find how many inline images the base already has
print('base inline images:', len(doc.inline_shapes))

def replace_picture_in_paragraph(p, img_path, width_cm, center=True):
    """Remove any existing drawing inside paragraph, then insert the new picture."""
    # remove all wp:inline / w:drawing elements
    from docx.oxml.ns import qn as _qn
    for el in p._p.findall(_qn('w:r')):
        if el.find(_qn('w:drawing')) is not None:
            p._p.remove(el)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else p.alignment
    p.paragraph_format.space_before = Cm(0.2)
    p.paragraph_format.space_after = Cm(0.2)
    run = p.add_run()
    run.add_picture(img_path, width=Cm(width_cm))
    return True

ARCH = os.path.join(BW, 'bw_4_1_architecture.png')
DEPL = os.path.join(BW, 'bw_4_3_deployment.png')

replaced_bw = 0
replaced_real = 0

paras = doc.paragraphs
i = 0
while i < len(paras):
    p = paras[i]
    t = p.text.strip()

    # --- architecture diagram (already exists in base? insert before 4.1.1 heading) ---
    # The base DOCX contains the colorful architecture as an image paragraph before
    # 'Figure 4.1'. We replace any image paragraph whose sibling caption mentions 4.1.
    if t.startswith('Figure 4.1'):
        # find the preceding image paragraph (the one just before caption)
        if i > 0 and ('graphic' in paras[i-1]._p.xml or 'blip' in paras[i-1]._p.xml):
            replace_picture_in_paragraph(paras[i-1], ARCH, 16.0)
            replaced_bw += 1
            print('REPLACED architecture')

    if t.startswith('Figure 4.3'):
        if i > 0 and ('graphic' in paras[i-1]._p.xml or 'blip' in paras[i-1]._p.xml):
            replace_picture_in_paragraph(paras[i-1], DEPL, 15.0)
            replaced_bw += 1
            print('REPLACED deployment')

    # --- interface flowchart + screenshot pairs ---
    # match captions like 'Flowchart 4.2.5: Incident Detail' and 'Figure 4.2.5: ...'
    mflow = re.match(r'^Flowchart 4\.2\.(\d+):', t)
    mfig  = re.match(r'^Figure 4\.2\.(\d+):', t)
    if mflow:
        num = int(mflow.group(1))
        if num in SLUG_MAP:
            bw_name, _ = SLUG_MAP[num]
            bw_img = os.path.join(BW, bw_name)
            # the actual image appears BEFORE the caption. Replace nearest prior image para.
            if i > 0 and ('graphic' in paras[i-1]._p.xml or 'blip' in paras[i-1]._p.xml):
                replace_picture_in_paragraph(paras[i-1], bw_img, 12.8)
                replaced_bw += 1
                print('REPLACED flowchart 4.2.%d -> %s' % (num, bw_name))
    if mfig:
        num = int(mfig.group(1))
        if num in SLUG_MAP:
            _, real_name = SLUG_MAP[num]
            real_img = os.path.join(REAL, real_name)
            if not os.path.exists(real_img):
                print('MISSING REAL:', real_img); i += 1; continue
            if i > 0 and ('graphic' in paras[i-1]._p.xml or 'blip' in paras[i-1]._p.xml):
                replace_picture_in_paragraph(paras[i-1], real_img, 15.0)
                replaced_real += 1
                print('REPLACED screenshot 4.2.%d -> %s' % (num, real_name))
    i += 1

# Some versions of the base document insert images differently; a second pass in case
# any of the caption-image pairs are ordered image AFTER caption (impossible here).
print('total replaced: bw=%d real=%d' % (replaced_bw, replaced_real))
print('final inline images:', len(doc.inline_shapes))

# add a note paragraph at end of section 4.2 intro? Keep text identical to base.
doc.save(OUT)
print('SAVED:', OUT)
print('size KB:', round(os.path.getsize(OUT) / 1024))