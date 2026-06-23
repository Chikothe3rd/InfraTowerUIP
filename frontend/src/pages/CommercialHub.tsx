import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  TrendingUp,
  Coins,
  Briefcase,
  AlertTriangle,
  Sparkles,
  PieChart as PieIcon,
  Search,
  DollarSign,
  Layers,
  ArrowUpRight,
  Percent
} from 'lucide-react'

// Components
import KPICard from '../components/KPICard'
import DataTable, { Column } from '../components/DataTable'

// Recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

export default function CommercialHub() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<any>({
    totalRevenue: 0,
    totalOperationalCost: 0,
    totalProfit: 0,
    totalActiveTenants: 0,
    averageTenancyRatio: 0,
    underutilizedSites: 0,
    slaPenaltyExposure: 0,
    breachingTowersCount: 0
  })
  const [towers, setTowers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCommercialData() {
      try {
        const [summaryData, towersData] = await Promise.all([
          api.get('/api/commercial/summary'),
          api.get('/api/commercial/towers')
        ])
        setSummary(summaryData)
        setTowers(towersData)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load commercial data:', err)
        setIsLoading(false)
      }
    }
    loadCommercialData()
  }, [])

  // Calculate tenancy distribution
  const tenancyDistributionData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    towers.forEach(t => {
      const idx = Math.min(t.tenantsCount, 4)
      counts[idx]++
    })
    return [
      { name: '0-1 Tenants', value: counts[0] + counts[1] },
      { name: '2 Tenants', value: counts[2] },
      { name: '3 Tenants', value: counts[3] },
      { name: '4+ Tenants', value: counts[4] }
    ]
  }, [towers])

  // Top 5 profitable towers
  const topProfitTowers = useMemo(() => {
    return towers
      .slice(0, 5)
      .map(t => ({
        siteCode: t.siteCode,
        Revenue: t.monthlyRevenue,
        Cost: t.operationalCost,
        Profit: t.profit
      }))
  }, [towers])

  // Opportunity Finder List: towers with less than 2 tenants
  const commercialOpportunities = useMemo(() => {
    return towers
      .filter(t => t.tenantsCount < 2)
      .map(t => {
        const vacantSlots = 5 - t.tenantsCount
        const potentialUpside = vacantSlots * 4800 // estimate $4800 per tenant contract
        return {
          id: t.id,
          siteCode: t.siteCode,
          name: t.name,
          currentTenants: t.tenants.join(', ') || 'No Tenants',
          vacantSlots,
          potentialUpside
        }
      }).slice(0, 5)
  }, [towers])

  // Client distribution logic
  const clientDistribution = useMemo(() => {
    const clients: Record<string, number> = {}
    towers.forEach(t => {
      t.tenants.forEach((client: string) => {
        clients[client] = (clients[client] || 0) + 1
      })
    })
    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444']
    return Object.entries(clients).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }))
  }, [towers])

  const columns: Column<any>[] = [
    {
      key: 'siteCode',
      label: 'Site Code',
      sortable: true,
      render: (row) => <span className="font-mono" style={{ fontWeight: 'bold' }}>{row.siteCode}</span>
    },
    { key: 'name', label: 'Site Name', sortable: true },
    {
      key: 'tenantsCount',
      label: 'Active Tenants',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'bold' }}>
          {row.tenantsCount} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({row.tenants.join(', ')})</span>
        </span>
      )
    },
    {
      key: 'tenancyRatio',
      label: 'Occupancy Ratio',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={styles.ratioBarBg}>
            <div style={{ ...styles.ratioBarFill, width: `${(row.tenantsCount / 5) * 100}%` }}></div>
          </div>
          <span className="font-mono" style={{ fontWeight: 'bold' }}>{row.tenantsCount}/5</span>
        </div>
      )
    },
    {
      key: 'monthlyRevenue',
      label: 'Revenue /mo',
      sortable: true,
      render: (row) => <span style={{ color: 'var(--accent-success)', fontWeight: 'bold' }}>${row.monthlyRevenue.toLocaleString()}</span>
    },
    {
      key: 'slaPercentage',
      label: 'SLA Score',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'bold', color: row.slaPercentage < 99.5 ? 'var(--accent-danger)' : 'var(--accent-success)' }} className="font-mono">
          {row.slaPercentage}%
        </span>
      )
    },
    {
      key: 'penaltyExposure',
      label: 'Penalty risk',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'bold', color: row.penaltyExposure > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }} className="font-mono">
          {row.penaltyExposure > 0 ? `$${row.penaltyExposure.toLocaleString()}` : '$0'}
        </span>
      )
    }
  ]

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>RESOLVING COMMERCIAL YIELD MATRIX...</h3>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Row 1 — Commercial KPIs */}
      <div style={styles.kpiRow}>
        <KPICard
          title="Total Monthly Revenue"
          value={`$${summary.totalRevenue.toLocaleString()}`}
          unit="USD"
          trend={{ value: '100% Invoiced', direction: 'up', label: 'Billing' }}
          icon={<Coins size={20} />}
          variant="success"
          subtext={`Est. Yield Margin: $${summary.totalProfit.toLocaleString()}`}
        />
        <KPICard
          title="Total Hosted Tenants"
          value={summary.totalActiveTenants}
          unit="Contracts"
          trend={{ value: 'MTN, Airtel, Zamtel', direction: 'up', label: 'Operators' }}
          icon={<Briefcase size={20} />}
          variant="primary"
          subtext={`Avg occupancy: ${summary.averageTenancyRatio}/5 capacity`}
        />
        <KPICard
          title="Underutilized Sites"
          value={summary.underutilizedSites}
          unit="Sites"
          trend={{ value: 'Tenancy < 2', direction: 'neutral', label: 'Lease openings' }}
          icon={<AlertTriangle size={20} />}
          variant={summary.underutilizedSites > 0 ? 'warning' : 'primary'}
          subtext="Available co-location slots"
        />
        <KPICard
          title="Global Penalty Exposure"
          value={`$${summary.slaPenaltyExposure.toLocaleString()}`}
          unit="USD"
          trend={{ value: `${summary.breachingTowersCount} Sites Breached`, direction: 'down', label: 'SLA' }}
          icon={<Percent size={20} />}
          variant={summary.slaPenaltyExposure > 0 ? 'danger' : 'primary'}
          subtext="Potential service credits at risk"
        />
      </div>

      {/* Row 2 — Sales Opportunity Finder & Client distribution Split */}
      <div style={styles.opportunitySplit}>
        {/* Opportunity Finder Panel */}
        <div className="card" style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px' }}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-warning)" />
              <h3 style={styles.cardTitle}>Colocation Sales Opportunity Finder</h3>
            </div>
            <span style={styles.cardTag} className="font-mono">LEASING PIPELINE</span>
          </div>

          <div style={styles.opportunityList}>
            {commercialOpportunities.map(opp => (
              <div key={opp.id} style={styles.opportunityRowItem} onClick={() => navigate(`/towers/${opp.id}`)}>
                <div style={styles.oppInfo}>
                  <span className="font-mono" style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-primary)' }}>{opp.siteCode}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{opp.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Current Leases: {opp.currentTenants}</span>
                </div>
                <div style={styles.oppUpside}>
                  <span style={styles.upsideLabel}>{opp.vacantSlots} Slots Free</span>
                  <span style={styles.upsideValue} className="font-mono">
                    +${opp.potentialUpside.toLocaleString()}/mo <ArrowUpRight size={14} style={{ display: 'inline-block', marginLeft: '2px' }} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client share breakdown pie chart */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Client Tenancy Distribution</h3>
            <span style={styles.cardTag} className="font-mono">Market Share</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: '170px' }}>
            <div style={{ width: '130px', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    dataKey="value"
                  >
                    {clientDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={styles.pieLegendList}>
              {clientDistribution.map(entry => (
                <div key={entry.name} style={styles.legendRow}>
                  <span style={{ ...styles.legendDot, backgroundColor: entry.color }}></span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', flexGrow: 1 }}>{entry.name}:</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }} className="font-mono">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 — Main ranked towers datagrid */}
      <div className="card">
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Infrastructure Colocation Rankings</h3>
          <span style={styles.cardTag} className="font-mono">CONTRACT REGISTER</span>
        </div>
        
        <div style={{ marginTop: '16px' }}>
          <DataTable
            columns={columns}
            data={towers}
            searchKey="siteCode"
            searchPlaceholder="Search by site code (LUS-...)"
            onRowClick={(row) => navigate(`/towers/${row.id}`)}
            pageSize={6}
          />
        </div>
      </div>

      {/* Row 4 — Utilization Charts split */}
      <div style={styles.bottomSplit}>
        {/* Tenancy Slots distribution */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Colocation Space Distribution</h3>
          </div>
          
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenancyDistributionData} margin={{ left: -15, right: 10, top: 15, bottom: 5 }}>
                <XAxis dataKey="name" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                <YAxis style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                <Bar dataKey="value" name="Sites Count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top profit margin towers */}
        <div className="card" style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Asset yield vs Operating costs (Top 5)</h3>
          </div>

          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProfitTowers} margin={{ left: -10, right: 10, top: 15, bottom: 5 }}>
                <XAxis dataKey="siteCode" style={{ fontSize: '11px', fill: 'var(--text-secondary)', fontWeight: 'bold' }} />
                <YAxis unit="$" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                <Legend />
                <Bar dataKey="Revenue" fill="var(--accent-success)" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Cost" fill="var(--accent-danger)" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    width: '100%'
  },
  opportunitySplit: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    flexWrap: 'wrap'
  },
  opportunityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '210px',
    overflowY: 'auto'
  },
  opportunityRowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  oppInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxWidth: '65%'
  },
  oppUpside: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px'
  },
  upsideLabel: {
    fontSize: '11px',
    backgroundColor: 'rgba(245,158,11,0.1)',
    color: 'var(--accent-warning)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  upsideValue: {
    fontSize: '13px',
    color: 'var(--accent-success)',
    fontWeight: 'bold'
  },
  pieLegendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
    paddingLeft: '16px'
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
    display: 'inline-block'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  cardTag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  ratioBarBg: {
    width: '80px',
    height: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  ratioBarFill: {
    height: '100%',
    backgroundColor: 'var(--accent-primary)',
    borderRadius: '3px'
  },
  bottomSplit: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    flexWrap: 'wrap'
  },
  chartWrapper: {
    height: '180px',
    width: '100%',
    marginTop: '16px'
  }
}
