"""StarUML-authentic B&W architecture + deployment diagrams for Chapter 4."""
import sys, os
sys.path.insert(0, r'C:\Users\SAI\AppData\Local\Temp\opencode')
from uml_lib import *
import uml_lib
uml_lib.OUT = r'C:\Users\SAI\Desktop\Raksha\documentation\ch4_bw'
os.makedirs(uml_lib.OUT, exist_ok=True)
BB = dict(facecolor='white', edgecolor='none', pad=1.0)

# ==================== architecture (component diagram) ====================
fig, ax = canvas(9.0, 8.2, 100)
title(ax, 'Component Diagram \u2014 RakshaSafe System Architecture', ymax=100)

def lane(ax, x, y, w, h, label):
    rect(ax, x, y, w, h, '', fs=T)
    ax.text(x + w / 2, y + h - 3.2, label, ha='center', va='center', fontsize=7.2, weight='bold')
    ax.plot([x + 1, x + w - 1], [y + h - 7, y + h - 7], color='black', linewidth=1.0)

# Frontend
lane(ax, 18, 76, 64, 15, 'Frontend \u2014 React + TypeScript + Vite')
rect(ax, 21, 79, 28, 5, 'Pages & components\nRoles: USER | ADMIN | RESP', fs=5.2)
rect(ax, 51, 79, 28, 5, 'Hash routing \u00b7 api client\ni18n dictionary', fs=5.2)
# Backend
lane(ax, 18, 50, 64, 20, 'Backend \u2014 Node.js + Express + Mongoose')
rect(ax, 21, 53.5, 20, 5, 'Controllers', fs=5.4)
rect(ax, 43, 53.5, 18, 5, 'Middleware\n(auth \u00b7 error)', fs=5.2)
rect(ax, 63, 53.5, 16, 5, 'Routes /api', fs=5.2)
rect(ax, 21, 60, 28, 5, 'Services: geocoding, weather,\nOSM nearby, reports, notifications', fs=5.0)
rect(ax, 51, 60, 28, 5, 'Models (Mongoose, 15 collections)\nrisk assembly', fs=5.2)
# AI
lane(ax, 18, 28, 30, 14, 'AI Service \u2014 FastAPI :8000')
rect(ax, 21, 31, 24, 4, 'POST /risk/assess', fs=5.2)
rect(ax, 21, 36.5, 24, 4, 'raksha-risk-v1 (deterministic)', fs=4.8)
# MongoDB
lane(ax, 52, 28, 30, 14, 'MongoDB :27017')
rect(ax, 55, 31, 24, 4, '15 collections', fs=5.2)
rect(ax, 55, 36.5, 24, 4, 'Schema-validated', fs=5.2)
# connectors with stereotypes
arrow(ax, 50, 74.5, 50, 71)
ax.text(52, 72.8, '\u00abhttp\u00bb /api', ha='left', va='center', fontsize=5.8, style='italic')
arrow(ax, 33, 50, 33, 42.5, style='<|-|>')
ax.text(35, 46.4, 'factors', ha='left', va='center', fontsize=5.8, style='italic')
arrow(ax, 67, 50, 67, 42.5, style='<|-|>')
ax.text(69, 46.4, 'Mongoose', ha='left', va='center', fontsize=5.8, style='italic')
fig.savefig(os.path.join(uml_lib.OUT, 'bw_4_1_architecture.png'), dpi=200, bbox_inches='tight')
plt.close(fig)
print('saved bw_4_1_architecture.png')

# ==================== deployment ====================
fig, ax = canvas(9.0, 7.6, 100)
title(ax, 'Deployment Diagram \u2014 RakshaSafe', ymax=100)
cube(ax, 14, 66, 20, 16, stereo='\u00abnode\u00bb', name='Client Browser')
rect(ax, 16.5, 76, 15, 3.6, 'React SPA :5173 / build', fs=5.0)
cube(ax, 42, 66, 20, 16, stereo='\u00abnode\u00bb', name='Backend Server')
rect(ax, 44.5, 76, 15, 3.6, 'Express API :5000', fs=5.2)
cube(ax, 70, 66, 17, 16, stereo='\u00abnode\u00bb', name='AI Service')
rect(ax, 72.5, 76, 12, 3.6, 'FastAPI :8000', fs=5.2)
cube(ax, 14, 22, 20, 16, stereo='\u00abnode\u00bb', name='Database Host')
rect(ax, 16.5, 32, 15, 3.6, 'MongoDB :27017', fs=5.2)
cube(ax, 42, 22, 20, 16, stereo='\u00abnode\u00bb', name='Internet')
rect(ax, 44.5, 32, 15, 3.6, 'Open-Meteo / OSM', fs=5.2)
arrow(ax, 34, 74, 42, 74, style='<|-|>')
arrow(ax, 62, 74, 70, 74, style='<|-|>')
arrow(ax, 24, 66, 24, 38, style='<|-|>')
arrow(ax, 52, 38, 52, 66, style='<|-|>')
ax.text(38, 75.3, '\u00abhttp\u00bb /api', ha='center', va='bottom', fontsize=5.6, style='italic')
ax.text(66, 75.3, '\u00abhttp\u00bb /risk', ha='center', va='bottom', fontsize=5.6, style='italic')
ax.text(26, 51, 'Mongoose ODM', ha='center', va='center', fontsize=5.6, style='italic', bbox=BB)
ax.text(54, 51, 'fetch (proxy)', ha='center', va='center', fontsize=5.6, style='italic', bbox=BB)
fig.savefig(os.path.join(uml_lib.OUT, 'bw_4_3_deployment.png'), dpi=200, bbox_inches='tight')
plt.close(fig)
print('saved bw_4_3_deployment.png')
print('DONE')