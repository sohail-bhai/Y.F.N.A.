/*
Changes made and why:
- Added required Gmail address input to this page so complaint filing can happen through user's Gmail.
- Disabled Analyse button when email is empty to enforce required input.
- Persisted userEmail in ReportContext as the user types.
- After successful upload, stored imageUrl in context using VITE_API_BASE fallback logic.
- Added geolocation capture in handleCamera() — requests camera + GPS simultaneously.
- Added reverse geocoding using Nominatim API to convert coordinates to human-readable address.
- Added detectLocation() function for file uploads to manually trigger location detection.
- Added state variables: coords (latitude/longitude/accuracy), locating (GPS in progress), geocoding (reverse lookup in progress).
- Updated location input UI to show "Detect My Location" button for file uploads and GPS status indicators.
- Check for HTTPS/localhost before attempting geolocation to handle permission requirements.
- Updated handleSubmit() to pass coords and locationSource to report context.
- Added camera preview modal that shows live video feed before capturing.
- Added capturePhoto() and closeCameraPreview() functions for better camera UX.
- Camera preview shows as a full-screen modal with Capture and Cancel buttons.
*/
import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera, X, CheckCircle, AlertCircle, ChevronRight, MapPin, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { useReport } from '../App.jsx'
import { uploadImage } from '../services/api.js'
import PageWrapper from '../components/PageWrapper.jsx'

export default function UploadPage() {
  const { report, updateReport } = useReport()
  const navigate         = useNavigate()

  const [file,              setFile]              = useState(null)
  const [preview,           setPreview]           = useState(null)
  const [uploading,         setUploading]         = useState(false)
  const [location,          setLocation]          = useState('')
  const [email,             setEmail]             = useState(report.userEmail || '')
  const [coords,            setCoords]            = useState(null)   // { latitude, longitude, accuracy }
  const [locating,          setLocating]          = useState(false)  // GPS fetch in progress
  const [geocoding,         setGeocoding]         = useState(false)  // reverse geocode in progress
  const [showCameraPreview, setShowCameraPreview] = useState(false)  // camera modal visible
  const [cameraStream,      setCameraStream]      = useState(null)   // active media stream

  const setPreviewFromFile = (nextFile) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(nextFile)
    })
  }

  // ── Reverse Geocoding using Nominatim (free, no API key needed) ────────────
  const reverseGeocode = async (lat, lng) => {
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { 
          headers: { 
            'Accept-Language': 'en',
            'User-Agent': 'Y.F.N.A-Reporter/1.0'
          } 
        }
      )
      const data = await res.json()
      
      // Build human-readable address from components
      const addr = data.address
      const parts = [
        addr.road || addr.pedestrian || addr.footway,
        addr.neighbourhood || addr.suburb,
        addr.city || addr.town || addr.village || addr.county,
        addr.state,
      ].filter(Boolean)
      
      const readableAddress = parts.join(', ')
      setLocation(readableAddress)
      toast.success('Location detected automatically!')
    } catch {
      toast.error('Could not convert coordinates to address. Please type your location.')
    } finally {
      setGeocoding(false)
    }
  }

  // ── Detect Location button for file uploads ────────────────────────────────
  const detectLocation = async () => {
    // Check HTTPS requirement
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost'
    if (!isSecure) {
      toast('Location detection requires HTTPS in production.', { icon: '⚠️' })
      return
    }

    setLocating(true)
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      )
      const { latitude, longitude, accuracy } = position.coords
      setCoords({ latitude, longitude, accuracy })
      await reverseGeocode(latitude, longitude)
    } catch {
      toast.error('Could not detect location. Please enter it manually.')
    } finally {
      setLocating(false)
    }
  }

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length) {
      toast.error('Only image files are accepted (JPEG, PNG, WEBP).')
      return
    }
    const f = accepted[0]
    setFile(f)
    setPreviewFromFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  })

  const clearImage = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  // ── Camera capture with geolocation ──────────────────────────────────────
  const handleCamera = async () => {
    // Check HTTPS requirement
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost'
    if (!isSecure) {
      toast('Camera & location detection require HTTPS in production.', { icon: '⚠️' })
      return
    }

    try {
      // Request camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',  // use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })

      setCameraStream(stream)
      setShowCameraPreview(true)

      // Request geolocation in parallel (don't wait for camera)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          setCoords({ latitude, longitude, accuracy })
          reverseGeocode(latitude, longitude)
        },
        () => {
          toast('Location not detected — please enter it manually.', { icon: '📍' })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Camera access denied or unavailable.')
    }
  }

  // ── Capture photo from camera preview ────────────────────────────────────
  const capturePhoto = async () => {
    if (!cameraStream) return

    try {
      const track = cameraStream.getVideoTracks()[0]
      const ic = new ImageCapture(track)
      const blob = await ic.takePhoto()
      const f = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      // Stop camera
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
      setShowCameraPreview(false)

      setFile(f)
      setPreviewFromFile(f)
      toast.success('Photo captured!')
    } catch (err) {
      console.error('Capture error:', err)
      toast.error('Failed to capture photo.')
    }
  }

  // ── Close camera preview ────────────────────────────────────────────────
  const closeCameraPreview = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    setShowCameraPreview(false)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file) { toast.error('Please select an image first.'); return }
    if (!email.trim()) { toast.error('Please enter your Gmail address.'); return }
    setUploading(true)
    try {
      const data = await uploadImage(file)
      const base = (import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000`).replace(/\/$/, '')
      const imageUrl = `${base}/uploads/${data.filename}`

      updateReport({
        uploadedFile: file,
        previewUrl: preview,
        sessionId: data.session_id,
        location,
        coords,
        locationSource: coords ? 'gps' : 'manual',
        userEmail: email,
        imageUrl,
      })
      navigate('/result')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageWrapper>
      {/* Camera Preview Modal */}
      <AnimatePresence>
        {showCameraPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md flex flex-col gap-4"
            >
              {/* Camera Video Preview */}
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={(el) => {
                    if (el && cameraStream && !el.srcObject) {
                      el.srcObject = cameraStream
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-96 object-cover"
                />
              </div>

              {/* Capture & Cancel Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={capturePhoto}
                  className="btn-primary flex-1 py-3 justify-center"
                >
                  <Camera size={16} />
                  Capture Photo
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={closeCameraPreview}
                  className="btn-ghost flex-1 py-3 justify-center"
                >
                  <X size={16} />
                  Cancel
                </motion.button>
              </div>

              <p className="label-mono text-center" style={{ color: 'var(--text-secondary)' }}>
                Position your camera and tap "Capture Photo"
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <p className="label-mono mb-3">Step 01 / 04</p>
          <h1 className="display-lg mb-3">Upload an image</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Photograph the infrastructure defect clearly. Good lighting and proximity improve detection accuracy.
          </p>
        </motion.div>

        {/* Drop zone / preview */}
        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
            >
              <div
                {...getRootProps()}
                className="relative rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  border: `2px dashed ${isDragActive ? 'var(--accent-main)' : 'var(--border-strong)'}`,
                  background: isDragActive ? 'rgba(232,197,71,0.05)' : 'var(--bg-secondary)',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                }}
              >
                <input {...getInputProps()} />
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: isDragActive ? 'rgba(232,197,71,0.15)' : 'var(--bg-elevated)',
                    color: isDragActive ? 'var(--accent-main)' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Upload size={24} />
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.4rem' }}>
                  {isDragActive ? 'Drop the image here' : 'Drag & drop an image'}
                </p>
                <p className="label-mono" style={{ color: 'var(--text-muted)' }}>
                  or click to browse · JPEG, PNG, WEBP up to 20 MB
                </p>
              </div>

              {/* Camera button */}
              <div className="flex items-center gap-3 mt-4">
                <div className="divider flex-1" />
                <span className="label-mono">or</span>
                <div className="divider flex-1" />
              </div>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCamera}
                className="btn-ghost w-full justify-center mt-4"
              >
                <Camera size={16} />
                Use Camera
              </motion.button>
            </motion.div>

          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="surface overflow-hidden"
            >
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full object-cover rounded-t-xl"
                  style={{ maxHeight: '340px' }}
                />
                <button
                  onClick={clearImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(22,20,15,0.8)', color: 'var(--text-primary)' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 flex items-center gap-3">
                <CheckCircle size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {file?.name}
                  </p>
                  <p className="label-mono mt-0.5">
                    {(file?.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-6"
        >
          <label className="label-mono block mb-2">Location</label>
          <p className="label-mono mb-3" style={{ color: 'var(--text-muted)' }}>
            Auto-detected if you use camera · or click 'Detect My Location' · or type manually
          </p>
          <div className="flex gap-2 items-start">
            <input
              type="text"
              placeholder="e.g. MG Road near bus stop 14, Hyderabad"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="input-base flex-1"
            />
            {!file && (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={detectLocation}
                disabled={locating || geocoding}
                className="btn-ghost px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {locating || geocoding ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Locating…
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Detect
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* GPS Status Indicators */}
          {geocoding && (
            <p className="label-mono mt-2 text-yellow-600" style={{ color: 'var(--accent-main)' }}>
              Detecting location...
            </p>
          )}
          {coords && location && coords.latitude && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 500 }}>
                ✓ GPS Located · accuracy: ~{Math.round(coords.accuracy)}m · {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </span>
            </div>
          )}
          {location && !coords && (
            <p className="label-mono mt-2" style={{ color: 'var(--text-muted)' }}>
              Location entered manually
            </p>
          )}
        </motion.div>

        {/* Email field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-6"
        >
          <label className="label-mono block mb-2">Your Gmail address (required to file complaint)</label>
          <input
            type="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              updateReport({ userEmail: e.target.value })
            }}
            className="input-base"
            required
          />
          <p className="label-mono mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Your complaint will be sent from your own Gmail account
          </p>
        </motion.div>

        {/* Tip */}
        {!preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3 mt-5 p-4 rounded-xl"
            style={{ background: 'rgba(232,197,71,0.06)', border: '1px solid rgba(232,197,71,0.15)' }}
          >
            <AlertCircle size={15} style={{ color: 'var(--accent-main)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent-main)' }}>Tip:</strong> Capture the defect from 1–3 metres with good natural light.
              Avoid blurry or very dark images for best results.
            </p>
          </motion.div>
        )}

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="mt-8 flex justify-end"
        >
          <motion.button
            whileHover={!uploading && file ? { y: -2 } : {}}
            whileTap={!uploading && file ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!file || uploading || !email.trim()}
            className="btn-primary px-8 py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                Analyse Image <ChevronRight size={16} />
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
