import React, { useState } from 'react'

const API_BASE = 'http://localhost:4000'

export default function UploadPage({ onReady }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) return
    setLoading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const upRes = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form })
      if (!upRes.ok) throw new Error('Upload failed')
      const uploaded = await upRes.json()

      // Create initial evaluation entry
      const evRes = await fetch(`${API_BASE}/api/evaluations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploaded.fileId, marksByQuestion: {}, maxMarksByQuestion: {} })
      })
      if (!evRes.ok) throw new Error('Failed to create evaluation')
      const evaluation = await evRes.json()

      onReady({ evaluationId: evaluation.id, fileUrl: `${API_BASE}${uploaded.url}`, fileId: uploaded.fileId })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="upload-card">
        <h2 style={{ marginTop: 0 }}>Start a New Evaluation</h2>
        <p>Upload a scanned answer sheet (image or PDF). For this prototype, annotations are available on images.</p>
        <div className="upload-actions">
          <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn" onClick={handleUpload} disabled={!file || loading}>{loading ? 'Uploading…' : 'Upload & Continue'}</button>
        </div>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </div>
    </div>
  )
}




