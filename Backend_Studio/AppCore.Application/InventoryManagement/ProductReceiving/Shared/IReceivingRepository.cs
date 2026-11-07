//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.ProductReceiving;


//===============================================================
// Product Receiving repository : one engine for Motor Bike /
// Spare Parts & Lubricants / Accessories Receiving.
//
// Create : posted on save. The received quantity of each purchase
//          line moves from In Transit to On Hand (same batch, same
//          cost) in the warehouse; bikes come into stock with
//          their numbers. No accounting entry (the purchase
//          already debited the inventory ledger).
// Cancel : while none of the received stock has left the
//          warehouse : the stock goes back to In Transit.
//===============================================================

public interface IReceivingRepository
{
    Task<List<ReceivingDto>> GetAllAsync(
        string pageType);

    Task<ReceivingDto?> GetByIdAsync(
        long id);

    Task<ReceivingDefaultsDto> GetDefaultsAsync(
        string pageType,
        long branchId,
        DateOnly date);

    // Posted purchases of the branch with stock in transit, with
    // their lines (purchased / received before / in transit)
    Task<List<ReceivingPurchaseOptionDto>> GetPendingPurchasesAsync(
        string pageType,
        long branchId);

    Task<List<ReceivingUnitTakenDto>> CheckUnitsAsync(
        ReceivingUnitCheckDto dto);

    Task<ReceivingSavedDto> CreateAsync(
        CreateReceivingDto dto,
        long userId);

    Task CancelAsync(
        long id,
        CancelReceivingDto dto,
        long userId);

    // MB : Close Due (the rest of one free-accessory due row is
    // written off)
    Task CloseAccessoryDueAsync(
        long dueId,
        long branchId,
        CloseAccessoryDueDto dto,
        long userId);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    // One page of the list plus the tab counts
    Task<AppCore.Application.Common.Paging.PagedResult<ReceivingDto>> GetPagedAsync(
        string pageType,
        ReceivingPageRequest request);
}
