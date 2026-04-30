import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Zap, FileText, Send, ChevronRight, Shield, BarChart3 } from 'lucide-react'
import PageWrapper from '../components/PageWrapper.jsx'

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] } },
})

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}

const FEATURES = [
  {
    icon: <Camera size={18} />,
    title: 'Photo-First Reporting',
    desc: 'Upload a photo of the issue — pothole, broken streetlight, debris — and our AI does the rest.',
  },
  {
    icon: <Zap size={18} />,
    title: 'Instant AI Analysis',
    desc: 'Computer vision identifies the issue type, severity, and location context automatically.',
  },
  {
    icon: <FileText size={18} />,
    title: 'Auto-Drafted Complaints',
    desc: 'Structured, formal complaint letters generated from detection data. Edit before sending.',
  },
  {
    icon: <Send size={18} />,
    title: 'One-Click Submission',
    desc: 'Complaints are emailed to the right department with the image attached as evidence.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Human-in-the-Loop',
    desc: 'Low-confidence detections trigger clarification questions to ensure accuracy.',
  },
  {
    icon: <BarChart3 size={18} />,
    title: 'Pluggable AI Models',
    desc: 'Swap in your own CNN or YOLO model via a clean interface. No backend rewrites needed.',
  },
]

const STEPS = [
  { n: '01', label: 'Upload', desc: 'Photograph the infrastructure issue' },
  { n: '02', label: 'Analyse', desc: 'AI identifies type & severity' },
  { n: '03', label: 'Draft', desc: 'Review & edit generated complaint' },
  { n: '04', label: 'Submit', desc: 'File with one click' },
]

export default function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                              linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            opacity: 0.35,
          }}
        />
        {/* Glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-10%', left: '30%',
            width: '700px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(232,197,71,0.07) 0%, transparent 65%)',
          }}
        />
        <div className="noise-overlay" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full">
          <motion.div variants={stagger} initial="initial" animate="animate">

            {/* Eyebrow */}
            <motion.div variants={fadeUp(0)} className="mb-6">
              <span className="badge badge-warn">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                AI-Powered Civic Infrastructure Reporting
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp(0.08)} className="display-xl mb-6" style={{ maxWidth: '720px' }}>
              Report civic issues<br />
              <span style={{ color: 'var(--accent-main)', fontStyle: 'italic' }}>in under 60 seconds.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={fadeUp(0.16)}
              className="text-lg mb-10"
              style={{ color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: 1.7 }}
            >
              Photograph a pothole, broken streetlight, or any infrastructure defect.
              Our AI analyses, drafts a formal complaint, and files it automatically.
            </motion.p>

            {/* CTA row */}
            <motion.div variants={fadeUp(0.24)} className="flex flex-wrap gap-4 items-center">
              <Link to="/upload" className="btn-primary text-base py-3.5 px-8">
                Report an Issue
                <ChevronRight size={16} />
              </Link>
              <a
                href="#how-it-works"
                className="btn-ghost text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                How it works
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp(0.32)} className="flex flex-wrap gap-8 mt-14">
              {[
                { value: '< 60s', label: 'To file a complaint' },
                { value: '94%',   label: 'Detection accuracy' },
                { value: '6+',    label: 'Issue categories' },
              ].map(stat => (
                <div key={stat.label}>
                  <p style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '2rem', fontWeight: 700,
                    color: 'var(--text-primary)', lineHeight: 1,
                  }}>
                    {stat.value}
                  </p>
                  <p className="label-mono mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <p className="label-mono mb-3">Process</p>
            <h2 className="display-lg">How it works</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="surface p-6 relative overflow-hidden"
              >
                {/* Large step number BG */}
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '5rem', fontWeight: 700, lineHeight: 1,
                    color: 'var(--border-subtle)',
                    position: 'absolute', top: 8, right: 12,
                    pointerEvents: 'none', userSelect: 'none',
                  }}
                >
                  {step.n}
                </span>
                <div className="relative z-10">
                  <p className="label-mono mb-3">{step.n}</p>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {step.label}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <p className="label-mono mb-3">Capabilities</p>
            <h2 className="display-lg">Built for real-world use</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="surface p-6"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'rgba(232,197,71,0.12)', color: 'var(--accent-main)' }}
                >
                  {feat.icon}
                </div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {feat.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ──────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="display-lg mb-4">Ready to report an issue?</h2>
            <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
              It takes less than a minute. Upload a photo and let Y.F.N.A handle the rest.
            </p>
            <Link to="/upload" className="btn-primary text-base py-3.5 px-10">
              Get Started <ChevronRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="label-mono">© 2024 Y.F.N.A Reporter</p>
          <p className="label-mono">Final-year engineering project · AI-powered civic tech</p>
        </div>
      </footer>
    </motion.div>
  )
}
