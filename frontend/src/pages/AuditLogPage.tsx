import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { AuditLog } from '../types'
import { History, ShieldAlert, FileSpreadsheet } from 'lucide-react'

// Components
import DataTable, { Column } from '../components/DataTable'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await api.get('/api/audit-log')
        setLogs(data)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load audit logs:', err)
        setIsLoading(false)
      }
    }
    loadLogs()
  }, [])

  // Columns definition for DataTable
  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      label: 'Timestamp ( CAT )',
      sortable: true,
      render: (row) => (
        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
          {new Date(row.createdAt).toLocaleString('en-US', {
            hour12: false,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      )
    },
    {
      key: 'username',
      label: 'Operator User',
      sortable: true,
      render: (row) => <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>@{row.username}</span>
    },
    {
      key: 'role',
      label: 'Access Level',
      sortable: true,
      render: (row) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '50px',
            backgroundColor: row.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: row.role === 'ADMIN' ? 'var(--accent-warning)' : 'var(--accent-success)',
            border: `1px solid ${row.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
          }}
        >
          {row.role}
        </span>
      )
    },
    {
      key: 'action',
      label: 'Operational Event',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }} className="font-mono">
          {row.action}
        </span>
      )
    },
    {
      key: 'details',
      label: 'System Trace Details',
      sortable: false,
      render: (row) => <span style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{row.details}</span>
    }
  ]

  return (
    <div className="page-container">
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <h3 className="font-mono" style={{ color: 'var(--text-secondary)' }}>RESOLVING SECURE EVENT BUFFER...</h3>
        </div>
      ) : (
        <div className="card">
          <div style={styles.cardHeader}>
            <div style={styles.headerLeft}>
              <History size={20} color="var(--accent-info)" />
              <h3 style={styles.cardTitle}>NOC Security & Override Trace Logs</h3>
            </div>
            <span style={styles.tag} className="font-mono">SECURE TRACE</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <DataTable
              columns={columns}
              data={logs}
              searchKey="action"
              searchPlaceholder="Filter by action name (e.g. LOGIN, ALERT_...)"
              pageSize={10}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 8px',
    borderRadius: '4px'
  }
}
