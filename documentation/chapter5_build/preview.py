import os
import sys

import pymupdf

PDF = r"C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_5_System_Implementation_CODE_TESTING.pdf"
OUT = r"C:\Users\SAI\AppData\Local\Temp\opencode\ch5preview"
os.makedirs(OUT, exist_ok=True)

doc = pymupdf.open(PDF)
pages = int(sys.argv[1]) if len(sys.argv) > 1 else doc.page_count
end = int(sys.argv[2]) if len(sys.argv) > 2 else pages
print("total pages:", doc.page_count)
for i in range(pages - 1, min(end - 1, doc.page_count)):
    pg = doc[i]
    pix = pg.get_pixmap(dpi=72)
    pix.save(os.path.join(OUT, "p%03d.png" % (i + 1)))
print("rendered ->", OUT)
