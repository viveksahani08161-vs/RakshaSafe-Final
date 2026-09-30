with open('frontend/src/lib/i18n/dictionary.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Count HI keys properly - find the actual end of hi dict
hi_start = content.index("export const hi: Record<DictKey, string> = {")
# Find the matching closing brace
brace_count = 0
start_idx = content.index('{', hi_start)
for i, ch in enumerate(content[start_idx:], start_idx):
    if ch == '{':
        brace_count += 1
    elif ch == '}':
        brace_count -= 1
        if brace_count == 0:
            hi_end = i
            break

hi_section = content[start_idx:hi_end+1]
import re
hi_keys = re.findall(r"'([^']+)'\s*:", hi_section)
print('HI keys found:', len(hi_keys))

# Also verify some random keys
for k in ['unsafeReports.title', 'validation.required', 'sos.title', 'responder.title']:
    if k in hi_keys:
        print('  Found:', k)
    else:
        print('  MISSING:', k)

# Check EN keys too
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start + len('export const en = {'):en_end]
en_keys = re.findall(r"'([^']+)'\s*:", en_section)
print('EN keys:', len(en_keys))

# Parity
en_set = set(en_keys)
hi_set = set(hi_keys)
print('Missing EN->HI:', len(en_set - hi_set))
print('Missing HI->EN:', len(hi_set - en_set))