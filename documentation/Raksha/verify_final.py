with open('frontend/src/lib/i18n/dictionary.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Count EN keys
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start + len('export const en = {'):en_end]
en_keys = re.findall(r"'([^']+)'\s*:", en_section)

# Count HI keys
hi_start = content.index("export const hi: Record<DictKey, string> = {")
hi_end = content.index('}', hi_start + 1)
hi_section = content[hi_start + len('export const hi: Record<DictKey, string> = {'):hi_end]
hi_keys = re.findall(r"'([^']+)'\s*:", hi_section)

en_set = set(en_keys)
hi_set = set(hi_keys)

print('EN keys:', len(en_set))
print('HI keys:', len(hi_set))
print('Missing EN->HI:', len(en_set - hi_set))
print('Missing HI->EN:', len(hi_set - en_set))

# Check existing EN keys preserved
print('EN first key:', en_keys[0])
print('EN last key:', en_keys[-1])

# Check existing HI keys preserved (the original 35)
original_hi = ['app.name', 'common.loading', 'common.cancel', 'common.confirm', 'common.save', 
               'common.delete', 'common.close', 'common.search', 'common.tryAgain', 'common.wentWrong',
               'common.empty', 'common.submit', 'common.back', 'common.done', 'nav.dashboard', 
               'nav.sos', 'nav.resources', 'nav.contacts', 'nav.notifications', 'nav.profile', 
               'nav.logout', 'nav.incidents', 'nav.teams', 'nav.users', 'nav.facilities', 'nav.reports', 
               'nav.assignments', 'nav.myProfile', 'nav.overview', 'nav.reportUnsafe', 'nav.unsafeAreas', 
               'nav.designSystem', 'auth.login', 'auth.register', 'notification.unreadCount']

for k in original_hi:
    if k not in hi_set:
        print('MISSING original HI key:', k)

print('All original 35 HI keys preserved:', all(k in hi_set for k in original_hi))