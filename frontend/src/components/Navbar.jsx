import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

const steps = [
  { path: '/upload',    label: 'Upload' },
  { path: '/result',    label: 'Analyse' },
  { path: '/complaint', label: 'Draft' },
  { path: '/success',   label: 'Submit' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const stepIndex  = steps.findIndex(s => s.path === pathname)

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(22,20,15,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-main)' }}
          >
            <MapPin size={16} strokeWidth={2.5} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Y.F.N.A
          </span>
          <span className="label-mono" style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
            Reporter
          </span>
        </Link>

        {/* Step indicators (hidden on landing) */}
        {!isLanding && (
          <nav className="flex items-center gap-1">
            {steps.map((step, i) => {
              const active   = step.path === pathname
              const complete = stepIndex > i
              return (
                <div key={step.path} className="flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: active   ? 'rgba(232,197,71,0.15)' :
                                  complete ? 'rgba(74,222,128,0.08)' : 'transparent',
                      color:      active   ? 'var(--accent-main)' :
                                  complete ? '#4ade80' : 'var(--text-muted)',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                      style={{
                        background: active   ? 'var(--accent-main)' :
                                    complete ? '#4ade80' : 'var(--border-strong)',
                        color: active || complete ? 'var(--bg-primary)' : 'var(--text-muted)',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                      }}
                    >
                      {complete ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-4 h-px mx-0.5" style={{ background: 'var(--border-subtle)' }} />
                  )}
                </div>
              )
            })}
          </nav>
        )}

        {/* Right action */}
        {isLanding ? (
          <Link to="/upload" className="btn-primary text-sm py-2 px-4">
            Report an Issue
          </Link>
        ) : (
          <Link to="/" className="btn-ghost text-sm py-2 px-4">
            Home
          </Link>
        )}
      </div>
    </header>
  )
}
