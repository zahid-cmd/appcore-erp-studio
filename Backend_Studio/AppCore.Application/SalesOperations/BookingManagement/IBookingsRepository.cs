//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.BookingManagement;


//===============================================================
// Bookings repository (motor bikes; hand-written page, NO Code
// Synchronization). branchId = the login branch.
//===============================================================

public interface IBookingsRepository
{
    Task<BookingsPageDto> GetPageAsync(
        long branchId);

    Task<BookingSavedDto> CreateAsync(
        CreateBookingDto dto,
        long branchId,
        long userId);

    Task UpdateAsync(
        Guid publicId,
        UpdateBookingDto dto,
        long userId);

    Task<BookingSavedDto> CollectAsync(
        Guid publicId,
        CollectBookingDto dto,
        long branchId,
        long userId);

    Task<BookingSavedDto> CancelAsync(
        Guid publicId,
        CancelBookingDto dto,
        long branchId,
        long userId);

    // Open bookings of a customer (Sales Invoice - MB)
    Task<List<OpenBookingDto>> GetOpenForCustomerAsync(
        long customerId);
}
