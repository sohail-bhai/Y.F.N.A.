import React from 'react'
import { motion } from 'framer-motion'

/**
 * Visual confidence indicator
 * @param {number} value  — 0.0–1.0
 */
export default function ConfidenceBar({ value = 0, label = 'Confidence' }) {
  const pct     = Math.round(value * 100)
  const color   = pct >= 75 ? '#4ade80' : pct >= 45 ? '#fbbf24' : '#f87171'
  const status  = pct >= 75 ? 'High' : pct >= 45 ? 'Medium' : 'Low'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <div className="flex items-center gap-2">
          <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
            {status}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.1rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Track */}
      <div
        className="h-2 rounded-full w-full overflow-hidden"
        style={{ background: 'var(--border-subtle)' }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
          style={{ background: color }}
        />
      </div>

      {/* Segment ticks */}
      <div className="flex gap-px">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-sm"
            style={{
              background: i < Math.floor(pct / 5)
                ? color
                : 'var(--border-subtle)',
              opacity: i < Math.floor(pct / 5) ? 0.6 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  )
}
