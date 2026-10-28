//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Purchase VAT Repository Interface
//===============================================================

public interface IPurchaseVatRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<PurchaseVatDto>> GetAllAsync();

    Task<PurchaseVatDto?> GetByIdAsync(
        long id);

    Task<PurchaseVatDefaultsDto> GetDefaultsAsync();

    // The rule in force for a VAT Type on a date (null = none)
    Task<PurchaseVatDto?> GetRateAsync(
        string vatType,
        DateOnly date);


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreatePurchaseVatDto dto,
        long userId);

    Task UpdateAsync(
        UpdatePurchaseVatDto dto,
        long userId);

    Task ExtendAsync(
        ExtendPurchaseVatDto dto,
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