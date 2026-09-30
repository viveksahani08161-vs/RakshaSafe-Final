# Check which referenced keys are missing from EN dictionary
referenced = {
    ',', '->', '.', '/', ':', 'a', 'all', 'aria.clearSearch', 'aria.toggleMenu',
    'auth.login', 'auth.register', 'common.loading', 'contacts.add', 'contacts.addFirst',
    'contacts.delete', 'contacts.delete.body', 'contacts.delete.confirm', 'contacts.delete.title',
    'contacts.description', 'contacts.edit', 'contacts.emailAlerts', 'contacts.emptyDescription',
    'contacts.emptyTitle', 'contacts.errorTitle', 'contacts.form.addContact', 'contacts.form.cancel',
    'contacts.form.email', 'contacts.form.emailPlaceholder', 'contacts.form.name',
    'contacts.form.namePlaceholder', 'contacts.form.notifyEmail', 'contacts.form.notifySms',
    'contacts.form.phone', 'contacts.form.phonePlaceholder', 'contacts.form.relationship',
    'contacts.form.relationshipPlaceholder', 'contacts.form.saveChanges', 'contacts.form.saveError',
    'contacts.loading', 'contacts.modal.addTitle', 'contacts.modal.description',
    'contacts.modal.editTitle', 'contacts.noAutoAlerts', 'contacts.smsAlerts', 'contacts.title',
    'dashboard.action.contacts', 'dashboard.action.reportUnsafe', 'dashboard.action.sos',
    'dashboard.alert.response.body', 'dashboard.alert.response.title', 'dashboard.helplines.call',
    'dashboard.helplines.title', 'dashboard.incidents.description', 'dashboard.incidents.emptyDescription',
    'dashboard.incidents.emptyTitle', 'dashboard.incidents.errorTitle', 'dashboard.incidents.location.no',
    'dashboard.incidents.location.yes', 'dashboard.incidents.raiseFirst', 'dashboard.incidents.refresh',
    'dashboard.incidents.title', 'dashboard.incidents.viewDetails', 'dashboard.stat.active',
    'dashboard.stat.total', 'dashboard.subtitle', 'dashboard.welcome.guest', 'dashboard.welcome.user',
    'facilityType', 'geocode.attribution', 'geocode.change', 'geocode.manualLabel',
    'geocode.placeholder', 'geocode.search', 'geocode.searching', 'hashchange', 'isActive',
    'isOperational', 'isVerified', 'language.label', 'login.description', 'login.emailPhone',
    'login.emailPhonePlaceholder', 'login.errorTitle', 'login.password', 'login.passwordPlaceholder',
    'login.registerLink', 'login.submit', 'login.submitting', 'login.title', 'nav.assignments',
    'nav.contacts', 'nav.dashboard', 'nav.designSystem', 'nav.facilities', 'nav.incidents',
    'nav.logout', 'nav.myProfile', 'nav.notifications', 'nav.overview', 'nav.reportUnsafe',
    'nav.reports', 'nav.resources', 'nav.sos', 'nav.teams', 'nav.unsafeAreas', 'nav.users',
    'notification.unreadCount', 'notifications.aboutDelivery.body', 'notifications.aboutDelivery.title',
    'notifications.channelTo', 'notifications.description', 'notifications.emptyDescription',
    'notifications.emptyTitle', 'notifications.errorTitle', 'notifications.inApp',
    'notifications.loading', 'notifications.markAllRead', 'notifications.notConfigured',
    'notifications.title', 'priority', 'profile.cancel', 'profile.description', 'profile.edit',
    'profile.email', 'profile.form.email', 'profile.form.language', 'profile.form.name',
    'profile.form.phone', 'profile.language', 'profile.memberSince', 'profile.name', 'profile.phone',
    'profile.saveChanges', 'profile.saved', 'profile.savedDescription', 'profile.title',
    'profile.update.failed', 'profile.update.title', 'register.confirmPassword',
    'register.confirmPasswordPlaceholder', 'register.description', 'register.email',
    'register.emailPlaceholder', 'register.errorTitle', 'register.loginLink', 'register.name',
    'register.namePlaceholder', 'register.password', 'register.passwordHint', 'register.passwordPlaceholder',
    'register.phone', 'register.phonePlaceholder', 'register.submit', 'register.submitting',
    'register.title', 'responder.action.hideDetails', 'responder.action.viewDetails',
    'responder.alert.respondHonestly', 'responder.assignedDate', 'responder.assignments.description',
    'responder.assignments.emptyDescription', 'responder.assignments.emptyTitle',
    'responder.assignments.errorTitle', 'responder.assignments.refresh', 'responder.assignments.title',
    'responder.detail.history', 'responder.detail.location', 'responder.detail.noHistory',
    'responder.detail.noLocation', 'responder.detail.noReporter', 'responder.detail.reporter',
    'responder.incident.unavailable', 'responder.loadError.assignments', 'responder.loadError.details',
    'responder.loadError.notifications', 'responder.note', 'responder.notification.assignmentUpdated',
    'responder.notification.updatedDescription', 'responder.notifications.description',
    'responder.notifications.emptyDescription', 'responder.notifications.emptyTitle',
    'responder.notifications.errorTitle', 'responder.notifications.refresh',
    'responder.notifications.title', 'responder.notifications.viewAssignment',
    'responder.reportedDate', 'responder.retry', 'responder.stat.active', 'responder.stat.assigned',
    'responder.status.final', 'responder.subtitle', 'responder.teamContact', 'responder.title',
    'responder.title.guest', 'responder.updateError', 'search', 'status', 'teamType', 'type'
}

with open('frontend/src/lib/i18n/dictionary.ts', 'r') as f:
    content = f.read()

import re
en_start = content.index('export const en = {')
en_end = content.index('} as const', en_start)
en_section = content[en_start:en_end]
en_keys = set(re.findall(r"'([^']+)'\s*:", en_section))

missing = referenced - en_keys
print('Referenced keys missing from EN:', len(missing))
for k in sorted(missing):
    print('  MISSING:', k)

# Also check for false positives - keys that aren't actually translation keys
false_positives = {',', '->', '.', '/', ':', 'a', 'all', 'hashchange', 'isActive', 'isOperational', 'isVerified', 'priority', 'search', 'status', 'teamType', 'type', 'facilityType'}
real_missing = missing - false_positives
print('\nReal missing translation keys:', len(real_missing))
for k in sorted(real_missing):
    print('  MISSING:', k)