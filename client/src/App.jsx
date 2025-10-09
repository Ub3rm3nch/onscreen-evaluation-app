import React, { useMemo, useState } from 'react'
import UploadPage from './pages/UploadPage.jsx'
import ViewerPage from './pages/ViewerPage.jsx'
import RecordsPage from './pages/RecordsPage.jsx'

export default function App() {
  const [current, setCurrent] = useState('upload')
  const [session, setSession] = useState(null) // { evaluationId, fileUrl, fileId }

  const page = useMemo(() => {
    if (current === 'viewer' && session) {
      return <ViewerPage session={session} onBack={() => setCurrent('upload')} onUpdateSession={setSession} />
    }
    if (current === 'records') {
      return <RecordsPage onBack={() => setCurrent('upload')} />
    }
    return <UploadPage onReady={(s) => { setSession(s); setCurrent('viewer') }} />
  }, [current, session])

  return (
    <div className="app-shell">
      <div className="topbar">
        <span>Onscreen Evaluation</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button 
            className="btn ghost" 
            onClick={() => setCurrent('upload')}
            style={{ fontSize: '14px', padding: '6px 12px' }}
          >
            Upload
          </button>
          <button 
            className="btn ghost" 
            onClick={() => setCurrent('records')}
            style={{ fontSize: '14px', padding: '6px 12px' }}
          >
            Records
          </button>
        </div>
      </div>
      <div className="content">{page}</div>
    </div>
  )
}




