//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Service Appointments : a workshop visit booked for an open
// Service-type enquiry (Follow-ups & Appointments › Service
// Appointments page)
//
// One slot of the day from the default Service Appointment time
// slot (Enquiry Setup › Time Slots). Status :
//   Booked → Confirmed (customer called back and agreed)
//          → Arrived (the bike came in)
//   or NoShow / Cancelled (reason).
// Booked and Confirmed are "live" : one live visit per enquiry. A
// reschedule moves the date / slot of the same row (history keeps
// the old one) and sets it Booked again.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06) :
// ServiceAppointments_Tables.sql + EnquiryFollowUps_PublicId.sql.
// Never run Code Synchronization or its rollback again for the
// Service Appointments submenu : it would put the baseline back.
//===============================================================

public class ServiceAppointments
{
    public long ServiceAppointmentId { get; set; }

    // Links and the address bar (EnquiryFollowUps_PublicId.sql)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public DateOnly AppointmentDate { get; set; }

    public TimeOnly SlotStart { get; set; }

    public TimeOnly SlotEnd { get; set; }

    // The time slot (Enquiry Setup) the slot came from
    public long? TimeSlotId { get; set; }

    // Booked / Confirmed / Arrived / NoShow / Cancelled
    public string Status { get; set; } = "Booked";

    public DateTime? StatusDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    // Service advisor who receives the bike
    public long AdvisorUserId { get; set; }

    public string AdvisorName { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public int RescheduleCount { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
