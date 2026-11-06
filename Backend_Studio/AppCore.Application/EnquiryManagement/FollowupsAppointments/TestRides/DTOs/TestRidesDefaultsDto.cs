//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Form defaults for one date and branch
// (GET defaults?date=&branchId=)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public class TestRidesDefaultsDto
{
    public DateOnly Date { get; set; }

    public long BranchId { get; set; }

    // The default Test Ride time slot ('' = none set)
    public string TimeSlotName { get; set; } = string.Empty;

    // Rides per slot
    public int Capacity { get; set; }

    // Switch 0005 : a full slot may be overbooked after a warning
    public bool AllowOverbook { get; set; } = true;

    // Why nothing can be booked that day ('' = fine)
    public string Message { get; set; } = string.Empty;

    // The day's slots with what is booked
    public List<AppointmentSlotDto> Slots { get; set; } = new();

    // Open sales enquiries with no live ride (Add), with their
    // model and second model (the bike to ride)
    public List<TestRideWaitingDto> Waiting { get; set; } = new();

    // Sales executives
    public List<EnquiryOptionDto> Advisors { get; set; } = new();
}
