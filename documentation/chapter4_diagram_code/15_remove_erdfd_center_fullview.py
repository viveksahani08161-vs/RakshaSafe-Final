# -*- coding: utf-8 -*-
"""Chapter 4 cleanup per user request:
1. REMOVE ER + DFD Level 0/1/2 (Figures 4.1.2 - 4.1.5, image + caption paras).
2. CENTER all 16 user flow diagrams at FULL usable width (15.9 cm) for full view.
"""
import os, re, io
from docx import Document
from docx.shared import Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from PIL import Image

DOC = r'C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_4_RakshaSafe_System_Design_UML_REAL.docx'
UBW = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_bw_user'
FULL_W = 15.9  # cm, exact usable page width

SIZE2FILE = {
    (2199, 2167): 'ubw_4_2_1_login.png',
    (2027, 1644): 'ubw_4_2_2_registration.png',
    (1926, 1434): 'ubw_4_2_3_user_dashboard.png',
    (2042, 1931): 'ubw_4_2_4_sos.png',
    (2017, 2167): 'ubw_4_2_5_incident_detail.png',
    (1935, 2038): 'ubw_4_2_6_contacts.png',
    (1932, 1604): 'ubw_4_2_7_resources.png',
    (2155, 1948): 'ubw_4_2_8_unsafe.png',
    (2098, 1988): 'ubw_4_2_9_risk.png',
    (1866, 1614): 'ubw_4_2_10_notifications.png',
    (1857, 1524): 'ubw_4_2_11_profile.png',
    (1956, 1390): 'ubw_4_2_12_admin_dashboard.png',
    (2090, 2088): 'ubw_4_2_13_admin_incidents.png',
    (1997, 1610): 'ubw_4_2_14_admin_masters.png',
    (2212, 1625): 'ubw_4_1_architecture.png',
    (2729, 1193): 'ubw_4_3_deployment.png',
}

def para_has_image(p):
    return ('graphic' in p._p.xml) or ('blip' in p._p.xml)

def embedded_size(p, doc):
    for blip in p._p.findall('.//' + qn('a:blip')):
        rid = blip.get(qn('r:embed'))
        if rid in doc.part.rels:
            try:
                return Image.open(io.BytesIO(doc.part.rels[rid].target_part.blob)).size
            except Exception:
                return None
    return None

def kill_para(p):
    p._element.getparent().remove(p._element)

doc = Document(DOC)
paras = doc.paragraphs

# ---- STEP 1: remove ER + DFD figures (image para + caption para) ----
REMOVE_CAPS = ('Figure 4.1.2:', 'Figure 4.1.3:', 'Figure 4.1.4:', 'Figure 4.1.5:')
to_kill = []
for i, p in enumerate(paras):
    t = p.text.strip()
    if t.startswith(REMOVE_CAPS):
        to_kill.append(p)
        if i > 0 and para_has_image(paras[i - 1]):
            to_kill.append(paras[i - 1])
for p in to_kill:
    kill_para(p)
print('removed paragraphs (ER+DFD imgs+captions):', len(to_kill))

# ---- STEP 2: full-width center all 16 user diagrams ----
doc2 = Document(DOC)  # reload not needed; work on same doc object after removal
# NOTE: paras list is stale after removal; rebuild paragraph walk from doc
fixed = 0
for p in doc.paragraphs:
    if not para_has_image(p):
        continue
    sz = embedded_size(p, doc)
    if sz in SIZE2FILE:
        # clear old drawing runs, re-add at full width centered
        for el in p._p.findall(qn('w:r')):
            if el.find(qn('w:drawing')) is not None:
                p._p.remove(el)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Cm(0.2)
        p.paragraph_format.space_after = Cm(0.2)
        run = p.add_run()
        run.add_picture(os.path.join(UBW, SIZE2FILE[sz]), width=Cm(FULL_W))
        fixed += 1
        print('full-view centered:', SIZE2FILE[sz])

print('centered diagrams:', fixed, '| inline images:', len(doc.inline_shapes))
STAGE = r'C:\Users\SAI\AppData\Local\Temp\opencode\CHAPTER_4_STAGED.docx'
doc.save(STAGE)
print('SAVED STAGE:', STAGE, round(os.path.getsize(STAGE) / 1024), 'KB')