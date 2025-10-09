import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'

// Configure worker (Vite friendly)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function PdfAnnotator({ url, tool, penColor, penSize, onStatus }) {
  const containerRef = useRef(null)
  const [pdf, setPdf] = useState(null)
  const [pageCanvases, setPageCanvases] = useState([]) // [{render, overlay}]
  const scaleRef = useRef(1.0)
  const [isDrawing, setIsDrawing] = useState(false)
  const toolRef = useRef(tool)
  const colorRef = useRef(penColor)
  const sizeRef = useRef(penSize)

  // Keep refs in sync with latest props
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = penColor }, [penColor])
  useEffect(() => { sizeRef.current = penSize }, [penSize])

  useEffect(() => {
    let active = true
    async function load() {
      onStatus?.('Loading PDF…')
      const doc = await pdfjsLib.getDocument(url).promise
      if (!active) return
      setPdf(doc)
      onStatus?.('')
    }
    load()
    return () => { active = false }
  }, [url])

  useEffect(() => {
    if (!pdf) return
    const container = containerRef.current

    function computeScale(viewportWidth) {
      const available = Math.max(320, container.clientWidth - 16)
      const s = available / viewportWidth
      return Math.min(Math.max(s, 0.8), 2.0)
    }

    async function renderAll() {
      container.innerHTML = ''
      const canvRefs = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const baseViewport = page.getViewport({ scale: 1.0 })
        const scale = computeScale(baseViewport.width)
        scaleRef.current = scale
        const viewport = page.getViewport({ scale })

        const wrap = document.createElement('div')
        wrap.style.position = 'relative'
        wrap.style.margin = '12px auto'
        wrap.style.display = 'block'
        wrap.style.width = viewport.width + 'px'

        const renderCanvas = document.createElement('canvas')
        renderCanvas.width = viewport.width
        renderCanvas.height = viewport.height
        renderCanvas.style.display = 'block'

        const overlayCanvas = document.createElement('canvas')
        overlayCanvas.width = viewport.width
        overlayCanvas.height = viewport.height
        overlayCanvas.style.position = 'absolute'
        overlayCanvas.style.left = '0'
        overlayCanvas.style.top = '0'
        overlayCanvas.style.pointerEvents = 'auto'
        overlayCanvas.style.display = 'block'
        overlayCanvas.style.touchAction = 'none'
        overlayCanvas.style.zIndex = '1'

        wrap.appendChild(renderCanvas)
        wrap.appendChild(overlayCanvas)
        container.appendChild(wrap)

        const ctx = renderCanvas.getContext('2d')
        const renderTask = page.render({ canvasContext: ctx, viewport })
        await renderTask.promise

        canvRefs.push({ render: renderCanvas, overlay: overlayCanvas })
      }
      setPageCanvases(canvRefs)
      attachOverlayHandlers(canvRefs)
    }

    function attachOverlayHandlers(refs) {
      refs.forEach(({ overlay }) => {
        overlay.addEventListener('pointerdown', handleDown, { passive: false })
        overlay.addEventListener('pointermove', handleMove, { passive: false })
        overlay.addEventListener('pointerup', handleUp, { passive: false })
        overlay.addEventListener('pointerleave', handleUp, { passive: false })
      })
    }

    renderAll()

    function onResize() { renderAll() }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      pageCanvases.forEach(({ overlay }) => {
        overlay.removeEventListener('pointerdown', handleDown)
        overlay.removeEventListener('pointermove', handleMove)
        overlay.removeEventListener('pointerup', handleUp)
        overlay.removeEventListener('pointerleave', handleUp)
      })
    }
  }, [pdf])

  function handleDown(e) {
    e.preventDefault()
    const canvas = e.target
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(canvas, e)
    const activeTool = toolRef.current
    if (activeTool === 'pen') {
      setIsDrawing(true)
      ctx.strokeStyle = colorRef.current
      ctx.lineWidth = sizeRef.current
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId) } catch {}
      }
    } else if (activeTool === 'tick' || activeTool === 'cross') {
      drawStamp(ctx, x, y, activeTool)
    }
  }
  function handleMove(e) {
    e.preventDefault()
    if (!isDrawing || toolRef.current !== 'pen') return
    const canvas = e.target
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(canvas, e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  function handleUp(e) {
    if (isDrawing) setIsDrawing(false)
    const canvas = e?.target
    if (canvas && canvas.releasePointerCapture) {
      try { canvas.releasePointerCapture(e.pointerId) } catch {}
    }
  }
  function getPos(canvas, e) {
    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    return { x, y }
  }
  function drawStamp(ctx, x, y, type) {
    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = type === 'tick' ? '#2e7d32' : '#c62828'
    if (type === 'tick') {
      ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 2, y + 10); ctx.lineTo(x + 12, y - 8); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 10, y + 10); ctx.moveTo(x + 10, y - 10); ctx.lineTo(x - 10, y + 10); ctx.stroke()
    }
    ctx.restore()
  }

  return (
    <div ref={containerRef} style={{ padding: 8, width: '100%' }} />
  )
}