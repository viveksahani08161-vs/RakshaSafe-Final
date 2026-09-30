import re

with open('frontend/src/lib/i18n/dictionary.ts', 'r') as f:
    content = f.read()

# Extract EN keys and values
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start + len('export const en = {'):en_end]

# Parse key-value pairs
lines = en_section.split('\n')
en_dict = {}
for line in lines:
    line = line.strip()
    if not line or line.startswith('//'):
        continue
    match = re.match(r"'([^']+)'\s*:\s*'([^']*)',?,*", line)
    if match:
        en_dict[match.group(1)] = match.group(2)

# Extract existing HI
hi_start = content.index('export const hi: Record<DictKey, string> = {')
hi_end = content.index('}', hi_start + 1)
hi_section = content[hi_start + len('export const hi: Record<DictKey, string> = {'):hi_end]

hi_lines = hi_section.split('\n')
hi_dict = {}
for line in hi_lines:
    line = line.strip()
    if not line or line.startswith('//'):
        continue
    match = re.match(r"'([^']+)'\s*:\s*'([^']*)',?,*", line)
    if match:
        hi_dict[match.group(1)] = match.group(2)

print(f'EN keys: {len(en_dict)}')
print(f'HI keys: {len(hi_dict)}')

# Now I'll create Hindi translations for missing keys
# For now, let me write a complete dictionary builder that generates the fixed file
# I'll use the existing HI translations where they exist, and create new ones for missing

# Save the parsed EN dict for reference
import json
with open('en_dict.json', 'w', encoding='utf-8') as f:
    json.dump(en_dict, f, ensure_ascii=False, indent=2)

with open('hi_dict.json', 'w', encoding='utf-8') as f:
    json.dump(hi_dict, f, ensure_ascii=False, indent=2)

print('Saved EN and HI dicts to JSON files')