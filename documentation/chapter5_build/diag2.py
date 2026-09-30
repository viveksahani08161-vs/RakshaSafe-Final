import collections

import pymupdf

PDF = r"C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_5_System_Implementation_CODE_TESTING.pdf"
doc = pymupdf.open(PDF)

kinds = collections.Counter()
detail = []
for i, pg in enumerate(doc):
    n_lines = 0
    big_img_area = 0.0
    imgs = 0
    for blk in pg.get_text("dict")["blocks"]:
        if blk.get("type") == 0:
            n_lines += len(blk["lines"])
    for im in pg.get_image_info():
        bb = im["bbox"]
        area = (bb[2] - bb[0]) * (bb[3] - bb[1])
        big_img_area += area
        imgs += 1
    page_area = pg.rect.width * pg.rect.height
    img_frac = big_img_area / page_area
    if img_frac > 0.25:
        k = "FIGURE"
    elif n_lines > 120:
        k = "CODE"
    elif n_lines > 45:
        k = "output"
    else:
        k = "text"
    kinds[k] += 1
    detail.append((i + 1, k, n_lines, imgs, round(img_frac, 2)))

for k, v in kinds.most_common():
    print("%-8s %3d pages" % (k, v))
print()
print("page kind  lines imgs imgfrac")
for n, k, l, im, f in detail:
    print("%4d %-8s %5d %4d  %.2f" % (n, k, l, im, f))
