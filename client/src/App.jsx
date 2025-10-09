import React, { useMemo, useState } from 'react'
import UploadPage from './pages/UploadPage.jsx'
import ViewerPage from './pages/ViewerPage.jsx'

export default function App() {
  const [current, setCurrent] = useState('upload')
  const [session, setSession] = useState(null) // { evaluationId, fileUrl, fileId }

  const page = useMemo(() => {
    if (current === 'viewer' && session) {
      return <ViewerPage session={session} onBack={() => setCurrent('upload')} onUpdateSession={setSession} />
    }
    return <UploadPage onReady={(s) => { setSession(s); setCurrent('viewer') }} />
  }, [current, session])

  return (
    <div className="app-shell">
      <div className="topbar">Onscreen Evaluation</div>
      <div className="content">{page}</div>
    </div>
  )
}




