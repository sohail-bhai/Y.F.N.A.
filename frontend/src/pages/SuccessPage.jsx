/*
Changes made and why:
- Fixed Gmail compose URL format to use view=cm&fs=1 and removed account-forcing path.
- Added safe body truncation before URL encoding to prevent broken/overlong Gmail links.
- Added "Copy Full Text" button with temporary "✓ Copied!" state for 2 seconds.
- Added helper amber note for truncated text and attachment reminder.
- Kept existing CTA styling/animations/layout behavior.
- Kept existing styling classes and animation patterns.
- Added mobile detection to use mailto: on mobile devices (opens native email client).
- Desktop uses Gmail web URL, mobile uses standard mailto: for better compatibility.
*/
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, MapPin, Mail } from 'lucide-react'
import { useReport } from '../App.jsx'
import PageWrapper from '../components/PageWrapper.jsx'

export default function SuccessPage() {
  const { report } = useReport()
  const submissionId = report.submissionId || 'CIV-' + Math.random().toString(36).slice(2, 10).toUpperCase()
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const [copied, setCopied] = useState(false)

  const openGmailCompose = () => {
    const to = import.meta.env.VITE_COMPLAINT_RECIPIENT || 'civic@municipality.gov.in'

    const subject = `[Y.F.N.A Report] ${report.analysisResult?.label} at ${report.location || 'Location in photo'} – Ref: ${submissionId}`

    const MAX_BODY_LENGTH = 1800

    const fullBody = `${report.complaintText}

---
Image Evidence: ${report.imageUrl || 'See attached photo'}
Submitted via Y.F.N.A Reporter | Ref: ${submissionId}`

    const truncatedBody = fullBody.length > MAX_BODY_LENGTH
      ? fullBody.slice(0, MAX_BODY_LENGTH) +
        '\n\n[Body truncated — please paste the full complaint from the app]'
      : fullBody

    // Detect if on mobile
    const isMobile = /iPhone|iPad|Android|BlackBerry|Windows Phone|Opera Mini|IEMobile/.test(navigator.userAgent)

    if (isMobile) {
      // On mobile, use mailto: which works with native email client
      const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(truncatedBody)}`
      window.location.href = mailtoUrl
    } else {
      // On desktop, use Gmail compose URL
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1` +
        `&to=${encodeURIComponent(to)}` +
        `&su=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(truncatedBody)}`
      window.open(gmailUrl, '_blank')
    }
  }

  const copyComplaint = async () => {
    try {
      await navigator.clipboard.writeText(report.complaintText || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = report.complaintText || ''
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto text-center">

        {/* Animated check */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
          className="mx-auto mb-8 relative"
          style={{ width: 96, height: 96 }}
        >
          {/* Ripples */}
          {[1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
              animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}
          >
            <CheckCircle size={40} style={{ color: '#4ade80' }} strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <p className="label-mono mb-3" style={{ color: '#4ade80' }}>Step 04 / 04 — Complete</p>
          <h1 className="display-lg mb-3">Complaint Filed!</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '2rem' }}>
            Your complaint has been submitted to the relevant civic authority.
            You will receive a confirmation email if a contact was provided.
          </p>
        </motion.div>

        {/* Receipt card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="surface p-6 text-left mb-8"
        >
          <p className="label-mono mb-4">Submission Receipt</p>
          <div className="space-y-3">
            {[
              { label: 'Submission ID', value: submissionId },
              { label: 'Filed at',      value: now },
              { label: 'Issue type',    value: report.analysisResult?.label || '—' },
              { label: 'Location',      value: report.location || 'Not specified' },
            ].map(row => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 py-2.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span className="label-mono">{row.label}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  textAlign: 'right', maxWidth: '60%',
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={openGmailCompose} className="btn-primary py-3 px-8 justify-center">
              <Mail size={15} /> Open Email & Send
            </button>
            <button onClick={copyComplaint} className="btn-ghost py-3 px-6 justify-center">
              {copied ? '✓ Copied!' : 'Copy Full Text'}
            </button>
          </div>

          <div
            className="p-4 rounded-xl text-left"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
              Your default email client will open with the complaint pre-filled.
              If the text appears cut off, click 'Copy Full Text' above and paste it manually.
              Don't forget to attach your photo before sending.
            </p>
          </div>

          <div
            className="p-4 rounded-xl text-left"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '0.5rem' }}>
              ⚠️ Before clicking Send in your email client:
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
              1. Attach your photo manually → the image is saved at{' '}
              {report.imageUrl ? (
                <a href={report.imageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-main)', textDecoration: 'underline' }}>
                  {report.imageUrl}
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>No image URL available</span>
              )}
              <br />
              2. Review the complaint text
              <br />
              3. Click Send
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/upload" className="btn-ghost py-3 px-6">
              Report Another Issue <ArrowRight size={15} />
            </Link>
            <Link to="/" className="btn-ghost py-3 px-6">
              <MapPin size={14} /> Back to Home
            </Link>
          </div>
        </motion.div>

      </div>
    </PageWrapper>
  )
}
