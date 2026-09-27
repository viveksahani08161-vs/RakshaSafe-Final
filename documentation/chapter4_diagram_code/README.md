# RakshaSafe - Chapter 4 System Design - Diagram Code & Images

Ye folder Chapter 4 ke saare diagram banaane wale **source code** aur unse bani **images** ko
ek jagah organize karta hai.

## Final Word Document (ready)
`../CHAPTER_4_RakshaSafe_System_Design_UML_FINAL.docx` — saare 30 images ke saath final file.
- 16 Black & White StarUML-style diagrams (flowcharts, architecture, deployment)
- 14 colorful dummy interface screenshots
- content text black & white

## Diagram Images
| Folder | Kya hai |
|---|---|
| `../ch4_bw/` | 16 B&W StarUML-style PNGs (14 flowcharts + architecture + deployment) |
| `../ch4_images/` | 14 colorful dummy interface screenshots + 2 colorful system diagrams |
| `mermaid/png/` | 16 Mermaid-rendered PNGs (colorful alternative) |
| `mermaid/*.mmd` | Mermaid source code (mermaid.live mein paste karo) |
| `mermaid/view_all_diagrams.html` | Browser mein kholo -> saare diagrams + Download PNG |

## Source Code (Python)
| File | Kya banata hai |
|---|---|
| `01_flowcharts_and_system_diagrams.py` | Colorful flowcharts (matplotlib) |
| `02_interface_screenshots.py` | Colorful dummy UI screenshots (PIL) |
| `03_fill_word_document.py` | Images ko Word doc mein insert karta hai |
| `04_mermaid_from_chapter4.py` | Sab 16 diagrams ka Mermaid code banata hai |
| `05_html_viewer.py` | HTML viewer banata hai |
| `06_make_html_pages.py` | Mermaid ke liye individual HTML pages |
| `07_render_png_from_mermaid.py` | Mermaid PNG render (headless Edge) |
| `08_uml_flowcharts.py` | **B&W StarUML flowcharts (auto text-fit, no overflow)** |
| `09_uml_architecture_deployment.py` | **B&W StarUML architecture + deployment** |

## Require
- Python 3.12
- `pip install python-docx matplotlib pillow pygments`
- Node.js (sirf mermaid PNG render ke liye)

## Quick regenerate
```powershell
python 08_uml_flowcharts.py
python 09_uml_architecture_deployment.py
python 03_fill_word_document.py
```