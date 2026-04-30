import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
})

// ── Image upload ─────────────────────────────────────────────────────────────
export async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data   // { session_id, filename, size_bytes }
}

// ── Analyse ──────────────────────────────────────────────────────────────────
export async function analyzeImage(sessionId) {
  const { data } = await api.post('/analyze-image', { session_id: sessionId })
  return data   // { label, confidence, bounding_boxes, below_threshold }
}

// ── Clarify (human-in-loop) ──────────────────────────────────────────────────
export async function submitClarification(sessionId, answers) {
  const { data } = await api.post('/clarify', {
    session_id: sessionId,
    answers,
  })
  return data   // { label, confidence }
}

// ── Generate complaint ────────────────────────────────────────────────────────
export async function generateComplaint(payload) {
  // payload: { session_id, issue_type, location, severity, additional_notes, latitude?, longitude? }
  const { data } = await api.post('/generate-complaint', payload)
  return data   // { complaint_text }
}

// ── Submit complaint ──────────────────────────────────────────────────────────
export async function submitComplaint(payload) {
  // payload: { session_id, complaint_text, contact_email? }
  const { data } = await api.post('/submit-complaint', payload)
  return data   // { submission_id, submitted_at }
}

export default api
