export interface DashboardIncident {
  id: string
  category: string
  type: string
  priority: string
  status: string
  createdAt: string
}

export interface DashboardRisk {
  id: string
  riskScore: number
  riskLevel: string
  modelVersion: string
  assessedAt: string
}

export interface DashboardActivity {
  id: string
  adminId: string
  action: string
  targetType: string
  createdAt: string
}

export interface DashboardData {
  generatedAt: string
  users: { total: number }
  incidents: {
    total: number
    active: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byType: Record<string, number>
    recent: DashboardIncident[]
  }
  teams: { total: number; active: number; inactive: number }
  assignments: { total: number; byStatus: Record<string, number> }
  facilities: { total: number; operational: number; nonOperational: number; byType: Record<string, number> }
  unsafeReports: {
    total: number
    verified: number
    unverified: number
    byCategory: { value: string; count: number }[]
    bySeverity: { value: string; count: number }[]
  }
  risk: { total: number; byLevel: Record<string, number>; recent: DashboardRisk[] }
  notifications: { total: number; byStatus: Record<string, number>; byChannel: Record<string, number> }
  recentActivity: DashboardActivity[]
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
