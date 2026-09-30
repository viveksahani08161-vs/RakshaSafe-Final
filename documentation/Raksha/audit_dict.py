# Read-only audit of dictionary.ts
with open('frontend/src/lib/i18n/dictionary.ts', 'r') as f:
    content = f.read()

# Count EN keys
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start + len('export const en = {'):en_end]

# Just count single quotes followed by colon on each line
en_count = 0
for line in en_section.split('\n'):
    stripped = line.strip()
    if stripped.startswith("'") and "\':" in stripped:
        en_count += 1
print('Current EN keys:', en_count)

# Count HI keys  
hi_start = content.index("export const hi: Record<DictKey, string> = {")
hi_end = content.index('}', hi_start + 1)
hi_section = content[hi_start + len('export const hi: Record<DictKey, string> = {'):hi_end]

hi_count = 0
for line in hi_section.split('\n'):
    stripped = line.strip()
    if stripped.startswith("'") and "\':" in stripped:
        hi_count += 1
print('Current HI keys:', hi_count)

# Check for double commas - lines ending with ',,'
double_comma_count = 0
for line in content.split('\n'):
    if ',,' in line and "\':" in line:
        double_comma_count += 1
print('Lines with double comma:', double_comma_count)

# Compare EN and HI key sets
en_keys = set()
for line in en_section.split('\n'):
    stripped = line.strip()
    if stripped.startswith("'") and "\':" in stripped:
        key = stripped.split("':")[0].replace("'", '')
        en_keys.add(key)

hi_keys = set()
for line in hi_section.split('\n'):
    stripped = line.strip()
    if stripped.startswith("'") and "\':" in stripped:
        key = stripped.split("':")[0].replace("'", '')
        hi_keys.add(key)

print('Keys in EN but not HI:', len(en_keys - hi_keys))
print('Keys in HI but not EN:', len(hi_keys - en_keys))

# Check last part of HI section for truncation
hi_tail = hi_section[-200:] if len(hi_section) > 200 else hi_section
print('Last 200 chars of HI section:', repr(hi_tail))