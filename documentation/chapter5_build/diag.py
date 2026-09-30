import pymupdf

PDF = r"C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_5_System_Implementation_CODE_TESTING.pdf"
doc = pymupdf.open(PDF)

HEADER_Y = 62.0
FOOTER_Y = 780.0

print("page  bodyTop bodyBot  gapAfter  blocks  first heading")
total_waste = 0.0
for i, pg in enumerate(doc):
    spans = []
    for blk in pg.get_text("dict")["blocks"]:
        if blk.get("type") != 0:
            continue
        for ln in blk["lines"]:
            for sp in ln["spans"]:
                x0, y0, x1, y1 = sp["bbox"]
                if sp["text"].strip() and y0 > HEADER_Y and y1 < FOOTER_Y:
                    spans.append((y0, y1, sp["text"].strip()))
    for d in pg.get_drawings():
        rr = d["rect"]
        if rr.width > 20 and rr.height > 2 and rr.y0 > HEADER_Y and rr.y1 < FOOTER_Y:
            spans.append((rr.y0, rr.y1, ""))
    for im in pg.get_image_info():
        bb = im["bbox"]
        if bb[3] < FOOTER_Y and bb[1] > HEADER_Y:
            spans.append((bb[1], bb[3], ""))

    if not spans:
        print("%4d  %8s %8s" % (i + 1, "-", "-"))
        continue
    spans.sort()
    top, bot = spans[0][0], max(s[1] for s in spans)
    biggest = 0.0
    for a, c in zip(spans, spans[1:]):
        biggest = max(biggest, c[0] - a[1])
    waste = max(0.0, (FOOTER_Y - bot) / (FOOTER_Y - HEADER_Y))
    total_waste += waste
    head = next((s[2] for s in spans if s[2].startswith("5.")), spans[0][2])
    print("%4d  %7.0f %8.0f  %7.0f  %6d  %s" % (
        i + 1, top, bot, biggest, len(spans), head[:48]))
    if waste > 0.15:
        print("        ^ %.0f%% of the body is empty at the bottom" % (waste * 100))

print()
print("pages: %d   wasted page-equivalents: %.1f   effective: %.1f" % (
    doc.page_count, total_waste, doc.page_count - total_waste))
