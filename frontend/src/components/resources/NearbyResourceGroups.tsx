import { useI18n } from '../../lib/i18n'
import type { NearbyResource } from '../../lib/resources'
import { ResourceCard } from './ResourceCard'

type GroupId = 'hospitals' | 'clinics' | 'police' | 'fire' | 'ambulance' | 'shelters' | 'teams'

const GROUP_ORDER: {
  id: GroupId
  titleKey:
    | 'nearby.group.hospitals'
    | 'nearby.group.clinics'
    | 'nearby.group.police'
    | 'nearby.group.fire'
    | 'nearby.group.ambulance'
    | 'nearby.group.shelters'
    | 'nearby.group.teams'
}[] = [
  { id: 'hospitals', titleKey: 'nearby.group.hospitals' },
  { id: 'clinics', titleKey: 'nearby.group.clinics' },
  { id: 'police', titleKey: 'nearby.group.police' },
  { id: 'fire', titleKey: 'nearby.group.fire' },
  { id: 'ambulance', titleKey: 'nearby.group.ambulance' },
  { id: 'shelters', titleKey: 'nearby.group.shelters' },
  { id: 'teams', titleKey: 'nearby.group.teams' },
]

/**
 * Assign a resource to a display group. The provider's machine category is
 * preferred; the stored display type is the fallback. Unknown or team
 * records fall into Safety / Rescue Teams — grouping never invents a
 * category.
 */
export function groupOf(resource: NearbyResource): GroupId {
  if (resource.kind === 'team') return 'teams'
  switch (resource.category) {
    case 'hospital':
      return 'hospitals'
    case 'clinic':
      return 'clinics'
    case 'police':
      return 'police'
    case 'fire_station':
      return 'fire'
    case 'ambulance_station':
      return 'ambulance'
    case 'shelter':
      return 'shelters'
    default:
      break
  }
  switch (resource.resourceType) {
    case 'Hospital':
      return 'hospitals'
    case 'Clinic':
      return 'clinics'
    case 'Police Station':
    case 'Police':
      return 'police'
    case 'Fire Station':
      return 'fire'
    case 'Ambulance Station':
      return 'ambulance'
    case 'Shelter':
    case 'Relief Centre':
      return 'shelters'
    default:
      return 'teams'
  }
}

interface NearbyResourceGroupsProps {
  resources: NearbyResource[]
  /** Admin view additionally shows raw stored coordinates per card. */
  showCoordinates?: boolean
}

/**
 * Nearest-first resources rendered under honest group headings.
 * Groups are display-only: the incoming order (nearest first) is preserved
 * inside each group, and empty groups are hidden entirely.
 */
export function NearbyResourceGroups({ resources, showCoordinates = false }: NearbyResourceGroupsProps) {
  const { t } = useI18n()
  const byGroup = new Map<GroupId, NearbyResource[]>()
  for (const r of resources) {
    const list = byGroup.get(groupOf(r)) ?? []
    list.push(r)
    byGroup.set(groupOf(r), list)
  }

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map(({ id, titleKey }) => {
        const items = byGroup.get(id) ?? []
        if (items.length === 0) return null
        return (
          <section key={id} aria-label={t(titleKey)}>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-500">
              {t(titleKey)}
            </h3>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <ResourceCard key={`${r.source}:${r.kind}:${r.id}`} resource={r} showCoordinates={showCoordinates} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
