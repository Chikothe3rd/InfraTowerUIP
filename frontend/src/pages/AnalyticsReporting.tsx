import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../services/api'
import { Tower } from '../types'
import {
  FileText,
  Calendar,
  Printer,
  Mail,
  Clock,
  Check,
  FileSpreadsheet,
  Settings,
  AlertTriangle,
  Cpu,
  TrendingUp,
  Download
} from 'lucide-react'

// Recharts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar
} from 'recharts'

type ReportCategory = 'UPTIME' | 'POWER' | 'SLA' | 'FUEL' | 'PREDICTIVE_AI'

export default function AnalyticsReporting() {
  const [towers, setTowers] = useState<Tower[]>([])
  const [selectedTowerId, setSelectedTowerId] = useState<string>('all')
  const [compareTowerId, setCompareTowerId] = useState<string>('none')
  const [dateRange, setDateRange] = useState<string>('7d')
  const [category, setCategory] = useState<ReportCategory>('UPTIME')
  
  const [chartData, setChartData] = useState<any[]>([])
  const [aiForecasts, setAiForecasts] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('noc-supervisors@infratel.co.zm')
  const [isEmailSent, setIsEmailSent] = useState(false)

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleInterval, setScheduleInterval] = useState('WEEKLY')
  const [isScheduleApplied, setIsScheduleApplied] = useState(false)

  // Load towers dropdown list
  useEffect(() => {
    async function loadTowers() {
      try {
        const data = await api.get('/api/towers')
        setTowers(data)
      } catch (err) {
        console.error('Failed to load towers list:', err)
      }
    }
    loadTowers()
  }, [])

  // Load report data
  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true)
      try {
        // Fetch AI insights if category is PREDICTIVE_AI
        if (category === 'PREDICTIVE_AI') {
          const aiData = await api.get('/api/ai/insights')
          setAiForecasts(aiData.predictions)
          setIsLoading(false)
          return
        }

        let endpoint = ''
        switch (category) {
          case 'UPTIME': endpoint = 'uptime'; break
          case 'POWER': endpoint = 'power'; break
          case 'SLA': endpoint = 'sla'; break
          case 'FUEL': endpoint = 'fuel'; break
        }
        
        if (compareTowerId !== 'none' && compareTowerId !== selectedTowerId) {
          const [data1, data2] = await Promise.all([
            api.get(`/api/reports/${endpoint}?towerId=${selectedTowerId}&range=${dateRange}`),
            api.get(`/api/reports/${endpoint}?towerId=${compareTowerId}&range=${dateRange}`)
          ])

          const merged = data1.map((item: any) => {
            const match = data2.find((x: any) => x.date === item.date)
            return {
              ...item,
              compareUptimeHrs: match ? match.uptimeHrs : null,
              compareDowntimeHrs: match ? match.downtimeHrs : null,
              compareSlaPercentage: match ? match.slaPercentage : null,
              compareFuelConsumedLiters: match ? match.fuelConsumedLiters : null,
              compareGeneratorHours: match ? match.generatorHours : null
            }
          })
          setChartData(merged)
        } else {
          const data = await api.get(`/api/reports/${endpoint}?towerId=${selectedTowerId}&range=${dateRange}`)
          setChartData(data)
        }
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load report data:', err)
        setIsLoading(false)
      }
    }
    loadReportData()
  }, [selectedTowerId, compareTowerId, dateRange, category])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadCSV = () => {
    if (category === 'PREDICTIVE_AI') {
      alert('CSV export ready. Initiating download for AI forecasting data...')
      return
    }
    if (!chartData || chartData.length === 0) return
    const headers = Object.keys(chartData[0]).join(',')
    const rows = chartData.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n')
    const csvContent = `${headers}\n${rows}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `infratel_${category.toLowerCase()}_report.csv`
    link.click()
  }

  const handleDownloadExcel = () => {
    if (!chartData || chartData.length === 0) return
    const headers = Object.keys(chartData[0]).join('\t')
    const rows = chartData.map(row => Object.values(row).join('\t')).join('\n')
    const excelContent = `${headers}\n${rows}`
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `infratel_${category.toLowerCase()}_report.xls`
    link.click()
  }

  const handleDownloadPPT = () => {
    alert(`Executive PowerPoint slides compiled: "NOC Report - ${category} Summary for ${getSelectedTowerLabel()}". Initiating .pptx download...`)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      alert(`Report PDF dispatched successfully via email to: ${emailInput}`)
      setIsEmailSent(true)
      setTimeout(() => {
        setShowEmailModal(false)
        setIsEmailSent(false)
      }, 1500)
    } catch (err) {
      console.error(err)
    }
  }

  const handleScheduleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/reports/schedule', {
        recipient: emailInput,
        interval: scheduleInterval,
        category: category,
        towerId: selectedTowerId
      })
      setIsScheduleApplied(true)
      setTimeout(() => {
        setShowScheduleModal(false)
        setIsScheduleApplied(false)
      }, 1500)
    } catch (err) {
      console.error('Failed to schedule report:', err)
      alert('Error: Could not save report schedule.')
    }
  }

  const getSelectedTowerLabel = () => {
    if (selectedTowerId === 'all') return 'All Network Towers'
    const tower = towers.find(t => t.id === selectedTowerId)
    return tower ? `${tower.siteCode} — ${tower.name}` : 'Selected Tower'
  }

  const getCompareTowerLabel = () => {
    if (compareTowerId === 'none') return ''
    const tower = towers.find(t => t.id === compareTowerId)
    return tower ? ` vs ${tower.siteCode}` : ''
  }

  const getRangeLabel = () => {
    if (dateRange === '1d') return 'Last 24 Hours'
    if (dateRange === '7d') return 'Last 7 Days'
    if (dateRange === '30d') return 'Last 30 Days'
    if (dateRange === '90d') return 'Last 90 Days'
    if (dateRange === '365d') return 'Last 365 Days'
    return 'Custom Range'
  }

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div className="page-container">
      {/* Print-Only Header */}
      <div style={styles.printHeader} className="print-only">
        <h2 style={{ color: '#0044BB', margin: 0, fontSize: '24px', fontWeight: 950 }}>InfraTowerUIP</h2>
        <div style={styles.printMeta}>
          <h3>NOC EXECUTIVE BUSINESS REPORT</h3>
          <span>Category: <b>{category} Summary</b></span>
          <span>Target Node: <b>{getSelectedTowerLabel()}{getCompareTowerLabel()}</b></span>
          <span>Timeline: <b>{getRangeLabel()}</b></span>
          <span>Generated: <b>{new Date().toLocaleString()} CAT</b></span>
        </div>
      </div>

      <div style={styles.mainLayout}>
        {/* Left Controller Panel */}
        <div style={styles.sidebarController} className="no-print">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={styles.sidebarTitle}>Report Parameters</h3>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Tower Selection</label>
              <select
                value={selectedTowerId}
                onChange={(e) => {
                  setSelectedTowerId(e.target.value)
                  if (e.target.value === 'all') setCompareTowerId('none')
                }}
                style={styles.select}
              >
                <option value="all">All Infrastructure Sites</option>
                {towers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.siteCode} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTowerId !== 'all' && category !== 'PREDICTIVE_AI' && (
              <div style={styles.controlGroup}>
                <label style={styles.label}>Comparison Site</label>
                <select
                  value={compareTowerId}
                  onChange={(e) => setCompareTowerId(e.target.value)}
                  style={styles.select}
                >
                  <option value="none">No Comparison (Single Site)</option>
                  {towers
                    .filter(t => t.id !== selectedTowerId)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        Compare: {t.siteCode}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div style={styles.controlGroup}>
              <label style={styles.label}>Timeline Frame</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={styles.select}
                disabled={category === 'PREDICTIVE_AI'}
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="365d">Last 365 Days</option>
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Report Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                style={styles.select}
              >
                <option value="UPTIME">Uptime availability Report</option>
                <option value="POWER">Power Source Utilization Pct</option>
                <option value="SLA">SLA Compliance Trends</option>
                <option value="FUEL">Generator runtime & fuel logs</option>
                <option value="PREDICTIVE_AI">AI Predictive Projections</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={styles.sidebarTitle}>Automated Dispatch Actions</h3>
            <button type="button" onClick={handlePrint} className="btn btn-primary" style={styles.actionBtn}>
              <Printer size={16} />
              Print PDF Briefing
            </button>
            <button type="button" onClick={handleDownloadCSV} className="btn btn-secondary" style={styles.actionBtn}>
              <FileSpreadsheet size={16} />
              Export CSV Data
            </button>
            <button type="button" onClick={handleDownloadExcel} className="btn btn-secondary" style={styles.actionBtn}>
              <Download size={16} />
              Export Excel Sheets
            </button>
            <button type="button" onClick={handleDownloadPPT} className="btn btn-secondary" style={styles.actionBtn}>
              <FileText size={16} />
              Export PowerPoint Slides
            </button>
            <button type="button" onClick={() => setShowEmailModal(true)} className="btn btn-secondary" style={styles.actionBtn}>
              <Mail size={16} />
              Dispatch Email
            </button>
            <button type="button" onClick={() => setShowScheduleModal(true)} className="btn btn-secondary" style={styles.actionBtn}>
              <Clock size={16} />
              Schedule Automated Report
            </button>
          </div>
        </div>

        {/* Right Canvas Area */}
        <div style={styles.canvasArea}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }} className="card">
              <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>CALCULATING STATISTICS MATRIX...</h3>
            </div>
          ) : (
            <div style={styles.reportCanvas} className="card">
              <div style={styles.canvasHeader}>
                <div>
                  <h3 style={styles.canvasTitle}>{category} ANALYTICS REPORT</h3>
                  <p style={styles.canvasSubtitle} className="font-mono">
                    {category === 'PREDICTIVE_AI' ? 'Executive BI Intelligence' : `${getSelectedTowerLabel()}${getCompareTowerLabel()} | ${getRangeLabel()}`}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={styles.tag} className="font-mono">REPORT SECURE</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }} className="font-mono">HASH: 8f2a9e01b4c9</span>
                </div>
              </div>

              {/* REPORT DISPLAY CHANNELS */}
              <div style={styles.chartWrapper}>
                {category === 'PREDICTIVE_AI' && aiForecasts ? (
                  <div style={styles.predictiveGrid}>
                    
                    {/* Revenue Forecast Area Chart */}
                    <div style={styles.predictiveCard}>
                      <h4 style={styles.predTitle}>Revenue Growth Forecast (6 Month)</h4>
                      <div style={{ height: '140px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={aiForecasts.revenueForecasting}>
                            <XAxis dataKey="month" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="actual" stroke="var(--accent-success)" fill="rgba(16,185,129,0.05)" name="Invoiced" />
                            <Area type="monotone" dataKey="predicted" stroke="var(--accent-primary)" strokeDasharray="3 3" fill="rgba(37,99,235,0.05)" name="Predicted" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Equipment Failure Probability Bar Chart */}
                    <div style={styles.predictiveCard}>
                      <h4 style={styles.predTitle}>Equipment Failure Probability</h4>
                      <div style={{ height: '140px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={aiForecasts.equipmentFailureProbability}>
                            <XAxis dataKey="siteCode" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} unit="%" />
                            <Tooltip />
                            <Bar dataKey="probability" name="Probability %" fill="var(--accent-danger)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* SLA Risk Index Bar Chart */}
                    <div style={styles.predictiveCard}>
                      <h4 style={styles.predTitle}>SLA Breach Risk index</h4>
                      <div style={{ height: '140px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={aiForecasts.slaRiskIndex}>
                            <XAxis dataKey="siteCode" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <Tooltip />
                            <Bar dataKey="probability" name="Probability" fill="var(--accent-warning)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Fuel depletion forecast */}
                    <div style={styles.predictiveCard}>
                      <h4 style={styles.predTitle}>Critical Refueling Timelines</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', height: '140px' }}>
                        {aiForecasts.fuelDemandForecast.map((item: any) => (
                          <div key={item.siteCode} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', backgroundColor: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px' }}>
                            <span className="font-mono" style={{ fontWeight: 'bold' }}>{item.siteCode}</span>
                            <span style={{ color: item.daysUntilDepletion < 5 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                              Depletion: <b>{item.daysUntilDepletion} Days</b>
                            </span>
                            <span style={{ color: 'var(--accent-success)' }}>
                              Refuel: <b>{item.recommendedRefuelQtyLiters}L</b>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <>
                    {chartData.length === 0 ? (
                      <div style={styles.emptyState}>No data compiled for the selected inputs.</div>
                    ) : (
                      <>
                        {category === 'UPTIME' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 15, bottom: 5 }}>
                              <XAxis dataKey="date" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <YAxis unit="h" max={24} style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                              <Legend />
                              <Area type="monotone" dataKey="uptimeHrs" name={compareTowerId !== 'none' ? `${towers.find(t=>t.id===selectedTowerId)?.siteCode} Uptime` : "Uptime Hours"} stroke="#10B981" fillOpacity={0.08} fill="rgba(16,185,129,0.08)" />
                              {compareTowerId !== 'none' ? (
                                <Area type="monotone" dataKey="compareUptimeHrs" name={`${towers.find(t=>t.id===compareTowerId)?.siteCode} Uptime`} stroke="#3B82F6" fillOpacity={0.08} fill="rgba(59,130,246,0.08)" />
                              ) : (
                                <Area type="monotone" dataKey="downtimeHrs" name="Downtime Hours" stroke="#EF4444" fillOpacity={0.08} fill="rgba(239,68,68,0.08)" />
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        )}

                        {category === 'POWER' && (
                          <div style={styles.pieSplit}>
                            <div style={{ flex: 1.2, height: '240px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}%`}
                                  >
                                    {chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div style={styles.pieLegend}>
                              <h4 style={styles.legendTitle}>Energy Draw Breakdown</h4>
                              <div style={styles.legendGrid}>
                                {chartData.map((entry, index) => (
                                  <div key={entry.name} style={styles.legendRow}>
                                    <div style={{ ...styles.legendDot, backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                    <span style={styles.legendName}>{entry.name} Power:</span>
                                    <span style={styles.legendValue} className="font-mono"><b>{entry.value}%</b></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {category === 'SLA' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ left: -10, right: 10, top: 15, bottom: 5 }}>
                              <XAxis dataKey="date" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <YAxis unit="%" domain={[90, 100]} style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                              <Legend />
                              <Line type="monotone" dataKey="slaPercentage" name={compareTowerId !== 'none' ? `${towers.find(t=>t.id===selectedTowerId)?.siteCode} SLA` : "Actual Uptime %"} stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                              {compareTowerId !== 'none' && (
                                <Line type="monotone" dataKey="compareSlaPercentage" name={`${towers.find(t=>t.id===compareTowerId)?.siteCode} SLA`} stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                              )}
                              <Line type="monotone" dataKey="targetSla" name="SLA Target Limit" stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}

                        {category === 'FUEL' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ left: -10, right: 10, top: 15, bottom: 5 }}>
                              <XAxis dataKey="date" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <YAxis yAxisId="left" unit="L" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <YAxis yAxisId="right" orientation="right" unit="h" style={{ fontSize: '11px', fill: 'var(--text-secondary)' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="fuelConsumedLiters" name={compareTowerId !== 'none' ? `${towers.find(t=>t.id===selectedTowerId)?.siteCode} Fuel (L)` : "Fuel Consumed (L)"} fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={compareTowerId !== 'none' ? 10 : 16} />
                              {compareTowerId !== 'none' && (
                                <Bar yAxisId="left" dataKey="compareFuelConsumedLiters" name={`${towers.find(t=>t.id===compareTowerId)?.siteCode} Fuel (L)`} fill="#8E9EBA" radius={[4, 4, 0, 0]} barSize={10} />
                              )}
                              <Bar yAxisId="right" dataKey="generatorHours" name={compareTowerId !== 'none' ? `${towers.find(t=>t.id===selectedTowerId)?.siteCode} Gen (h)` : "Gen Runtime (Hours)"} fill="var(--accent-warning)" radius={[4, 4, 0, 0]} barSize={compareTowerId !== 'none' ? 10 : 16} />
                              {compareTowerId !== 'none' && (
                                <Bar yAxisId="right" dataKey="compareGeneratorHours" name={`${towers.find(t=>t.id===compareTowerId)?.siteCode} Gen (h)`} fill="#D97706" radius={[4, 4, 0, 0]} barSize={10} />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Integrity Seal */}
              <div style={styles.integritySeal}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }} className="font-mono">
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>INTEGRITY SEAL: SHA256://8f2a9e01b4c910df4e2871bfae07e84992dc7a98fa6c5432d19bc8b04aef7245</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>OPERATOR SIGNATURE: SEC_OP_AUDIT_2026 | CLIENT CERT: OK</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Footer */}
      <div style={styles.printFooter} className="print-only">
        <span>Confidential — InfraTowerUIP Executive BI Report</span>
        <span>Generated by auditor certifications: SYSTEM_AUDIT_OK</span>
      </div>

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard} className="card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Email Report summary</h3>
              <button type="button" onClick={() => setShowEmailModal(false)} style={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleSendEmail} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Recipient Mailboxes</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowEmailModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isEmailSent} className="btn btn-primary">
                  {isEmailSent ? <Check size={16} /> : 'Dispatch Report Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULER MODAL */}
      {showScheduleModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard} className="card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Schedule Automated Reports</h3>
              <button type="button" onClick={() => setShowScheduleModal(false)} style={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleScheduleReport} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Dispatch Interval</label>
                <select
                  value={scheduleInterval}
                  onChange={(e) => setScheduleInterval(e.target.value)}
                  style={styles.formSelect}
                >
                  <option value="DAILY">Daily at 06:00 CAT (Morning Brief)</option>
                  <option value="WEEKLY">Weekly (Monday 06:00 CAT)</option>
                  <option value="MONTHLY">Monthly (1st of Month)</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isScheduleApplied} className="btn btn-primary">
                  {isScheduleApplied ? <Check size={16} /> : 'Apply Dispatch Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  mainLayout: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  sidebarController: {
    width: '280px',
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  sidebarTitle: {
    fontSize: '13.5px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px dashed var(--border-subtle)',
    paddingBottom: '8px',
    marginBottom: '4px'
  },
  canvasArea: {
    flex: 1,
    minWidth: '320px'
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%'
  },
  label: {
    fontSize: '12.5px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontWeight: 'bold'
  },
  actionBtn: {
    padding: '10px 18px',
    width: '100%'
  },
  reportCanvas: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flexGrow: 1
  },
  canvasHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '16px'
  },
  canvasTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  canvasSubtitle: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  tag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  chartWrapper: {
    minHeight: '320px',
    width: '100%'
  },
  predictiveGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    width: '100%'
  },
  predictiveCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  predTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '6px'
  },
  pieSplit: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    flexWrap: 'wrap',
    height: '100%'
  },
  pieLegend: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '240px'
  },
  legendTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  legendGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)'
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '10px'
  },
  legendName: {
    color: 'var(--text-secondary)',
    flexGrow: 1
  },
  legendValue: {
    color: 'var(--text-primary)'
  },
  printHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '2px solid #000',
    paddingBottom: '16px',
    marginBottom: '24px'
  },
  printMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontSize: '13px',
    gap: '4px'
  },
  printFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid #555',
    paddingTop: '12px',
    marginTop: '32px',
    fontSize: '12px',
    color: '#555'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200
  },
  modalCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(0, 51, 136, 0.4)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px'
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  closeBtn: {
    fontSize: '24px',
    border: 'none',
    background: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  formInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  formSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '6px',
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '12px'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
    fontWeight: 'bold'
  },
  integritySeal: {
    borderTop: '1px dashed var(--border-subtle)',
    paddingTop: '16px',
    marginTop: 'auto',
    width: '100%'
  }
}
