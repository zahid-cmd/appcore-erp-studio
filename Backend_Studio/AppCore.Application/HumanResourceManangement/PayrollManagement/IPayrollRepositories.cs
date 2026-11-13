//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.PayrollManagement;


//===============================================================
// Salary Advances repository (hand-written page)
//===============================================================

public interface ISalaryAdvancesRepository
{
    Task<List<SalaryAdvanceDto>> GetListAsync();

    Task<SalaryAdvanceDto> GetAsync(Guid publicId);

    Task<SalaryAdvanceDefaultsDto> GetDefaultsAsync();

    Task<SalaryAdvanceDto> CreateAsync(SalaryAdvanceDto dto, long userId);

    Task UpdateAsync(Guid publicId, SalaryAdvanceDto dto, long userId);

    // Only an advance no salary sheet has taken from
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted advance back : its code; null = none
    Task<string?> RestoreAsync(long userId);
}


//===============================================================
// Salary Sheets repository (hand-written pages)
//
//   Draft -> Approved -> Posted. Posting writes one Journal
//   Voucher (Posting Setup, group Payroll); unposting cancels it.
//===============================================================

public interface ISalarySheetsRepository
{
    Task<List<SalarySheetListItemDto>> GetListAsync();

    Task<SalarySheetDto> GetAsync(Guid publicId);

    Task<SalarySheetDefaultsDto> GetDefaultsAsync();

    // Makes the Draft sheet of a branch's month from the
    // attendance, the salary structures and the advances
    Task<SalarySheetDto> GenerateAsync(GenerateSalarySheetDto dto, long userId);

    // Draft : works everything out again (the typed amounts stay)
    Task RecalculateAsync(Guid publicId, long userId);

    // Draft : the typed amounts (other earning / deduction, remarks)
    Task SaveAsync(Guid publicId, SaveSalarySheetDto dto, long userId);

    Task ApproveAsync(Guid publicId, long userId);

    Task ReturnToDraftAsync(Guid publicId, long userId);

    // Approved -> Posted : the Journal Voucher
    Task PostAsync(Guid publicId, long userId);

    // Posted -> Approved : the Journal Voucher is cancelled
    Task UnpostAsync(Guid publicId, SalarySheetReasonDto dto, long userId);

    // Posted : marks lines paid / not paid; returns how many changed
    Task<int> PayAsync(Guid publicId, PaySalaryDto dto, long userId);

    // Draft only
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted sheet back : its code; null = none
    Task<string?> RestoreAsync(long userId);
}
