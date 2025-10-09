import React, { useEffect, useMemo, useRef, useState } from 'react'
import PdfAnnotator from '../components/PdfAnnotator.jsx'

const API_BASE = 'http://localhost:4000'

const Tool = {
  Pan: 'pan',
  Pen: 'pen',
  Tick: 'tick',
  Cross: 'cross'
}

export default function ViewerPage({ session, onBack, onUpdateSession }) {
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const [tool, setTool] = useState(Tool.Pen)
  const [penColor, setPenColor] = useState('#d64045')
  const [penSize, setPenSize] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 })
  const [marksByQuestion, setMarksByQuestion] = useState({})
  const [maxMarksByQuestion, setMaxMarksByQuestion] = useState({ Q1: 5, Q2: 10, Q3: 10 })
  const [statusText, setStatusText] = useState('')

  const isImage = useMemo(() => /\.(png|jpe?g|gif|webp|bmp)$/i.test(session.fileUrl), [session.fileUrl])
  const isPdf = useMemo(() => /\.pdf$/i.test(session.fileUrl), [session.fileUrl])

  useEffect(() => {
    if (!isImage) return
    const img = imgRef.current
    if (!img) return
    function onLoad() {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.clientWidth
      canvas.height = img.clientHeight
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [session.fileUrl, isImage])

  useEffect(() => {
    function handleResize() {
      const img = imgRef.current
      const canvas = canvasRef.current
      if (!img || !canvas) return
      canvas.width = img.clientWidth
      canvas.height = img.clientHeight
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function getCanvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e) {
    if (!isImage) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasPos(e)
    if (tool === Tool.Pen) {
      setIsDrawing(true)
      ctx.strokeStyle = penColor
      ctx.lineWidth = penSize
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
    } else if (tool === Tool.Tick || tool === Tool.Cross) {
      drawStamp(ctx, x, y, tool)
    }
  }

  function handlePointerMove(e) {
    if (!isDrawing || tool !== Tool.Pen) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function handlePointerUp() {
    if (isDrawing) {
      setIsDrawing(false)
    }
  }

  function drawStamp(ctx, x, y, type) {
    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = type === Tool.Tick ? '#2e7d32' : '#c62828'
    if (type === Tool.Tick) {
      ctx.beginPath()
      ctx.moveTo(x - 8, y)
      ctx.lineTo(x - 2, y + 10)
      ctx.lineTo(x + 12, y - 8)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(x - 10, y - 10)
      ctx.lineTo(x + 10, y + 10)
      ctx.moveTo(x + 10, y - 10)
      ctx.lineTo(x - 10, y + 10)
      ctx.stroke()
    }
    ctx.restore()
  }

  function handleMarksChange(questionId, value) {
    const max = Number(maxMarksByQuestion[questionId] || 0)
    const num = Number(value)
    if (Number.isNaN(num)) return
    const clamped = Math.max(0, Math.min(num, max))
    setMarksByQuestion(prev => ({ ...prev, [questionId]: clamped }))
  }

  function addQuestion() {
    const nums = Object.keys(maxMarksByQuestion)
      .map(k => Number(String(k).replace(/^Q/, '')))
      .filter(n => !Number.isNaN(n))
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    const qid = `Q${next}`
    setMaxMarksByQuestion(prev => ({ ...prev, [qid]: 10 }))
  }

  function removeQuestion(qid) {
    setMaxMarksByQuestion(prev => { const { [qid]: _omit, ...rest } = prev; return rest })
    setMarksByQuestion(prev => { const { [qid]: _omit2, ...rest } = prev; return rest })
  }

  function resetAllMarks() {
    setMarksByQuestion({})
  }

  async function saveProgress(statusOverride) {
    setStatusText('Saving…')
    try {
      const res = await fetch(`${API_BASE}/api/evaluations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.evaluationId,
          fileId: session.fileId,
          marksByQuestion,
          maxMarksByQuestion,
          status: statusOverride || 'in_progress'
        })
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      onUpdateSession({ ...session, evaluationData: data })
      setStatusText('Saved')
      setTimeout(() => setStatusText(''), 800)
    } catch (e) {
      setStatusText('Failed to save')
    }
  }

  // Auto-save shortly after any change to marks or max values
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session?.evaluationId) {
        saveProgress('in_progress')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [marksByQuestion, maxMarksByQuestion])

  async function complete(type) {
    setStatusText(type === 'complete' ? 'Completing…' : 'Rejecting…')
    try {
      const url = type === 'complete'
        ? `${API_BASE}/api/evaluations/${session.evaluationId}/complete`
        : `${API_BASE}/api/evaluations/${session.evaluationId}/reject`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error('Action failed')
      await res.json()
      setStatusText(type === 'complete' ? 'Completed' : 'Rejected')
    } catch (e) {
      setStatusText('Failed')
    }
  }

  function downloadJson() {
    const payload = {
      evaluationId: session.evaluationId,
      fileId: session.fileId,
      marksByQuestion,
      maxMarksByQuestion,
      status: 'in_progress'
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evaluation_${session.evaluationId || 'draft'}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const questions = useMemo(() => Object.keys(maxMarksByQuestion), [maxMarksByQuestion])

  return (
    <div className="viewer-shell" style={{ width: '100%' }}>
      <div className="viewer-main">
        <div className="toolbar">
          <button className="btn ghost" onClick={onBack}>Back</button>
          <button className={`btn ${tool===Tool.Pen?'':'ghost'}`} onClick={() => setTool(Tool.Pen)}>Pen</button>
          <button className={`btn ${tool===Tool.Tick?'':'ghost'}`} onClick={() => setTool(Tool.Tick)}>Tick ✓</button>
          <button className={`btn ${tool===Tool.Cross?'':'ghost'}`} onClick={() => setTool(Tool.Cross)}>Cross ✕</button>
          <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} style={{ marginLeft: 8 }} />
          <input type="range" min="1" max="10" value={penSize} onChange={e => setPenSize(Number(e.target.value))} />
          <span style={{ marginLeft: 'auto' }}>{statusText}</span>
        </div>
        <div className="canvas-wrap">
          <div className="canvas-inner">
            {isImage ? (
              <>
                <img ref={imgRef} className="doc-img" src={session.fileUrl} alt="uploaded document" />
                <canvas
                  ref={canvasRef}
                  className="annotation"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </>
            ) : isPdf ? (
              <PdfAnnotator url={session.fileUrl} tool={tool === 'pen' ? 'pen' : tool === 'tick' ? 'tick' : 'cross'} penColor={penColor} penSize={penSize} onStatus={setStatusText} />
            ) : null}
          </div>
        </div>
      </div>
      <div className="side">
        <h3>Marks Entry</h3>
        <div className="actions" style={{ marginBottom: 8 }}>
          <button className="btn" onClick={addQuestion}>Add Question</button>
          <button className="btn ghost" onClick={resetAllMarks}>Reset All Marks</button>
        </div>
        {questions.map(qid => (
          <div className="q-row" key={qid}>
            <div>{qid}</div>
            <input className="input" type="number" value={marksByQuestion[qid] ?? ''} placeholder={`0..${maxMarksByQuestion[qid]}`} onChange={e => handleMarksChange(qid, e.target.value)} />
            <input className="input" type="number" value={maxMarksByQuestion[qid]} onChange={e => setMaxMarksByQuestion(prev => ({ ...prev, [qid]: Number(e.target.value) }))} />
            <button className="btn ghost" onClick={() => removeQuestion(qid)}>Remove</button>
          </div>
        ))}
        <div className="actions">
          <button className="btn" onClick={() => saveProgress()}>Save Progress</button>
          <button className="btn ghost" onClick={downloadJson}>Download JSON</button>
          <button className="btn secondary" onClick={() => complete('complete')}>Complete Correction</button>
          <button className="btn ghost" onClick={() => complete('reject')}>Reject Script</button>
        </div>
      </div>
    </div>
  )
}


