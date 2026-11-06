//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Test Rides : a test ride booked for an open sales enquiry
// (Follow-ups & Appointments › Test Rides page; table
// SalesTestRides)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06) : the
// class carries the generated name TestRides, the table stays
// SalesTestRides (SalesTestRides_Tables.sql +
// EnquiryFollowUps_PublicId.sql). Never run Code Synchronization
// or its rollback again for the Test Rides submenu.
//
// One slot of the day from the default Test Ride time slot
// (Enquiry Setup › Time Slots). Status :
//   Booked → Confirmed (customer called back and agreed)
//          → Ridden (the ride took place)
//   or NoShow / Cancelled (reason).
// Booked and Confirmed are "live" : one live ride per enquiry. A
// reschedule moves the date / slot of the same row (history keeps
// the old one) and sets it Booked again.
//===============================================================

public class TestRides
{
    public long SalesTestRideId { get; set; }

    // Links and the address bar (EnquiryFollowUps_PublicId.sql)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long SalesEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public DateOnly RideDate { get; set; }

    public TimeOnly SlotStart { get; set; }

    public TimeOnly SlotEnd { get; set; }

    // The time slot (Enquiry Setup) the slot came from
    public long? TimeSlotId { get; set; }

    // The bike to ride : the enquiry's model or its second model
    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    // Booked / Confirmed / Ridden / NoShow / Cancelled
    public string Status { get; set; } = "Booked";

    public DateTime? StatusDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    // Sales executive who takes the customer out
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
