# -*- coding: utf-8 -*-
"""SETTLE Chapter 4 layout: compact, clean, minimal pages.
 - keep_with_next on image paras  -> captions NEVER orphan to next page
 - keep_with_next on headings     -> no heading stuck at page bottom
 - tighter spacing (1.3 line, 4pt after) on Normal text
 - images still dead-center + equal L/R margins, all fit a page
 - screenshot width = min(13.5cm, 18.0cm tall cap)
"""
import io
from docx import Document
from docx.shared import Cm, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from PIL import Image

DOC = r'C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_4_RakshaSafe_System_Design_UML_REAL_CENTERED.docx'
import re

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

# 0) page: 1.9cm margins (wider usable area -> fewer pages)
for s in doc.sections:
    s.left_margin = Cm(1.9); s.right_margin = Cm(1.9)
    s.top_margin = Cm(1.9); s.bottom_margin = Cm(1.9)

# 1) Normal text: 1.1 line, 3pt after
n = doc.styles['Normal'].paragraph_format
n.line_spacing = 1.1
n.space_after = Pt(3)

n_img = n_cap = n_head = 0
for i, p in enumerate(doc.paragraphs):
    is_img = bool(p._p.findall('.//' + qn('a:blip')))
    is_cap = bool(p.text.strip().startswith(('Figure ', 'Flowchart ')))
    is_head = p.style.name.startswith('Heading')

    if is_img:
        sz = embedded_size(p, doc)
        if sz:
            w, h = sz; aspect = w / h
            if (w, h) == (2067, 2922):      # tall SOS A4-diagram -> ~15cm
                wcm = 10.6
            elif w >= 1857:
                wcm = {(2212, 1625): 14.0, (2729, 1193): 13.5}.get((w, h), 12.5)
            else:
                wcm = round(min(12.5, 17.0 * aspect), 2)
            hcm = wcm / aspect
            for inl in p._p.findall('.//' + qn('wp:inline')):
                from docx.shared import Emu
                ext = inl.find(qn('wp:extent'))
                ext.set('cx', str(Emu(Cm(wcm)).emu))
                ext.set('cy', str(Emu(Cm(hcm)).emu))
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Cm(0.12)
        p.paragraph_format.space_after = Cm(0.08)
        p.paragraph_format.keep_with_next = True   # caption stays with image
        p.paragraph_format.line_spacing = 1.0
        n_img += 1
    elif is_cap:
        p.paragraph_format.space_before = Cm(0.08)
        p.paragraph_format.space_after = Cm(0.35)
        p.paragraph_format.keep_with_next = False
        p.paragraph_format.line_spacing = 1.0
        n_cap += 1
    elif is_head:
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        n_head += 1
    elif not p.text.strip():
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
    else:
        p.paragraph_format.space_before = Pt(0)

print('imgs:%d caps:%d heads:%d total:%d' % (n_img, n_cap, n_head, len(doc.inline_shapes)))
STAGE = r'C:\Users\SAI\AppData\Local\Temp\opencode\CHAPTER_4_STAGED7.docx'
doc.save(STAGE)
import os
print('STAGED:', round(os.path.getsize(STAGE) / 1024), 'KB')