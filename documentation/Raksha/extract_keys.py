import re
import os

keys = set()
for root, dirs, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fp:
                content = fp.read()
                # Find t('key') or t("key") or t(`key`)
                matches = re.findall(r"t\(['\"`]([^'\")]+)['\"`]", content)
                for m in matches:
                    keys.add(m)
                # Also find t('key', { ... }) with interpolation
                matches2 = re.findall(r"t\(['\"`]([^'\")]+)['\"`]\s*,", content)
                for m in matches2:
                    keys.add(m)

for k in sorted(keys):
    print(k)
print(f'\nTotal: {len(keys)}')