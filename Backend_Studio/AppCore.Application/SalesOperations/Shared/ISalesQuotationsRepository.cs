//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Sales Quotations repository (MB / SP / AC; one page per type).
// The controller prices the body first with the Sales Invoice
// engine of the type in quotation mode (QuoteAsync, quotation
// true) and hands the priced result in : the repository stores it.
//===============================================================

public interface ISalesQuotationsRepository
{
    Task<List<SalesQuotationListItemDto>> GetAllAsync(
        string productType);

    Task<SalesQuotationDto?> GetAsync(
        string productType,
        Guid publicId);

    Task<SalesQuotationSavedDto> CreateAsync(
        string productType,
        SaveSalesQuotationDto dto,
        SalesInvoiceQuoteDto priced,
        long branchId,
        long userId);

    Task<SalesQuotationSavedDto> UpdateAsync(
        string productType,
        Guid publicId,
        SaveSalesQuotationDto dto,
        SalesInvoiceQuoteDto priced,
        long userId);

    Task CancelAsync(
        string productType,
        Guid publicId,
        CancelSalesQuotationDto dto,
        long userId);

    // Open quotation (no invoice made from it) : soft delete
    Task DeleteAsync(
        string productType,
        Guid publicId,
        long userId);
}
