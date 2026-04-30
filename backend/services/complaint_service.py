"""
services/complaint_service.py
──────────────────────────────
Template-based complaint text generation.
All inputs are plain strings; no external AI dependency required.
"""
from __future__ import annotations

from datetime import datetime


# ─── Severity descriptions ────────────────────────────────────────────────────

_SEVERITY_DESC = {
    "minor":    "a minor issue that, while currently causing minimal disruption",
    "moderate": "a moderate issue that is causing significant inconvenience",
    "severe":   "a severe and potentially hazardous issue that poses immediate risk",
}

_SEVERITY_URGENCY = {
    "minor":    "We kindly request that this matter be addressed at your earliest convenience.",
    "moderate": "We request that this issue be resolved within the next 7 working days.",
    "severe":   "We urge immediate intervention within 24–48 hours to prevent accidents or further damage.",
}


# ─── Issue-specific context ───────────────────────────────────────────────────

_ISSUE_CONTEXT = {
    "Pothole": (
        "The pothole poses a significant danger to motorists and two-wheelers, "
        "risking tyre damage, vehicle accidents, and pedestrian injuries."
    ),
    "Broken Streetlight": (
        "The non-functional streetlight has left the area in darkness during night hours, "
        "increasing safety risks for pedestrians and creating conditions conducive to criminal activity."
    ),
    "Water Leakage": (
        "The water leakage is resulting in wastage of public water resources, "
        "damage to road surfaces, and potential waterlogging that disrupts traffic and daily life."
    ),
    "Garbage Accumulation": (
        "The uncleared garbage is a serious public health hazard, attracting pests and stray animals "
        "and creating unsanitary conditions for nearby residents and commuters."
    ),
    "Damaged Footpath": (
        "The damaged footpath is forcing pedestrians onto the road, heightening the risk of accidents, "
        "particularly for elderly citizens, children, and differently-abled individuals."
    ),
    "Collapsed Drain Cover": (
        "The collapsed or missing drain cover presents an extreme fall hazard for pedestrians and cyclists, "
        "and may allow debris to block the drainage system."
    ),
    "Cracked Road Surface": (
        "The extensive cracking of the road surface is accelerating road deterioration, "
        "causing vehicle damage, and increasing accident risk particularly during rain."
    ),
    "Fallen Tree / Branch": (
        "The fallen tree or branch is obstructing traffic, damaging property, "
        "and posing immediate safety hazards to passersby."
    ),
}

_DEFAULT_CONTEXT = (
    "This infrastructure defect is adversely affecting the quality of life of residents "
    "and requires prompt attention from the relevant civic authority."
)


# ─── Main generator ───────────────────────────────────────────────────────────

def generate_complaint_text(
    issue_type: str,
    location: str,
    severity: str = "moderate",
    additional_notes: str = "",
    latitude: float | None = None,
    longitude: float | None = None,
) -> str:
    """
    Generate a structured, formal civic complaint letter.

    Args:
        issue_type:       Detected or user-confirmed issue class.
        location:         Human-readable address / landmark.
        severity:         "minor" | "moderate" | "severe"
        additional_notes: Any extra context from the user.
        latitude:         Optional GPS latitude coordinate.
        longitude:        Optional GPS longitude coordinate.

    Returns:
        Multi-paragraph complaint text as a string.
    """
    now         = datetime.now()
    date_str    = now.strftime("%d %B %Y")
    time_str    = now.strftime("%H:%M IST")
    ref_id      = f"CIV-{now.strftime('%Y%m%d')}-{now.microsecond // 1000:04d}"
    sev         = severity.lower() if severity.lower() in _SEVERITY_DESC else "moderate"
    sev_desc    = _SEVERITY_DESC[sev]
    sev_urgency = _SEVERITY_URGENCY[sev]
    issue_ctx   = _ISSUE_CONTEXT.get(issue_type, _DEFAULT_CONTEXT)
    loc_display = location.strip() if location.strip() else "the location shown in the attached photograph"

    # Build coordinates section with Google Maps link
    coords_line = ""
    if latitude is not None and longitude is not None:
        maps_url = f"https://www.google.com/maps?q={latitude},{longitude}"
        coords_line = f"\n    GPS Coordinates: {latitude:.6f}, {longitude:.6f}" \
                      f"\n    Google Maps: {maps_url}"

    notes_para = (
        f"\n\nAdditional context provided by the reporting citizen:\n\"{additional_notes.strip()}\""
        if additional_notes.strip() else ""
    )

    complaint = f"""Reference: {ref_id}
Date: {date_str}  |  Time: {time_str}

To,
The Executive Engineer / Municipal Commissioner,
Civic Infrastructure & Maintenance Department,
[Municipality / Corporation Name]

Subject: Urgent Complaint Regarding {issue_type} at {loc_display}

Respected Sir / Madam,

I am writing on behalf of the residents and commuters affected by {sev_desc} that has been reported \
at the following location:

    Location: {loc_display}{coords_line}
    Issue Type: {issue_type}
    Severity: {severity.capitalize()}
    Reported On: {date_str} at {time_str}

{issue_ctx}

Photographic evidence of the defect has been attached to this complaint for your reference \
and to facilitate rapid on-ground verification.
{notes_para}

We have brought this matter to your attention with the expectation that the concerned department \
will take swift and effective remedial action. {sev_urgency}

We further request that:
  1. An acknowledgement of receipt of this complaint be issued within 48 hours.
  2. A timeline for repair works be communicated to the reporting citizen.
  3. The completed repair be documented and the case be closed only after on-site verification.

Failure to act on this complaint in a timely manner will necessitate escalation to the \
District Collector's office and relevant civic grievance portals.

We thank you for your attention to this matter and trust that the civic administration \
will uphold its commitment to maintaining public infrastructure.

Yours faithfully,

[Citizen Name / Community Representative]
Submitted via CivicAI Reporter Platform
Reference ID: {ref_id}
"""

    return complaint.strip()
