# -*- coding: utf-8 -*-
"""Build Chapter 5 - System Implementation (Code and Testing) for RakshaSafe.

Design rules implemented here:
  * every code listing is syntax highlighted (Pygments -> coloured runs) inside a
    shaded, bordered box with a coloured file-name bar;
  * every listing is followed on the SAME PAGE by the output it produced;
  * output screens (API JSON, terminal transcripts, live browser captures) are
    printed large, centred and framed;
  * one full-page diagram explains the code -> output flow;
  * pagination is explicit so no listing is ever split across a page break.
"""
import os
import re
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

from pygments import lex
from pygments.lexers import get_lexer_by_name
from pygments.lexers.data import JsonLexer
from pygments.token import Comment, Keyword, Name, Number, Operator, Punctuation, String, Text

ROOT = r"C:\Users\SAI\Desktop\Raksha"
BUILD = os.path.join(ROOT, "documentation", "chapter5_build")
SHOTS = os.path.join(ROOT, "documentation", "test-evidence", "screenshots")
PHOTOS = os.path.join(ROOT, "documentation", "testing")
FLOW = os.path.join(BUILD, "fig5_1_code_to_output_flow.png")
OUT_DOCX = os.environ.get(
    "CH5_DOCX",
    os.path.join(ROOT, "documentation", "CHAPTER_5_System_Implementation_CODE_TESTING.docx"),
)

MONO = "Consolas"
BODY_FONT = "Calibri"

# a listing longer than this may break across a page instead of stranding
# the paragraph that introduces it
ATOMIC_LINES = 22

# --------------------------------------------------------------------------
# palette
# --------------------------------------------------------------------------
INK = RGBColor(0x1F, 0x29, 0x37)
INK_SOFT = RGBColor(0x4B, 0x55, 0x63)
ACCENT = RGBColor(0x9A, 0x34, 0x12)
ACCENT2 = RGBColor(0x1D, 0x4E, 0xD8)
MUTED = RGBColor(0x6B, 0x72, 0x80)

CODE_BG = "F4F4F2"
CODE_BORDER = "C9C6C1"
TERM_BG = "1F2430"
JSON_BG = "F7F7F4"
NOTE_BG = "FDF6EC"
NOTE_BORDER = "E4C9A6"

# VS Code Light+ inspired token colours - colourful but still legible in print
TC = {
    "k": RGBColor(0x00, 0x00, 0xC0),      # keyword
    "kf": RGBColor(0x00, 0x00, 0xC0),     # keyword.function
    "s": RGBColor(0xA3, 0x15, 0x15),      # string
    "c": RGBColor(0x60, 0x8B, 0x4E),      # comment
    "n": RGBColor(0x09, 0x86, 0x58),      # number
    "f": RGBColor(0x79, 0x5E, 0x26),      # function / class name
    "t": RGBColor(0x26, 0x7F, 0x99),      # type
    "d": RGBColor(0x79, 0x5E, 0x26),      # decorator
    "o": RGBColor(0x44, 0x44, 0x44),      # operator
    "p": RGBColor(0x50, 0x50, 0x50),      # punctuation
    "v": RGBColor(0x00, 0x00, 0x00),      # plain / variable
    "err": RGBColor(0xB0, 0x20, 0x20),
}

TERM_DEF = RGBColor(0xE5, 0xE7, 0xEB)
TERM_CMD = RGBColor(0x86, 0xEF, 0xAC)
TERM_TAG = RGBColor(0xFD, 0xC3, 0x4D)
TERM_KEY = RGBColor(0xC4, 0xB5, 0xFD)
TERM_ERR = RGBColor(0xFC, 0xA5, 0xA5)

JSON_KEY = RGBColor(0x0B, 0x6E, 0x99)
JSON_STR = RGBColor(0xA3, 0x15, 0x15)
JSON_NUM = RGBColor(0x09, 0x86, 0x58)
JSON_LIT = RGBColor(0x79, 0x5E, 0x26)


# --------------------------------------------------------------------------
# low level xml helpers
# --------------------------------------------------------------------------
def _shade(element, fill):
    pr = element.get_or_add_pPr() if element.tag.endswith("}p") else element
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    pr.append(shd)


def shade_paragraph(p, fill):
    _shade(p._p, fill)


def shade_cell(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tcPr.append(shd)


def cell_margins(cell, top=40, bottom=40, left=90, right=90):
    tcPr = cell._tc.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for tag, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement("w:" + tag)
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tcPr.append(mar)


def table_borders(table, color="C9C6C1", size=6, kinds=("top", "left", "bottom", "right", "insideH", "insideV")):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for kind in kinds:
        el = OxmlElement("w:" + kind)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(size))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tblPr.append(borders)


def cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:cantSplit")
    trPr.append(el)


def keep_next(p, on=True):
    p.paragraph_format.keep_with_next = on


def set_mono(run, size=7.6, color=None, bold=False, italic=False):
    run.font.name = MONO
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts")
        rpr.append(rf)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(attr), MONO)
    run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic


def set_body(run, size=11, color=INK, bold=False, italic=False, font=BODY_FONT):
    run.font.name = font
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts")
        rpr.append(rf)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(attr), font)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic


def picture_border(inline_shape, color="9C968E", pt=8):
    spPr = inline_shape._inline.graphic.graphicData.pic.spPr
    for old in spPr.findall(qn("a:ln")):
        spPr.remove(old)
    ln = OxmlElement("a:ln")
    ln.set("w", str(int(pt * 12700)))
    fill = OxmlElement("a:solidFill")
    clr = OxmlElement("a:srgbClr")
    clr.set("val", color)
    fill.append(clr)
    ln.append(fill)
    spPr.append(ln)


def add_page_number_footer(section, left_text):
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(left_text + "        Page ")
    set_body(r, size=8.5, color=MUTED)

    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    run_el = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), "17")
    rpr.append(sz)
    col = OxmlElement("w:color")
    col.set(qn("w:val"), "6B7280")
    rpr.append(col)
    run_el.append(rpr)
    txt = OxmlElement("w:t")
    txt.text = "1"
    run_el.append(txt)
    fld.append(run_el)
    p._p.append(fld)


def add_header(section, text):
    hp = section.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = hp.add_run(text)
    set_body(r, size=8.5, color=MUTED, italic=True)
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), "D6D3D1")
    pbdr.append(bottom)
    hp._p.get_or_add_pPr().append(pbdr)


# --------------------------------------------------------------------------
# token -> colour mapping for pygments output
# --------------------------------------------------------------------------
def classify(ttype, value):
    if ttype in Comment:
        return "c"
    if ttype in Keyword:
        return "kf" if "func" in str(ttype) else "k"
    if ttype in String:
        return "s"
    if ttype in Number:
        return "n"
    if ttype in Operator:
        return "o"
    if ttype in Punctuation:
        return "p"
    if ttype in Name:
        if ttype in Name.Builtin:
            return "t"
        if ttype in Name.Function or ttype in Name.Class:
            return "f"
        if ttype in Name.Decorator:
            return "d"
        return "v"
    return "v"


LEXER_FOR = {
    ".ts": "typescript", ".tsx": "tsx", ".py": "python",
    ".js": "javascript", ".mjs": "javascript", ".json": "json",
    ".ps1": "powershell", ".": "text",
}

# every layout element is recorded here so the page plan can be audited
REGISTRY = []


def log_block(kind, label, nlines, size):
    REGISTRY.append({"kind": kind, "label": label, "lines": nlines,
                     "size": size, "pt": round(nlines * size * 1.36 + 12, 1)})
    return REGISTRY[-1]


def report_plan(usable_pt=732.0):
    """Print a page-budget audit of everything the builder emitted."""
    print("%-10s %5s %6s  %s" % ("kind", "lines", "pt", "label"))
    page, pages = 1, [[]]
    for r in REGISTRY:
        if r["kind"] == "pagebreak":
            page += 1
            pages.append([r])
            continue
        pages[-1].append(r)
    over = 0
    for i, blocks in enumerate(pages, 1):
        tot = sum(x["pt"] for x in blocks)
        head = next((x["label"] for x in blocks if x["kind"] in ("pagebreak", "code", "figure", "output")), "")
        mark = "  OVER by %.0f" % (tot - usable_pt) if tot > usable_pt else ""
        if tot > usable_pt:
            over += 1
        print("  p%-3d %6.0f / %.0f pt%s   %s" % (i, tot, usable_pt, mark, head[:52]))
        for x in blocks:
            print("          %-9s %5.1f  %s" % (x["kind"], x["pt"], x["label"][:56]))
    total = sum(r["pt"] for r in REGISTRY)
    print()
    print("planned pages: %d   over budget: %d   content pt: %.0f (%.1f pages)" % (
        len(pages), over, total, total / usable_pt))
    return pages, over


def lang_for(path):
    return LEXER_FOR.get(os.path.splitext(path)[1], "text")


def read_lines(abs_path, start, end):
    with open(abs_path, encoding="utf-8") as fh:
        src = fh.read().replace("\r\n", "\n").split("\n")
    return src[start - 1:end]


# --------------------------------------------------------------------------
# document building blocks
# --------------------------------------------------------------------------
class Builder:
    def __init__(self):
        self.doc = Document()
        self.fig = 0
        self.tab = 0
        self._setup()

    def _setup(self):
        d = self.doc
        st = d.styles["Normal"]
        st.font.name = BODY_FONT
        st.font.size = Pt(10)
        st.font.color.rgb = INK
        st.paragraph_format.space_after = Pt(5)
        st.paragraph_format.line_spacing = 1.1

        sec = d.sections[0]
        sec.page_width = Cm(21.0)
        sec.page_height = Cm(29.7)
        sec.left_margin = Cm(1.7)
        sec.right_margin = Cm(1.7)
        sec.top_margin = Cm(1.6)
        sec.bottom_margin = Cm(1.4)
        sec.header_distance = Cm(1.0)
        sec.footer_distance = Cm(0.9)
        add_header(sec, "RakshaSafe  |  Chapter 5: System Implementation (Code and Testing)")
        add_page_number_footer(sec, "RakshaSafe - AI-Powered Women Safety and Disaster Response System")

    # -- text -------------------------------------------------------------
    def newpage(self, label=""):
        """Force a page break without printing a heading."""
        p = self.doc.add_paragraph()
        p.paragraph_format.page_break_before = True
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1
        set_mono(p.add_run(""), size=1)
        log_block("pagebreak", label or "(continuation)", 0, 1)
        return p

    def h1(self, text, page_break=False):
        p = self.doc.add_paragraph()
        if page_break:
            p.paragraph_format.page_break_before = True
            log_block("pagebreak", text, 0, 1)
        pf = p.paragraph_format
        pf.space_before = Pt(0)
        pf.space_after = Pt(5)
        pf.keep_with_next = True
        r = p.add_run(text)
        set_body(r, size=14.5, color=ACCENT, bold=True)
        pbdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "12")
        bottom.set(qn("w:space"), "6")
        bottom.set(qn("w:color"), "C2410C")
        pbdr.append(bottom)
        p._p.get_or_add_pPr().append(pbdr)
        return p

    def h2(self, text, page_break=False):
        p = self.doc.add_paragraph()
        if page_break:
            p.paragraph_format.page_break_before = True
            log_block("pagebreak", text, 0, 1)
        pf = p.paragraph_format
        pf.space_before = Pt(8)
        pf.space_after = Pt(3)
        pf.keep_with_next = True
        r = p.add_run(text)
        set_body(r, size=11.5, color=RGBColor(0x1D, 0x4E, 0xD8), bold=True)
        return p

    def h3(self, text):
        p = self.doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(6)
        pf.space_after = Pt(2)
        pf.keep_with_next = True
        r = p.add_run(text)
        set_body(r, size=10, color=RGBColor(0x7C, 0x2D, 0x12), bold=True)
        return p

    def body(self, text, size=9.6, italic=False, color=INK, space_after=5, align=None, bold=False):
        p = self.doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_after = Pt(space_after)
        pf.keep_with_next = True
        if align is not None:
            p.alignment = align
        r = p.add_run(text)
        set_body(r, size=size, color=color, italic=italic, bold=bold)
        return p

    def bullet(self, text, size=9.4, indent=0.55):
        p = self.doc.add_paragraph()
        pf = p.paragraph_format
        pf.left_indent = Cm(indent + 0.4)
        pf.first_line_indent = Cm(-0.4)
        pf.space_after = Pt(2.5)
        pf.keep_with_next = True
        r = p.add_run("\u2022  " + text)
        set_body(r, size=size, color=INK)
        return p

    def page_break(self):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.add_run().add_break(WD_BREAK.PAGE)
        return p

    # -- code -------------------------------------------------------------
    def _spacer(self, pts=2):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1
        for r in p.runs:
            set_mono(r, size=pts)
        run = p.add_run("")
        set_mono(run, size=pts)
        return p

    def _tight(self, p, size, before=0, after=0, line=1.0):
        pf = p.paragraph_format
        pf.space_before = Pt(before)
        pf.space_after = Pt(after)
        pf.line_spacing = line
        pf.right_indent = Cm(0)
        pf.keep_together = True
        return p

    def code(self, rel_path, start, end, size=6.9, note=None, lang=None, tint=None):
        """Print a real, syntax-highlighted excerpt of a repository file."""
        abs_path = os.path.join(ROOT, rel_path.replace("/", os.sep))
        if not os.path.exists(abs_path):
            raise SystemExit("MISSING SOURCE FILE: " + abs_path)
        lines = read_lines(abs_path, start, end)
        lexer = get_lexer_by_name(lang or lang_for(abs_path))
        total = len(read_lines(abs_path, 1, 10 ** 6))

        self._filebar(rel_path, start, end, total, tint or "1D4ED8", note)
        self._spacer(1)
        log_block("code", "%s  L%d-%d" % (rel_path, start, end), len(lines), size)

        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        table.columns[0].width = Cm(17.4)
        table_borders(table, CODE_BORDER, 6)
        atomic = len(lines) <= ATOMIC_LINES
        if atomic:
            cant_split(table.rows[0])
        cell = table.rows[0].cells[0]
        cell.width = Cm(17.4)
        shade_cell(cell, CODE_BG)
        cell_margins(cell, 60, 60, 110, 90)

        # drop the placeholder empty paragraph
        cell.paragraphs[0]._p.getparent().remove(cell.paragraphs[0]._p)

        for idx, line in enumerate(lines):
            p = cell.add_paragraph()
            last = idx == len(lines) - 1
            self._tight(p, size, line=0.95)
            if atomic and not last:
                p.paragraph_format.keep_with_next = True
            self._paint(p, line, lexer, size, start + idx)

        tail = self.doc.add_paragraph()
        tail.paragraph_format.space_after = Pt(0)
        tail.paragraph_format.space_before = Pt(0)
        tail.paragraph_format.line_spacing = 1
        tr = tail.add_run("")
        set_mono(tr, size=2)
        return table

    def _filebar(self, rel_path, start, end, total, color, note=None):
        p = self.doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(6)
        pf.space_after = Pt(0)
        pf.keep_with_next = True
        pf.line_spacing = 1.0
        r = p.add_run("  FILE  ")
        set_body(r, size=6.8, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True)
        r2 = p.add_run(" " + rel_path)
        set_mono(r2, size=7.2, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True)
        r3 = p.add_run("   lines %d-%d of %d" % (start, end, total))
        set_mono(r3, size=6.6, color=RGBColor(0xE2, 0xE8, 0xF0))
        if note:
            r4 = p.add_run("   // " + note)
            set_mono(r4, size=6.6, color=RGBColor(0xBF, 0xDB, 0xFE), italic=True)
        shade_paragraph(p, color)
        return p

    def _paint(self, p, line, lexer, size, lineno):
        if not line.strip():
            run = p.add_run(" ")
            set_mono(run, size=size)
            return
        try:
            toks = lex(line, lexer)
        except Exception:
            toks = [(Text, line)]
        col = TC
        for ttype, value in toks:
            if not value:
                continue
            run = p.add_run(value.replace("\t", "  "))
            kind = classify(ttype, value)
            it = bool(ttype in Comment) or value.strip().startswith("//")
            set_mono(run, size=size, color=col.get(kind, col["v"]), italic=it)
        if p.runs and not p.runs[0].text.strip() and len(p.runs) > 1:
            pass

    # -- terminal / json --------------------------------------------------
    def terminal(self, lines, title="Console output captured on the live system",
                 caption=None, size=6.9, error_lines=()):
        self._outbar(title, "111827", "\u25B6  LIVE OUTPUT")
        log_block("output", title, len(lines), size)
        table = self._outbox(TERM_BG, "3F4756", atomic=len(lines) <= ATOMIC_LINES)
        cell = table.rows[0].cells[0]
        cell.paragraphs[0]._p.getparent().remove(cell.paragraphs[0]._p)
        atomic = len(lines) <= ATOMIC_LINES
        for i, line in enumerate(lines):
            p = cell.add_paragraph()
            last = i == len(lines) - 1
            self._tight(p, size, line=0.95)
            if atomic and not last:
                p.paragraph_format.keep_with_next = True
            col = self._term_color(line, error_lines)
            run = p.add_run(line if line else " ")
            set_mono(run, size=size, color=col, bold=line.startswith("PS "))
        self._outtail()
        if caption:
            self.plain_caption(caption)
        return table

    def _term_color(self, line, error_lines):
        s = line.strip()
        if any(m in line for m in error_lines):
            return TERM_ERR
        if s.startswith("PS ") or s.startswith(">"):
            return TERM_CMD
        if s.startswith("["):
            return TERM_TAG
        if s.startswith("{") or s.startswith("http") or ": " in s and s.endswith(":"):
            return TERM_KEY
        return TERM_DEF

    def jsonbox(self, obj_text, title, caption=None, size=6.9):
        self._outbar(title, "0F766E", "\u25B6  RESPONSE")
        log_block("output", title, obj_text.rstrip("\n").count("\n") + 1, size)
        nlines = obj_text.rstrip("\n").count("\n") + 1
        table = self._outbox(JSON_BG, "CBD5E1", atomic=nlines <= ATOMIC_LINES)
        cell = table.rows[0].cells[0]
        cell.paragraphs[0]._p.getparent().remove(cell.paragraphs[0]._p)
        jl = JsonLexer(ensurenl=False)
        for k, line in enumerate(obj_text.rstrip("\n").split("\n")):
            p = cell.add_paragraph()
            self._tight(p, size, line=0.95)
            if nlines <= ATOMIC_LINES:
                p.paragraph_format.keep_with_next = True
            self._paint_json(p, line, jl, size)
        if cell.paragraphs and nlines <= ATOMIC_LINES:
            cell.paragraphs[-1].paragraph_format.keep_with_next = False
        self._outtail()
        if caption:
            self.plain_caption(caption)
        return table

    def _paint_json(self, p, line, lexer, size):
        toks = list(lex(line, lexer))
        if len(toks) <= 1:
            run = p.add_run(line)
            set_mono(run, size=size, color=INK)
            return
        for ttype, value in toks:
            if not value:
                continue
            if ttype in Name:
                col = JSON_KEY
            elif ttype in String:
                col = JSON_STR
            elif ttype in Number:
                col = JSON_NUM
            elif ttype in Keyword:
                col = JSON_LIT
            else:
                col = RGBColor(0x44, 0x44, 0x44)
            run = p.add_run(value)
            set_mono(run, size=size, color=col, bold=(ttype in Name))

    def _outbar(self, title, color, tag):
        p = self.doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(4)
        pf.space_after = Pt(0)
        pf.keep_with_next = True
        pf.line_spacing = 1.0
        r = p.add_run("  " + tag + "   ")
        set_body(r, size=6.8, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True)
        r2 = p.add_run(title)
        set_body(r2, size=7.4, color=RGBColor(0xFF, 0xFF, 0xFF))
        shade_paragraph(p, color)
        return p

    def _outbox(self, fill, border, atomic=True):
        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        table.columns[0].width = Cm(17.4)
        table_borders(table, border, 6)
        if atomic:
            cant_split(table.rows[0])
        cell = table.rows[0].cells[0]
        cell.width = Cm(17.4)
        shade_cell(cell, fill)
        cell_margins(cell, 60, 60, 110, 90)
        return table

    def _outtail(self):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.line_spacing = 1
        r = p.add_run("")
        set_mono(r, size=2)
        return p

    # -- note box ---------------------------------------------------------
    def note(self, label, text, color="7C2D12", fill=NOTE_BG, border=NOTE_BORDER):
        table = self._outbox(fill, border)
        cell = table.rows[0].cells[0]
        cell.paragraphs[0]._p.getparent().remove(cell.paragraphs[0]._p)
        p = cell.add_paragraph()
        self._tight(p, 8.6, line=1.12)
        r = p.add_run(label + "  ")
        set_body(r, size=8.6, color=RGBColor.from_string(color), bold=True)
        r2 = p.add_run(text)
        set_body(r2, size=8.6, color=INK)
        self._outtail()
        return table

    # -- figure -----------------------------------------------------------
    def figure(self, image_path, caption, width_cm=16.4, border="9C968E", keep=True,
               max_h_cm=9.4):
        if not os.path.exists(image_path):
            raise SystemExit("MISSING IMAGE: " + image_path)
        try:
            from PIL import Image
            with Image.open(image_path) as im:
                iw, ih = im.size
        except Exception:
            iw, ih = 1600, 900
        # a portrait phone capture must not swallow a whole page
        if width_cm * (ih / float(iw)) > max_h_cm:
            width_cm = max_h_cm * (iw / float(ih))
        h_cm = width_cm * (ih / float(iw))
        log_block("figure", os.path.basename(image_path), int(h_cm * 28.35), 1)
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pf = p.paragraph_format
        pf.space_before = Pt(4)
        pf.space_after = Pt(2)
        if keep:
            pf.keep_with_next = True
        run = p.add_run()
        shape = run.add_picture(image_path, width=Cm(width_cm))
        picture_border(shape, border, 6)
        self.fig += 1
        cp = self.doc.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cpf = cp.paragraph_format
        cpf.space_before = Pt(0)
        cpf.space_after = Pt(5)
        cpf.keep_together = True
        cr = cp.add_run("Figure 5.%d  " % self.fig)
        set_body(cr, size=8.2, color=ACCENT, bold=True)
        cr2 = cp.add_run(caption)
        set_body(cr2, size=8.2, color=INK_SOFT)
        return p

    def plain_caption(self, text):
        p = self.doc.add_paragraph()
        cpf = p.paragraph_format
        cpf.space_before = Pt(0)
        cpf.space_after = Pt(4)
        cpf.keep_together = True
        cr = p.add_run(text)
        set_body(cr, size=7.8, color=MUTED, italic=True)
        return p

    def save(self, path):
        self.doc.save(path)


# --------------------------------------------------------------------------
# table of the real directory tree
# --------------------------------------------------------------------------
def real_tree(b, roots):
    def walk(rel, depth, maxdepth):
        out = []
        base = os.path.join(ROOT, rel.replace("/", os.sep)) if rel else ROOT
        try:
            names = sorted(os.listdir(base))
        except OSError:
            return out
        names = [n for n in names if not n.startswith(".") and n not in
                 ("node_modules", "dist", "venv", "__pycache__", "build", ".git")]
        dirs = [n for n in names if os.path.isdir(os.path.join(base, n))]
        files = [n for n in names if not os.path.isdir(os.path.join(base, n))]
        ordered = dirs + files
        for i, n in enumerate(ordered):
            last = i == len(ordered) - 1
            conn = "`-- " if last else "|-- "
            path = os.path.join(rel, n).replace("\\", "/")
            if os.path.isdir(os.path.join(base, n)):
                out.append(("  " * depth + conn + n + "/", path, True, depth))
                if depth < maxdepth:
                    out.extend(walk(path, depth + 1, maxdepth))
            else:
                out.append(("  " * depth + conn + n, path, False, depth))
        return out

    lines = []
    for rel, md in roots:
        lines.append(("%s/" % rel, rel, True, 0))
        lines.extend(walk(rel, 1, md))

    log_block("tree", "repository layout", len(lines), 7.2)
    table = b._outbox(CODE_BG, CODE_BORDER)
    cell = table.rows[0].cells[0]
    cell.paragraphs[0]._p.getparent().remove(cell.paragraphs[0]._p)
    b._filebar("repository layout (generated from the real source tree)", 0, 0, 0, "44403C")
    for text, path, is_dir, depth in lines:
        p = cell.add_paragraph()
        b._tight(p, 7.2, line=0.95)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        set_mono(run, size=7.2, color=(RGBColor(0x1D, 0x4E, 0xD8) if is_dir else RGBColor(0x33, 0x33, 0x33)),
                  bold=depth == 0)
    cell.paragraphs[-1].paragraph_format.keep_with_next = False
    b._outtail()
    return table
