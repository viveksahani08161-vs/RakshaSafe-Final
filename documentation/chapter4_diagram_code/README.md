# RakshaSafe - Chapter 4 System Design - Diagram Code & Images

Ye folder Chapter 4 ke saare diagram banaane wale **source code** aur unse bani **images** ko
ek jagah organize karta hai.

## Final Word Document (ready)
`../CHAPTER_4_RakshaSafe_System_Design_UML_REAL_CENTERED.docx` — FINAL file, saare 30 images ke saath.
- 16 USER diagrams (png/ folder se, pure B&W convert karke, BEECH mein CENTER + MEDIUM size: flowcharts 12.5cm, architecture 14cm, deployment 13.5cm)
- 14 REAL interface screenshots (live app ke captures: register, dashboard, SOS, incident detail, admin screens)
- ER aur DFD diagrams HATA diye gaye hain (user request)
- content text black & white
- PDF: `../CHAPTER_4_RakshaSafe_System_Design_MEDIUM.pdf` (46 pages)

## Diagram Images
| Folder | Kya hai |
|---|---|
| `../../png/` | 16 user ke original colored diagrams (diagram_01..16) |
| `../ch4_bw_user/` | 16 user diagrams ka B&W version (ubw_*, full resolution) |
| `../ch4_bw/` | 20 B&W StarUML-style PNGs (14 interface flowcharts + architecture + deployment + ER + DFD L0/L1/L2) — ab backup |
| `../test-evidence/screenshots/` | 27 REAL live-app screenshots (24 e2e + unsafe + risk + incident detail) |
| `../ch4_images/` | 14 colorful dummy interface screenshots (ab sirf draft/backup) |
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
| `10_er_dfd_diagrams.py` | **B&W StarUML ER diagram + DFD Level 0 / 1 / 2 (auto-fit)** |
| `13_user_png_to_bw.py` | **User ke colored PNGs ko B&W convert karta hai (png/ -> ch4_bw_user/)** |
| `14_replace_with_user_diagrams.py` | **Chapter 4 mein user diagrams lagata hai (bade size mein)** |
| `15_remove_erdfd_center_fullview.py` | **ER/DFD hatata hai + 16 diagrams center full-view 15.9cm karta hai** |
| `16_medium_center_diagrams.py` | **16 diagrams MEDIUM size (12.5/14/13.5cm) dead-center karta hai** |
| `18_all_center_equal_space.py` | **SARE 30 images center + equal L/R space + page-fit (bytes unchanged)** |
| `19_settle_ch4_pages.py` | **Pages settle - keep_with_next, 1.1 spacing, 1.9cm margins, compact sizes** |
| `20_real_er_dfd.py` | **REAL ER (15 collections) + DFD L0/L1-user/L1-admin/L2-user/L2-admin, pure B&W PNG** |
| `21_build_er_dfd_mdj.py` | **Same real ER+DFD `staruml\Chapter_4_RakshaSafe_Activity_Diagrams.mdj` mein append karta hai (6 class diagrams)** |
| `22_rebuild_real_flowcharts_mdj.py` | **14 flowcharts ko REAL project logic se rebuild karta hai (backend routes + frontend screens verified)** |

## Require
- Python 3.12
- `pip install python-docx matplotlib pillow pygments`
- Node.js (sirf mermaid PNG render ke liye)

## Quick regenerate
```powershell
python 08_uml_flowcharts.py
python 09_uml_architecture_deployment.py
python 10_er_dfd_diagrams.py
python ch4_real_build.py   # (documentation rebuild script - screenshots + ER/DFD insert)
```