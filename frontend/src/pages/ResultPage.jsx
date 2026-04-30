import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronRight, RefreshCw, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useReport } from '../App.jsx'
import { analyzeImage, submitClarification, generateComplaint } from '../services/api.js'
import ConfidenceBar from '../components/ConfidenceBar.jsx'
import PageWrapper from '../components/PageWrapper.jsx'

// Low-confidence clarification questions keyed by category
const CLARIFY_QUESTIONS = {
  default: [
    { id: 'issue_type',   label: 'What best describes the issue?',
      options: ['Pothole / Road damage', 'Broken streetlight', 'Water leakage', 'Garbage accumulation', 'Damaged footpath', 'Other'] },
    { id: 'severity',     label: 'How severe is this issue?',
      options: ['Minor (cosmetic)', 'Moderate (inconvenient)', 'Severe (dangerous)'] },
    { id: 'duration',     label: 'How long has this issue existed?',
      options: ['Just noticed', 'A few days', 'Several weeks', 'Months'] },
  ]
}

export default function ResultPage() {
  const { report, updateReport } = useReport()
  const navigate = useNavigate()
  const hasRunAnalysis = useRef(false)

  const [phase,     setPhase]     = useState('loading')  // loading | result | clarify | refining
  const [result,    setResult]    = useState(null)
  const [answers,   setAnswers]   = useState({})
  const [generating,setGenerating]= useState(false)

  // ── Trigger analysis on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (hasRunAnalysis.current) return
    hasRunAnalysis.current = true
    if (!report.sessionId) { navigate('/upload'); return }
    runAnalysis()
  }, [report.sessionId, navigate])

  const normaliseSeverity = (value) => {
    if (!value) return 'moderate'
    const lower = value.toLowerCase()
    if (lower.includes('minor')) return 'minor'
    if (lower.includes('severe')) return 'severe'
    return 'moderate'
  }

  const runAnalysis = async () => {
    setPhase('loading')
    try {
      const data = await analyzeImage(report.sessionId)
      setResult(data)
      updateReport({ analysisResult: data })
      setPhase(data.below_threshold ? 'clarify' : 'result')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Analysis failed.')
      setPhase('result')
    }
  }

  const handleClarifySubmit = async () => {
    setPhase('refining')
    try {
      const refined = await submitClarification(report.sessionId, answers)
      setResult(prev => ({ ...prev, ...refined }))
      updateReport({ analysisResult: { ...result, ...refined } })
      setPhase('result')
    } catch {
      toast.error('Refinement failed. Proceeding with original result.')
      setPhase('result')
    }
  }

  const handleProceed = async () => {
    setGenerating(true)
    try {
      const { complaint_text } = await generateComplaint({
        session_id:       report.sessionId,
        issue_type:       result.label,
        location:         report.location || 'Not specified',
        severity:         normaliseSeverity(answers.severity),
        additional_notes: '',
        latitude:         report.coords?.latitude,
        longitude:        report.coords?.longitude,
      })
      updateReport({ complaintText: complaint_text, analysisResult: result })
      navigate('/complaint')
    } catch (err) {
      toast.error('Failed to generate complaint. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Severity colour ───────────────────────────────────────────────────────
  const severityColor = (label) => {
    if (!label) return 'var(--text-muted)'
    const l = label.toLowerCase()
    if (l.includes('pothole') || l.includes('water') || l.includes('collapse')) return '#f87171'
    if (l.includes('light') || l.includes('garbage') || l.includes('footpath')) return '#fbbf24'
    return '#4ade80'
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="label-mono mb-3">Step 02 / 04</p>
          <h1 className="display-lg mb-1">Analysis Result</h1>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── LOADING ───────────────────────────────────────────────────── */}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-10 surface p-10 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                {/* Pulsing rings */}
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 animate-ping"
                    style={{ borderColor: 'rgba(232,197,71,0.3)' }} />
                  <div className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'var(--accent-main)' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Analysing image…</p>
                  <p className="label-mono mt-1">Running computer vision model</p>
                </div>
                {/* Skeleton bars */}
                <div className="w-full max-w-xs mt-2 space-y-2">
                  {[80, 60, 40].map(w => (
                    <div key={w} className="h-2 rounded animate-pulse"
                      style={{ width: `${w}%`, background: 'var(--border-subtle)', margin: '0 auto' }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── RESULT ───────────────────────────────────────────────────── */}
          {phase === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 space-y-4"
            >
              {/* Image + bbox overlay */}
              <div className="surface overflow-hidden relative">
                {report.previewUrl && (
                  <div className="relative">
                    <img src={report.previewUrl} alt="Uploaded" className="w-full object-cover"
                      style={{ maxHeight: '300px' }} />
                    {/* Simulated bounding box */}
                    {result.bounding_boxes?.length > 0 && (
                      <div
                        className="absolute border-2 rounded"
                        style={{
                          borderColor: 'var(--accent-main)',
                          left:   `${result.bounding_boxes[0].x1 * 100}%`,
                          top:    `${result.bounding_boxes[0].y1 * 100}%`,
                          width:  `${(result.bounding_boxes[0].x2 - result.bounding_boxes[0].x1) * 100}%`,
                          height: `${(result.bounding_boxes[0].y2 - result.bounding_boxes[0].y1) * 100}%`,
                          boxShadow: '0 0 0 1px rgba(232,197,71,0.3)',
                        }}
                      >
                        <span
                          className="absolute -top-6 left-0 px-2 py-0.5 text-xs rounded"
                          style={{ background: 'var(--accent-main)', color: 'var(--bg-primary)',
                            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
                        >
                          {result.label}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="p-6 space-y-6">
                  {/* Issue type */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="label-mono mb-1">Detected Issue</p>
                      <p style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '1.4rem', fontWeight: 600,
                        color: severityColor(result.label),
                      }}>
                        {result.label}
                      </p>
                    </div>
                    <span
                      className="badge mt-1"
                      style={{
                        background: result.confidence >= 0.75
                          ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
                        color: result.confidence >= 0.75 ? '#4ade80' : '#fbbf24',
                      }}
                    >
                      {result.confidence >= 0.75 ? 'High confidence' : 'Medium confidence'}
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <ConfidenceBar value={result.confidence} label="Model Confidence" />

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { label: 'Model',        value: result.model_name || 'DefaultCNN' },
                      { label: 'Inference (ms)',value: result.inference_ms || '—' },
                      { label: 'Boxes found',  value: result.bounding_boxes?.length ?? 0 },
                      { label: 'Session',      value: report.sessionId?.slice(0, 8) + '…' || '—' },
                    ].map(item => (
                      <div key={item.label} className="surface-elevated p-3 rounded-lg">
                        <p className="label-mono mb-0.5">{item.label}</p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem',
                          color: 'var(--text-primary)' }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-between items-center pt-2">
                <button onClick={runAnalysis} className="btn-ghost text-sm">
                  <RefreshCw size={14} /> Re-analyse
                </button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleProceed}
                  disabled={generating}
                  className="btn-primary px-8 py-3 disabled:opacity-40"
                >
                  {generating ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg> Generating…</>
                  ) : (
                    <>Draft Complaint <ChevronRight size={16} /></>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── CLARIFY ──────────────────────────────────────────────────── */}
          {(phase === 'clarify' || phase === 'refining') && (
            <motion.div
              key="clarify"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 space-y-4"
            >
              {/* Low-confidence banner */}
              <div
                className="flex gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
              >
                <AlertTriangle size={16} style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 500, color: '#fbbf24', fontSize: '0.875rem' }}>Low confidence detection</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                    The model is uncertain. Please answer a few questions to improve accuracy.
                  </p>
                </div>
              </div>

              {/* Questions */}
              <div className="surface p-6 space-y-7">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle size={15} style={{ color: 'var(--accent-main)' }} />
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Clarification Questions</p>
                </div>

                {CLARIFY_QUESTIONS.default.map(q => (
                  <div key={q.id}>
                    <p className="label-mono mb-3">{q.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                          className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
                          style={{
                            background: answers[q.id] === opt ? 'rgba(232,197,71,0.15)' : 'var(--bg-elevated)',
                            border: `1px solid ${answers[q.id] === opt ? 'var(--accent-main)' : 'var(--border-subtle)'}`,
                            color: answers[q.id] === opt ? 'var(--accent-main)' : 'var(--text-secondary)',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClarifySubmit}
                  disabled={phase === 'refining'}
                  className="btn-primary px-8 py-3 disabled:opacity-40"
                >
                  {phase === 'refining' ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg> Refining…</>
                  ) : (
                    <>Refine Detection <ChevronRight size={16} /></>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}
