//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Edit : the whole form in one save (the ride comes from the
// link's PublicId)
//
// Live (Booked / Confirmed) :
//   a new date / slot moves it (Booked again, the enquiry's ride
//   date follows); Status Confirmed / Ridden / No-show /
//   Cancelled (reason) as on the board; bike, executive, note.
// Closed (Ridden / No-show / Cancelled) : executive and note only.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public class UpdateTestRidesDto
{
    public DateOnly RideDate { get; set; }

    // "HH:mm"
    public string SlotStart { get; set; } = string.Empty;

    // The enquiry's model or its second model (0 = keep the bike)
    public long ModelId { get; set; }

    // The sales executive (0 = keep)
    public long AdvisorUserId { get; set; }

    public string Note { get; set; } = string.Empty;

    // Booked / Confirmed / Ridden / NoShow / Cancelled
    public string Status { get; set; } = string.Empty;

    // Required for Cancelled
    public string Reason { get; set; } = string.Empty;

    // Move into a full slot anyway (after a warning)
    public bool AllowOverbook { get; set; }
}
