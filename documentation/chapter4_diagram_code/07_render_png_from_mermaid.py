"""Render all 16 mermaid pages via headless Edge, autocrop, save PNGs."""
import os, subprocess, io
from PIL import Image, ImageChops

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
PAGES = r'C:\Users\SAI\Desktop\Raksha\documentation\chapter4_diagram_code\mermaid\pages'
OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\chapter4_diagram_code\mermaid\png'
os.makedirs(OUT, exist_ok=True)
TMP = r'C:\Users\SAI\AppData\Local\Temp\opencode'
os.makedirs(TMP, exist_ok=True)

pages = sorted(f for f in os.listdir(PAGES) if f.endswith('.html'))
print('pages:', len(pages))
results = []
for i, page in enumerate(pages, 1):
    tmp = os.path.join(TMP, f'raw_{i:02d}.png')
    url = 'file:///' + os.path.join(PAGES, page).replace('\\', '/')
    cmd = [EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--force-device-scale-factor=2', '--virtual-time-budget=8000',
           '--window-size=1600,1100', f'--screenshot={tmp}', url]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if not os.path.exists(tmp):
        results.append((page, 'NO-SCREENSHOT', r.stderr[:120]))
        continue
    im = Image.open(tmp).convert('RGB')
    # autocrop: trim white border
    bg = Image.new('RGB', im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg)
    bbox = diff.getbbox()
    if bbox:
        pad = 24
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
        x1 = min(im.width, x1 + pad); y1 = min(im.height, y1 + pad)
        im = im.crop((x0, y0, x1, y1))
    outp = os.path.join(OUT, f'diagram_{i:02d}.png')
    im.save(outp)
    colors = len(im.resize((80, 80)).getcolors(20000)) if False else len(im.resize((120, 120)).getcolors(30000))
    results.append((page, im.size, round(os.path.getsize(outp) / 1024), colors))

for res in results:
    print(res)
os.remove(tmp) if os.path.exists(tmp) else None
print('DONE ->', OUT)