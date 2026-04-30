/*
Changes made and why:
- Added userEmail to report state so email collected on Upload page is available through the full flow.
- Added imageUrl to report state so Success page can provide evidence link in Gmail compose.
- Added coords field to store GPS coordinates { latitude, longitude, accuracy } captured during camera/location detection.
- Added locationSource to track whether location was 'gps' (auto-detected) or 'manual' (user-typed).
*/
import React, { createContext, useContext, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import Navbar from './components/Navbar.jsx'
import LandingPage from './pages/LandingPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import ComplaintPreviewPage from './pages/ComplaintPreviewPage.jsx'
import SuccessPage from './pages/SuccessPage.jsx'

// ─── Global report context ───────────────────────────────────────────────────
export const ReportContext = createContext(null)

export function useReport() {
  return useContext(ReportContext)
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const location = useLocation()

  const [report, setReport] = useState({
    uploadedFile:    null,
    previewUrl:      null,
    imageUrl:        '',
    userEmail:       '',
    analysisResult:  null,   // { label, confidence, bounding_boxes, session_id }
    complaintText:   '',
    location:        '',
    coords:          null,   // { latitude, longitude, accuracy }
    locationSource:  null,   // 'gps' | 'manual'
    severity:        'moderate',
    submissionId:    null,
  })

  const updateReport = (patch) => setReport(prev => ({ ...prev, ...patch }))

  return (
    <ReportContext.Provider value={{ report, updateReport }}>
      <div className="min-h-screen flex flex-col">
        <Navbar />

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: 'var(--bg-primary)' } },
            error:   { iconTheme: { primary: '#f87171', secondary: 'var(--bg-primary)' } },
          }}
        />

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"          element={<LandingPage />} />
              <Route path="/upload"    element={<UploadPage />} />
              <Route path="/result"    element={<ResultPage />} />
              <Route path="/complaint" element={<ComplaintPreviewPage />} />
              <Route path="/success"   element={<SuccessPage />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </ReportContext.Provider>
  )
}
