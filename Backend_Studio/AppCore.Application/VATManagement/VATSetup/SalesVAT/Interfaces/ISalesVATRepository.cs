//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Sales VAT Repository Interface
//===============================================================

public interface ISalesVatRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<SalesVatDto>> GetAllAsync();

    Task<SalesVatDto?> GetByIdAsync(
        long id);

    Task<SalesVatDefaultsDto> GetDefaultsAsync();

    // The rule in force for a VAT Type on a date (null = none)
    Task<SalesVatDto?> GetRateAsync(
        string vatType,
        DateOnly date);


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateSalesVatDto dto,
        long userId);

    Task UpdateAsync(
        UpdateSalesVatDto dto,
        long userId);

    Task ExtendAsync(
        ExtendSalesVatDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}