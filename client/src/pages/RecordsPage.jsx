import React, { useEffect, useState, useMemo } from 'react'

const API_BASE = 'http://localhost:4000'

export default function RecordsPage({ onBack }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('totalMarks')
  const [sortOrder, setSortOrder] = useState('desc')
  const [minMarks, setMinMarks] = useState('')
  const [maxMarks, setMaxMarks] = useState('')

  // Load records from backend
  useEffect(() => {
    async function loadRecords() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/api/records`)
        if (!res.ok) throw new Error('Failed to load records')
        const data = await res.json()
        setRecords(data)
        setError('')
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadRecords()
  }, [])

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let filtered = records

    // Search by dummy number
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.dummyNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by marks range
    if (minMarks !== '') {
      const min = Number(minMarks)
      if (!Number.isNaN(min)) {
        filtered = filtered.filter(record => record.totalMarks >= min)
      }
    }
    if (maxMarks !== '') {
      const max = Number(maxMarks)
      if (!Number.isNaN(max)) {
        filtered = filtered.filter(record => record.totalMarks <= max)
      }
    }

    // Sort records
    filtered.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]

      if (sortBy === 'totalMarks') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else if (sortBy === 'createdAt') {
        aVal = new Date(aVal)
        bVal = new Date(bVal)
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })

    return filtered
  }, [records, searchTerm, minMarks, maxMarks, sortBy, sortOrder])

  function handleSort(field) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  function getSortIcon(field) {
    if (sortBy !== field) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) return
    
    try {
      const res = await fetch(`${API_BASE}/api/records/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete record')
      
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert('Failed to delete record: ' + e.message)
    }
  }

  function downloadRecords() {
    const csvContent = [
      ['Dummy Number', 'Answer Script', 'Total Marks', 'Created At'],
      ...filteredRecords.map(record => [
        record.dummyNumber,
        record.answerScriptFilename,
        record.totalMarks,
        new Date(record.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'evaluation_records.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2>Loading records...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>Error loading records</h2>
        <p style={{ color: 'red' }}>{error}</p>
        <button className="btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Evaluation Records</h2>
        <button className="btn ghost" onClick={onBack}>Back to Upload</button>
      </div>

      {/* Filters and Search */}
      <div style={{ 
        background: 'var(--beige-panel)', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        alignItems: 'end'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Search by Dummy Number:</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., D001, S123"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Min Marks:</label>
          <input
            className="input"
            type="number"
            placeholder="0"
            value={minMarks}
            onChange={e => setMinMarks(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Max Marks:</label>
          <input
            className="input"
            type="number"
            placeholder="100"
            value={maxMarks}
            onChange={e => setMaxMarks(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <button className="btn" onClick={downloadRecords}>Download CSV</button>
        </div>
      </div>

      {/* Records Table */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--accent)', color: 'white' }}>
            <tr>
              <th 
                style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => handleSort('dummyNumber')}
              >
                Dummy Number {getSortIcon('dummyNumber')}
              </th>
              <th 
                style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => handleSort('answerScriptFilename')}
              >
                Answer Script {getSortIcon('answerScriptFilename')}
              </th>
              <th 
                style={{ padding: '12px', textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('totalMarks')}
              >
                Total Marks {getSortIcon('totalMarks')}
              </th>
              <th 
                style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => handleSort('createdAt')}
              >
                Created At {getSortIcon('createdAt')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                  {records.length === 0 ? 'No records found. Complete some evaluations to see records here.' : 'No records match your filters.'}
                </td>
              </tr>
            ) : (
              filteredRecords.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{record.dummyNumber}</td>
                  <td style={{ padding: '12px' }}>
                    <a 
                      href={`${API_BASE}${record.answerScriptUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      {record.answerScriptFilename}
                    </a>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                    {record.totalMarks}
                  </td>
                  <td style={{ padding: '12px', color: '#666' }}>
                    {new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      className="btn ghost" 
                      onClick={() => deleteRecord(record.id)}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
        Showing {filteredRecords.length} of {records.length} records
        {filteredRecords.length > 0 && (
          <span style={{ marginLeft: '16px' }}>
            Average marks: {(filteredRecords.reduce((sum, r) => sum + r.totalMarks, 0) / filteredRecords.length).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}

