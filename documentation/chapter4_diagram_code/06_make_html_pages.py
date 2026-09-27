"""Generate one standalone HTML per mermaid diagram for headless Edge screenshots."""
import os, html

SRC = r'C:\Users\SAI\Desktop\Raksha\documentation\chapter4_diagram_code\mermaid'
MD = os.path.join(SRC, 'ALL_DIAGRAMS.md')
OUTDIR = os.path.join(SRC, 'pages')
os.makedirs(OUTDIR, exist_ok=True)

nav = []
for line in open(MD, encoding='utf-8'):
    line = line.rstrip('\n')
    if line.startswith('## '):
        nav.append((line[3:].strip(), []))

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
        if cur is not None and line.strip():
            cur['code'].append(line)

for i, b in enumerate(blocks, 1):
    code = '\n'.join(b['code'])
    page = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>{html.escape(b['title'])}</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({{
  startOnLoad: true,
  theme: 'default',
  themeVariables: {{
    primaryColor: '#d6eaf8', primaryTextColor: '#17202a',
    primaryBorderColor: '#2e86de', lineColor: '#34495e',
    secondaryColor: '#d5f5e3', tertiaryColor: '#fdebd0',
    fontFamily: 'Segoe UI, Arial, sans-serif'
  }}
}});</script>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: white; padding: 24px; }}
  .cap {{ font-weight: 600; color: #10314f; margin-bottom: 12px; font-size: 15px; }}
  .mermaid {{ display: flex; justify-content: center; }}
</style>
</head>
<body>
<div class="cap">{html.escape(b['title'])}</div>
<pre class="mermaid">{html.escape(code)}</pre>
</body></html>'''
    p = os.path.join(OUTDIR, f'diagram_{i:02d}.html')
    with open(p, 'w', encoding='utf-8') as fh:
        fh.write(page)
print('pages written:', len(blocks), '->', OUTDIR)