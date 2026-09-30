# Get missing Hindi keys from the current dictionary
with open('frontend/src/lib/i18n/dictionary.ts', 'r') as f:
    content = f.read()

# Extract EN keys
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start + len('export const en = {'):en_end]

# Extract HI keys
hi_start = content.index("export const hi: Record<DictKey, string> = {")
hi_end = content.index('}', hi_start + 1)
hi_section = content[hi_start + len('export const hi: Record<DictKey, string> = {'):hi_end]

# Parse EN keys
en_keys = []
for line in en_section.split('\n'):
    stripped = line.strip()
    if stripped.startswith("'") and "':" in stripped:
        key = stripped.split("':")[0].replace("'", '')
        en_keys.append(key)

# Parse HI keys
hi_keys = []
for line in hi_section.split('\n'):
    stripped = line.strip()
    if stripped.startswith("'") and "':" in stripped:
        key = stripped.split("':")[0].replace("'", '')
        hi_keys.append(key)

en_set = set(en_keys)
hi_set = set(hi_keys)

missing = sorted(en_set - hi_set)
print(f'Missing Hindi keys: {len(missing)}')
for k in missing:
    print(k)

# Save to file for reference
with open('missing_keys.txt', 'w') as f:
    for k in missing:
        f.write(k + '\n')