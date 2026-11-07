//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.CustomerFile;


//===============================================================
// Customer Files Repository Interface (hand-written page)
//
// Rules broken -> InvalidOperationException (400 / 409),
// missing row -> KeyNotFoundException (404).
//===============================================================

public interface ICustomerFilesRepository
{
    Task<CustomerFilesPageDto> GetAllAsync();

    Task<CustomerFilesDefaultsDto> GetDefaultsAsync();

    // Policy in force for a transfer of this file on this date
    Task<NameTransferQuoteDto> GetTransferQuoteAsync(Guid filePublicId, string? date);


    // Opening files (CF-OPEN-0001)
    Task<Guid> CreateOpeningFileAsync(SaveOpeningFileDto dto, long branchId, long userId);

    Task UpdateOpeningFileAsync(Guid publicId, SaveOpeningFileDto dto, long userId);

    // Open / ReadyForDelivery / Delivered / Cancelled
    Task SetStatusAsync(Guid publicId, SetCustomerFileStatusDto dto, long userId);


    // Name transfers
    Task<Guid> CreateNameTransferAsync(SaveNameTransferDto dto, long userId);

    // Only the latest transfer of an Open file
    Task CancelNameTransferAsync(Guid publicId, long userId);
}
