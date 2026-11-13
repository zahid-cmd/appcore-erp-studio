//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Terms & Conditions repository (hand-written page)
//===============================================================

public interface ITermsConditionsRepository
{
    Task<List<TermsConditionListItemDto>> GetListAsync();

    Task<TermsConditionSetDto> GetAsync(Guid publicId);

    Task<TermsConditionDefaultsDto> GetDefaultsAsync();

    // The operation's Default set (active), null = none : used by
    // the documents (sales invoices, quotations, bookings, POs)
    Task<TermsConditionSetDto?> GetDefaultForAsync(string operationCode);

    Task<TermsConditionSetDto> CreateAsync(SaveTermsConditionSetDto dto, long userId);

    Task UpdateAsync(Guid publicId, SaveTermsConditionSetDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted set back; false = none
    Task<bool> RestoreAsync(long userId);
}
