import { formatDateTime, statusBadgeVariant } from '../../lib/incidents'
import { Badge } from '../ui/Badge'

export interface HistoryEntry {
  id: string
  statusFrom: string | null
  statusTo: string
  comment?: string
  updatedBy: string
  createdAt: string
}

/** Chronological incident history (oldest first). Purely presentational. */
export function HistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-gold-200 pl-5 dark:border-gold-500/30">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden
            className="absolute -left-[27px] top-1 size-3 rounded-full bg-gold-500 ring-4 ring-gold-100 dark:ring-gold-400/20"
          />
          <div className="flex flex-wrap items-center gap-2">
            {entry.statusFrom && (
              <>
                <Badge variant={statusBadgeVariant(entry.statusFrom)}>{entry.statusFrom}</Badge>
                <span aria-hidden className="text-xs font-bold text-ink-400">
                  →
                </span>
              </>
            )}
            <Badge variant={statusBadgeVariant(entry.statusTo)} dot>
              {entry.statusTo}
            </Badge>
          </div>
          {entry.comment && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{entry.comment}</p>
          )}
          <p className="mt-1 text-xs text-ink-400">{formatDateTime(entry.createdAt)}</p>
        </li>
      ))}
    </ol>
  )
}
