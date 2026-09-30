import re

with open('frontend/src/lib/i18n/dictionary.ts', 'r') as f:
    content = f.read()

# Extract EN keys and values
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start + len('export const en = {'):en_end]

# Parse key-value pairs from the EN section
# Pattern: 'key': 'value', (may have double commas)
pairs = re.findall(r"'([^']+)'\s*:\s*'([^']*)',?", en_section)
print(f'Parsed EN pairs: {len(pairs)}')

# Show first 10
for k, v in pairs[:10]:
    print(f'  {k}: {v}')

# Also try to capture multi-line values
# Let's do a more careful parse
lines = en_section.split('\n')
en_dict = {}
for line in lines:
    line = line.strip()
    if not line or line.startswith('//'):
        continue
    # Match 'key': 'value', or 'key': 'value',,
    match = re.match(r"'([^']+)'\s*:\s*'([^']*)',?,*", line)
    if match:
        en_dict[match.group(1)] = match.group(2)

print(f'\nParsed EN dict entries: {len(en_dict)}')

# Check for keys with special characters or multi-line
for k, v in en_dict.items():
    if '\n' in v or '{' in v:
        print(f'  Special: {k} = {v[:50]}...')

# Now let's also extract the existing HI section
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

print(f'\nParsed HI dict entries: {len(hi_dict)}')

# Check which EN keys don't have HI
missing_hi = set(en_dict.keys()) - set(hi_dict.keys())
print(f'Keys missing Hindi: {len(missing_hi)}')

# Show first 20 missing
for k in sorted(missing_hi)[:20]:
    print(f'  {k}: {en_dict[k][:60]}')