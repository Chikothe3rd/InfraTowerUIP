import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchKey?: keyof T
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  pageSize?: number
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  onRowClick,
  pageSize = 10
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // 1. Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchKey) return data
    return data.filter(row => {
      const val = row[searchKey]
      if (val === undefined || val === null) return false
      return String(val).toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [data, searchQuery, searchKey])

  // 2. Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredData, sortConfig])

  // 3. Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize])

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
    setCurrentPage(1)
  }

  const handleRowClick = (row: T) => {
    if (onRowClick) onRowClick(row)
  }

  return (
    <div style={styles.container}>
      {/* Top Search bar */}
      {searchKey && (
        <div style={styles.searchWrapper} className="no-print">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder={searchPlaceholder}
            style={styles.searchInput}
          />
        </div>
      )}

      {/* Responsive Table */}
      <div style={styles.tableResponsive}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              {columns.map(col => {
                const isSorted = sortConfig?.key === col.key
                const sortDir = sortConfig?.direction
                
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && requestSort(col.key)}
                    style={{
                      ...styles.th,
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                  >
                    <div style={styles.thContent}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span style={styles.sortIcon}>
                          {!isSorted && <ChevronsUpDown size={14} />}
                          {isSorted && sortDir === 'asc' && <ChevronUp size={14} />}
                          {isSorted && sortDir === 'desc' && <ChevronDown size={14} />}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={styles.emptyCell}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  onClick={() => handleRowClick(row)}
                  style={{
                    ...styles.bodyRow,
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: index % 2 === 0 ? 'rgba(0, 51, 136, 0.02)' : 'transparent'
                  }}
                  className="table-body-row"
                >
                  {columns.map(col => (
                    <td key={col.key} style={styles.td}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={styles.pagination} className="no-print">
          <span style={styles.paginationInfo}>
            Page {currentPage} of {totalPages} ({filteredData.length} items)
          </span>
          <div style={styles.paginationButtons}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={styles.pageBtn}
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={styles.pageBtn}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Inject hover highlights on data rows
const styleSheet = document.createElement('style');
styleSheet.innerText = `
  .table-body-row:hover {
    background-color: var(--bg-tertiary) !important;
  }
`;
document.head.appendChild(styleSheet);

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  searchWrapper: {
    marginBottom: '16px',
    width: '100%',
    maxWidth: '300px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '14px',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
  },
  tableResponsive: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-secondary)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px'
  },
  headerRow: {
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  th: {
    padding: '14px 16px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  sortIcon: {
    display: 'inline-flex',
    color: 'var(--text-secondary)'
  },
  bodyRow: {
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background-color 200ms ease'
  },
  td: {
    padding: '14px 16px',
    color: 'var(--text-primary)',
    verticalAlign: 'middle'
  },
  emptyCell: {
    padding: '32px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontWeight: 'bold'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    padding: '4px 0'
  },
  paginationInfo: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  paginationButtons: {
    display: 'flex',
    gap: '8px'
  },
  pageBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 200ms ease'
  }
}
export { styles as dataTableStyles } // export to use internally
