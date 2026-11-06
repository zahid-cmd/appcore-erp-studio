//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Edit : the whole form in one save (the appointment comes from
// the link's PublicId)
//
// Live (Booked / Confirmed) :
//   a new date / slot moves it (Booked again, the enquiry's visit
//   date follows); Status Confirmed / Arrived / No-show /
//   Cancelled (reason) as on the board; advisor and note.
// Closed (Arrived / No-show / Cancelled) : advisor and note only.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public class UpdateServiceAppointmentsDto
{
    public DateOnly AppointmentDate { get; set; }

    // "HH:mm"
    public string SlotStart { get; set; } = string.Empty;

    // 0 = keep the advisor
    public long AdvisorUserId { get; set; }

    public string Note { get; set; } = string.Empty;

    // Booked / Confirmed / Arrived / NoShow / Cancelled
    public string Status { get; set; } = string.Empty;

    // Required for Cancelled
    public string Reason { get; set; } = string.Empty;

    // Move into a full slot anyway (after a warning)
    public bool AllowOverbook { get; set; }
}
