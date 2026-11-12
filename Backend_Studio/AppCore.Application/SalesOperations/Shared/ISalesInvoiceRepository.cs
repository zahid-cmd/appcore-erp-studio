//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Sales invoices repository : one engine for Sales Invoices -
// SP / AC / MB
//
// Quote    : prices an invoice (nothing saved)
// Draft    : Create / Update / Delete / Restore (switch Post on
//            Approval ON). OFF : Create / Update post at once.
// Approve  : Draft -> Approved
// Return   : Approved -> Draft
// Post     : Approved -> Posted (journal, stock out FIFO,
//            VAT register, Price Adjustment release, Receipt
//            Voucher for the payments)
// Cancel   : Approved -> Cancelled; Posted -> Cancelled (switch
//            Allow Cancel of Posted Invoice; everything reversed)
//===============================================================

public interface ISalesInvoiceRepository
{
    Task<List<SalesInvoiceListItemDto>> GetAllAsync(
        string pageType,
        string? status);

    Task<SalesInvoiceDto?> GetByIdAsync(
        long id);

    Task<SalesInvoiceDefaultsDto> GetDefaultsAsync(
        string pageType,
        long branchId,
        DateOnly invoiceDate,
        long userId);

    Task<List<SalesInvoiceProductDto>> GetProductsAsync(
        string pageType,
        long warehouseId,
        string? search,
        long? categoryId = null,
        long? subCategoryId = null,
        bool browse = false);

    // Sales Invoices - MB : bikes in stock in the warehouse
    // (oldest first); the invoice's own bikes are not "taken"
    Task<List<SalesInvoiceBikeUnitDto>> GetBikeUnitsAsync(
        long warehouseId,
        long invoiceId);

    // Sales Invoices - MB : the bike's warranty (Warranty
    // Management › Warranty Configuration, the policy in force on
    // the date; null = not a bike / no policy)
    Task<SalesInvoiceWarrantyDto?> GetBikeWarrantyAsync(
        long productId,
        DateOnly? date);

    // Live search : phone (1 / 2), name or code; at most 10
    Task<List<SalesInvoiceCustomerSearchItemDto>> SearchCustomersAsync(
        string pageType,
        string? text);

    Task<SalesInvoiceCustomerDto> LookupCustomerAsync(
        string pageType,
        string? phone,
        DateOnly date);

    // Add Customer : an Outside customer tagged Walk-in (switch
    // Allow Walk-in Customers)
    Task<SalesInvoiceCustomerDto> CreateWalkInCustomerAsync(
        string pageType,
        SalesInvoiceWalkInDto dto,
        long userId);

    // quotation true : priced for a Sales Quotation (customer
    // optional, no stock needed, MB models without chassis, no
    // payment / term rules)
    Task<SalesInvoiceQuoteDto> QuoteAsync(
        CreateSalesInvoiceDto dto,
        bool canGiveSpecialDiscount,
        long userId,
        bool quotation = false);

    Task<SalesInvoiceSavedDto> CreateAsync(
        CreateSalesInvoiceDto dto,
        bool canGiveSpecialDiscount,
        long userId);

    Task<SalesInvoiceSavedDto> UpdateAsync(
        UpdateSalesInvoiceDto dto,
        bool canGiveSpecialDiscount,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        string pageType,
        long userId);

    Task ApproveAsync(
        long id,
        long userId);

    Task ReturnToDraftAsync(
        long id,
        long userId);

    Task<SalesInvoiceSavedDto> PostAsync(
        long id,
        long userId);

    Task CancelAsync(
        long id,
        CancelSalesInvoiceDto dto,
        long userId);

    // MB : reverse the registration of a posted invoice (Journal
    // Voucher; its Registration Profiles cancelled). Reason in dto.
    Task ReverseRegistrationAsync(
        long id,
        CancelSalesInvoiceDto dto,
        long userId);

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // List page (server paging) and Public Id
    //===========================================================

    // One page of the list plus the tab counts
    Task<SalesInvoicePagedResult> GetPagedAsync(
        string pageType,
        SalesInvoicePageRequest request);

    // Public Id -> internal id (live rows; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);


    //===========================================================
    // Sales Returns (one posted invoice per return;
    // SalesInvoiceRepositoryBase.Returns.cs)
    //===========================================================

    Task<SalesReturnSwitchesDto> GetReturnSwitchesAsync(
        long? branchId);

    // Posted invoices of the page (the login branch) with
    // something left to return
    Task<List<SalesReturnInvoiceItemDto>> FindReturnInvoicesAsync(
        string? search,
        long? branchId);

    // One invoice with what can still be returned (except : the
    // return being edited)
    Task<SalesReturnInvoiceDto> GetReturnInvoiceAsync(
        Guid invoicePublicId,
        Guid? exceptReturnPublicId);

    Task<List<SalesReturnListItemDto>> GetReturnsAsync();

    Task<SalesReturnDto?> GetReturnAsync(
        Guid publicId);

    // Draft (Post on Approval OFF : posted at once)
    Task<SalesReturnSavedDto> CreateReturnAsync(
        SaveSalesReturnDto dto,
        long userId);

    Task<SalesReturnSavedDto> UpdateReturnAsync(
        Guid publicId,
        SaveSalesReturnDto dto,
        long userId);

    Task ApproveReturnAsync(
        Guid publicId,
        long userId);

    Task ReturnToDraftReturnAsync(
        Guid publicId,
        long userId);

    Task<SalesReturnSavedDto> PostReturnAsync(
        Guid publicId,
        long userId);

    Task CancelReturnAsync(
        Guid publicId,
        CancelSalesReturnDto dto,
        long userId);

    Task DeleteReturnAsync(
        Guid publicId,
        long userId);
}
