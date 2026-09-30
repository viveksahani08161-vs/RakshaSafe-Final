import re

with open('frontend/src/lib/i18n/dictionary.ts', 'r') as f:
    content = f.read()

# Extract EN keys
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start:en_end]

en_keys = re.findall(r"'([^']+)'\s*:", en_section)
print('EN keys:', len(en_keys))

# Extract HI keys  
hi_start = content.index('export const hi: Record<DictKey, string> = {')
hi_end = content.index('}', hi_start + 1)
hi_section = content[hi_start:hi_end]

hi_keys = re.findall(r"'([^']+)'\s*:", hi_section)
print('HI keys:', len(hi_keys))

# Compare
en_set = set(en_keys)
hi_set = set(hi_keys)
print('Keys in EN but not HI:', len(en_set - hi_set))
print('Keys in HI but not EN:', len(hi_set - en_set))

# Find duplicates in EN
from collections import Counter
en_counts = Counter(en_keys)
en_dups = {k: v for k, v in en_counts.items() if v > 1}
print('EN duplicates:', len(en_dups))

# List all EN keys
print('\nAll EN keys:')
for k in sorted(en_set):
    print(k)