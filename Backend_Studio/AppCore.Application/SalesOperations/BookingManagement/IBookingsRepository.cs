//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.BookingManagement;


//===============================================================
// Bookings repository (MB / SP / AC; hand-written pages, NO Code
// Synchronization). productType = MB / SP / AC (one page each);
// branchId = the login branch.
//===============================================================

public interface IBookingsRepository
{
    Task<BookingsPageDto> GetPageAsync(
        string productType,
        long branchId);

    Task<BookingSavedDto> CreateAsync(
        string productType,
        CreateBookingDto dto,
        long branchId,
        long userId);

    Task UpdateAsync(
        string productType,
        Guid publicId,
        UpdateBookingDto dto,
        long userId);

    Task<BookingSavedDto> CollectAsync(
        string productType,
        Guid publicId,
        CollectBookingDto dto,
        long branchId,
        long userId);

    Task<BookingSavedDto> CancelAsync(
        string productType,
        Guid publicId,
        CancelBookingDto dto,
        long branchId,
        long userId);

    // Open bookings of a customer (Sales Invoice of the type)
    Task<List<OpenBookingDto>> GetOpenForCustomerAsync(
        string productType,
        long customerId);

    // SP / AC : active products by name / code / part number
    Task<List<BookingProductDto>> SearchProductsAsync(
        string productType,
        string term);
}
