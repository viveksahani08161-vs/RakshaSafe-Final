"""Build a single self-contained HTML viewer that renders all Chapter 4 Mermaid diagrams."""
import os, html, json

OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\chapter4_diagram_code\mermaid'
MD = os.path.join(OUT, 'ALL_DIAGRAMS.md')

blocks = []
cur = None
for line in open(MD, encoding='utf-8'):
    line = line.rstrip('\n')
    if line.startswith('## '):
        cur = {'title': line[3:].strip(), 'code': []}
        blocks.append(cur)
    elif line.startswith('```mermaid') or line == '```':
        continue
    else:
        if cur is not None:
            cur['code'].append(line)

html_parts = []
html_parts.append('''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>RakshaSafe Chapter 4 — Diagrams</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  themeVariables: {
    primaryColor: '#d6eaf8',
    primaryTextColor: '#17202a',
    primaryBorderColor: '#2e86de',
    lineColor: '#34495e',
    secondaryColor: '#d5f5e3',
    tertiaryColor: '#fdebd0',
    fontFamily: 'Segoe UI, Arial, sans-serif'
  }
});
function exportPng(id, title) {
  const svg = document.getElementById(id).querySelector('svg');
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  img.onload = function () {
    const scale = 2;
    const cv = document.createElement('canvas');
    cv.width = img.width * scale;
    cv.height = img.height * scale;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(function (blob) {
      const a = document.createElement('a');
      a.download = title.replace(/[^a-z0-9]+/gi, '_') + '.png';
      a.href = URL.createObjectURL(blob);
      a.click();
    }, 'image/png');
  };
  img.src = 'data:image/svg+xml;base64,' + svg64;
}
function copyCode(elemId) {
  const el = document.getElementById(elemId);
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(function () {
    const b = document.querySelector('[data-copy="' + elemId + '"]');
    b.textContent = 'Copied!';
    setTimeout(function () { b.textContent = 'Copy code'; }, 1200);
  });
}
</script>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #f0f4f8; color: #17202a; }
  header { background: #10314f; color: #fff; padding: 22px 30px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 6px 0 0; color: #c9ddec; font-size: 13px; }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 26px; }
  .card { background: #fff; border: 1px solid #d9e2ec; border-radius: 12px; margin: 22px 0; overflow: hidden; }
  .card h2 { margin: 0; padding: 14px 20px; background: #1f6feb; color: #fff; font-size: 16px; }
  .diagram { padding: 26px 20px; overflow-x: auto; text-align: center; }
  .diagram svg { max-width: 100%; height: auto; }
  .tools { padding: 8px 20px 18px; display: flex; gap: 10px; }
  .tools button { border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px; cursor: pointer; font-weight: 600; }
  .btn-png { background: #0e9f6e; color: #fff; }
  .btn-copy { background: #f1f5f9; color: #1f6feb; border: 1px solid #cbd5e1 !important; }
  .codebox { display: none; } 
  .note { max-width: 1000px; margin: 0 auto; padding: 0 26px 30px; }
  .note ul { background: #fff; border: 1px solid #d9e2ec; border-radius: 12px; padding: 18px 26px; line-height: 1.7; }
</style>
</head>
<body>
<header>
  <h1>RakshaSafe — Chapter 4 System Design Diagrams</h1>
  <p>Open this file in your browser. Use "Download PNG" to export any diagram free.</p>
</header>
<div class="wrap">''')

for i, b in enumerate(blocks, 1):
    code = '\n'.join(b['code'])
    uid = f'dg{i}'
    code_id = uid + '_code'
    html_parts.append(f'''
  <div class="card">
    <h2>{i}. {html.escape(b['title'])}</h2>
    <div class="diagram" id="{uid}">
      <pre class="mermaid">{html.escape(code)}</pre>
    </div>
    <div class="tools">
      <button class="btn-png" onclick="exportPng('{uid}', '{html.escape(b["title"])}')">Download PNG</button>
      <button class="btn-copy" data-copy="{code_id}" onclick="copyCode('{code_id}')">Copy code</button>
    </div>
    <pre class="codebox" id="{code_id}">{html.escape(code)}</pre>
  </div>''')

html_parts.append('''</div>
<div class="note">
<ul>
  <li><b>Edit online:</b> open <code>mermaid.live</code>, paste the copied code, edit text, download PNG free.</li>
  <li><b>draw.io (free):</b> File → New → Flowchart; paste text by right-clicking a shape → Edit → Edit Data.</li>
  <li>All diagrams here are matches to the images already placed in <b>CHAPTER_4_RakshaSafe_System_Design_FINAL.docx</b>.</li>
</ul>
</div>
</body>
</html>''')

with open(os.path.join(OUT, 'view_all_diagrams.html'), 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(html_parts))
print('HTML viewer written:', os.path.join(OUT, 'view_all_diagrams.html'))