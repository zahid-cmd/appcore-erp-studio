//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Add : book a test ride (the same rules as the board)
//
//   SalesEnquiryId : an open sales enquiry (not matured) with no
//                    live ride
//   BranchId       : 0 = the enquiry's branch
//   RideDate       : today .. the booking window (switch 0007)
//   SlotStart      : "HH:mm", a slot of the default Test Ride
//                    time slot
//   ModelId        : the enquiry's model (0) or its second model
//   AdvisorUserId  : the sales executive; 0 = the user who books
//   AllowOverbook  : book a full slot anyway (after a warning;
//                    switch 0005)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public class CreateTestRidesDto
    : BookTestRideDto
{
}
