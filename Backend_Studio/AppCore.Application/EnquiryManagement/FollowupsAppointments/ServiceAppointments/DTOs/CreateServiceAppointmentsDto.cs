//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Add : book an appointment (the same rules as the board)
//
//   ServiceEnquiryId : an open Service enquiry with no live
//                      appointment
//   BranchId         : 0 = the enquiry's branch
//   AppointmentDate  : today .. the booking window (switch 0024)
//   SlotStart        : "HH:mm", a slot of the default Service
//                      Appointment time slot
//   AdvisorUserId    : 0 = the user who books
//   AllowOverbook    : book a full slot anyway (after a warning;
//                      switch 0022)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public class CreateServiceAppointmentsDto
    : BookServiceAppointmentDto
{
}
