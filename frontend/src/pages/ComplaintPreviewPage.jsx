/*
Changes made and why:
- Removed local email input because email is now collected on Upload page.
- Submit now uses report.userEmail from ReportContext.
*/
import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Send, ChevronLeft, Edit3, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useReport } from '../App.jsx'
import { submitComplaint } from '../services/api.js'
import PageWrapper from '../components/PageWrapper.jsx'

export default function ComplaintPreviewPage() {
  const { report, updateReport } = useReport()
  const navigate = useNavigate()

  const [text,       setText]       = useState(report.complaintText || '')
  const [editing,    setEditing]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const charCount = text.length

  if (!report.complaintText && !text) {
    return <Navigate to="/upload" replace />
  }

  const handleSubmit = async () => {
    if (!text.trim()) { toast.error('Complaint text cannot be empty.'); return }
    setSubmitting(true)
    try {
      const data = await submitComplaint({
        session_id:    report.sessionId,
        complaint_text: text,
        contact_email: report.userEmail || null,
      })
      updateReport({ submissionId: data.submission_id, complaintText: text })
      navigate('/success')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="label-mono mb-3">Step 03 / 04</p>
          <h1 className="display-lg mb-2">Review Complaint</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            AI-generated complaint based on the detected issue. Edit as needed before submission.
          </p>
        </motion.div>

        {/* Complaint card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          className="surface overflow-hidden"
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={15} style={{ color: 'var(--accent-main)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Complaint Draft
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="label-mono">{charCount} chars</span>
              <button
                onClick={() => setEditing(e => !e)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all"
                style={{
                  background: editing ? 'rgba(74,222,128,0.12)' : 'var(--bg-surface)',
                  color: editing ? '#4ade80' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {editing ? <><Check size={11} /> Done</> : <><Edit3 size={11} /> Edit</>}
              </button>
            </div>
          </div>

          {/* Text area */}
          <div className="p-6">
            {editing ? (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={14}
                className="input-base resize-none"
                style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.75, fontSize: '0.875rem' }}
              />
            ) : (
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.875rem',
                  lineHeight: 1.85,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  minHeight: '16rem',
                }}
              >
                {text || <span style={{ color: 'var(--text-muted)' }}>No complaint text generated.</span>}
              </div>
            )}
          </div>
        </motion.div>

        {/* Detection summary */}
        {report.analysisResult && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="mt-4 surface-elevated p-4 rounded-xl flex flex-wrap gap-4"
          >
            {[
              { label: 'Issue Type', value: report.analysisResult.label || '—' },
              { label: 'Confidence', value: `${Math.round((report.analysisResult.confidence || 0) * 100)}%` },
              { label: 'Location',   value: report.location || 'Not specified' },
            ].map(item => (
              <div key={item.label} className="flex-1 min-w-[120px]">
                <p className="label-mono mb-1">{item.label}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="mt-8 flex items-center justify-between"
        >
          <button onClick={() => navigate('/result')} className="btn-ghost text-sm">
            <ChevronLeft size={14} /> Back
          </button>
          <motion.button
            whileHover={!submitting ? { y: -2 } : {}}
            whileTap={!submitting ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary px-8 py-3.5 disabled:opacity-40"
          >
            {submitting ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg> Submitting…</>
            ) : (
              <><Send size={15} /> Submit Complaint</>
            )}
          </motion.button>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
