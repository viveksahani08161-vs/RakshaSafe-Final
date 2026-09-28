# -*- coding: utf-8 -*-
"""Center ALL Chapter 4 images with equal L/R space + fit-to-page.
SAFE: keeps the exact same embedded image bytes, only edits display extent.
  diagrams   : 12.5cm (flowcharts), 14.0 (arch), 13.5 (depl) + CENTER
  screenshots: width = min(14.0, 19.5*aspect) + CENTER  -> equal margins, fits page
"""
import io
from docx import Document
from docx.shared import Cm, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from PIL import Image

DOC = r'C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_4_RakshaSafe_System_Design_UML_REAL_CENTERED.docx'

def embedded_size(p, doc):
    for blip in p._p.findall('.//' + qn('a:blip')):
        rid = blip.get(qn('r:embed'))
        if rid in doc.part.rels:
            try:
                return Image.open(io.BytesIO(doc.part.rels[rid].target_part.blob)).size
            except Exception:
                return None
    return None

doc = Document(DOC)
n = 0
for p in doc.paragraphs:
    inlines = p._p.findall('.//' + qn('wp:inline'))
    if not inlines:
        continue
    sz = embedded_size(p, doc)
    if sz is None:
        continue
    w, h = sz
    aspect = w / h
    if w >= 1857:  # user diagram
        wcm = {(2212, 1625): 14.0, (2729, 1193): 13.5}.get((w, h), 12.5)
    else:  # screenshot
        wcm = round(min(14.0, 19.5 * aspect), 2)
    hcm = wcm / aspect
    for inl in inlines:
        ext = inl.find(qn('wp:extent'))
        ext.set('cx', str(Emu(Cm(wcm)).emu))
        ext.set('cy', str(Emu(Cm(hcm)).emu))
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if p.paragraph_format.space_before is None:
        p.paragraph_format.space_before = Cm(0.3)
    if p.paragraph_format.space_after is None:
        p.paragraph_format.space_after = Cm(0.3)
    n += 1
    print('para img %dx%d -> %.2f x %.2f cm CENTER' % (w, h, wcm, hcm))

print('fixed:', n, '| images:', len(doc.inline_shapes))
STAGE = r'C:\Users\SAI\AppData\Local\Temp\opencode\CHAPTER_4_STAGED3.docx'
doc.save(STAGE)
import os
print('STAGED:', round(os.path.getsize(STAGE) / 1024), 'KB')