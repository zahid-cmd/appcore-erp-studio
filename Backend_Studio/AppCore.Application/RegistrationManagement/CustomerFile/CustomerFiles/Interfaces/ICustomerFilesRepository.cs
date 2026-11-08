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
    Task<CustomerFilesPageDto> GetAllAsync(long branchId);

    Task<CustomerFilesDefaultsDto> GetDefaultsAsync();

    // Policy in force for a transfer of this file on this date
    Task<NameTransferQuoteDto> GetTransferQuoteAsync(Guid filePublicId, string? date);


    // Opening files (CF-OPEN-0001)
    Task<Guid> CreateOpeningFileAsync(SaveOpeningFileDto dto, long branchId, long userId);

    Task UpdateOpeningFileAsync(Guid publicId, SaveOpeningFileDto dto, long userId);

    // Open / ReadyForDelivery / Delivered / Cancelled. Delivered
    // with an unpaid custody charge raises the charge (Pending)
    // and returns Done = false, unless WithoutPayment.
    Task<CustomerFileStatusResultDto> SetStatusAsync(Guid publicId, SetCustomerFileStatusDto dto, long branchId, long userId);

    // Custody charge if the file is collected on this date
    Task<CustodyQuoteDto> GetCustodyQuoteAsync(Guid filePublicId, string? date);


    // Name transfers (FeePending until the fee is collected)
    Task<NameTransferSavedDto> CreateNameTransferAsync(SaveNameTransferDto dto, long branchId, long userId);

    // The latest transfer of an Open file (a pending one with its
    // fee; a completed one only when its fee is not paid / due)
    Task CancelNameTransferAsync(Guid publicId, long userId);


    // Fees Collection
    Task<CollectCustomerFileFeesResultDto> CollectFeesAsync(CollectCustomerFileFeesDto dto, long branchId, long userId);

    // A Pending fee (a name transfer fee cancels its transfer)
    Task CancelFeeAsync(Guid publicId, long userId);
}
