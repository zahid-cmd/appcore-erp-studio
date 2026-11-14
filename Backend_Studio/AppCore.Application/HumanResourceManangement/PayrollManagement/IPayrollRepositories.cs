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

    // Overtime Sheets : the overtime of the posted salary sheets
    Task<List<OvertimeSheetListItemDto>> GetOvertimeSheetsAsync();

    Task<OvertimeSheetDto> GetOvertimeSheetAsync(Guid publicId);

    Task<SalarySheetDto> GetAsync(Guid publicId);

    Task<SalarySheetDefaultsDto> GetDefaultsAsync();

    // Advances of a branch due in a month but not (fully) paid out
    // by the month end : shown on Generate (not recovered)
    Task<List<UnpaidAdvanceDto>> GetUnpaidAdvancesAsync(long branchId, int year, int month);

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


//===============================================================
// Payments of Human Resource. group : "payroll" (Salary,
// Overtime) / "pf" (PfSettlement, PfLoan)
//===============================================================

public interface IHrPaymentsRepository
{
    Task<List<HrPaymentListItemDto>> GetListAsync(string group);

    Task<HrPaymentDto> GetAsync(string group, Guid publicId);

    // The salary sheets / settlements / loans with something due
    Task<List<HrPaymentSourceDto>> GetSourcesAsync(string group, string type);

    // The employees of a source : payable, paid, due
    Task<List<HrPaymentLineDto>> GetDuesAsync(string group, string type, long sourceId);

    // Saves the payment and its Payment Voucher (posted at once)
    Task<HrPaymentDto> CreateAsync(string group, CreateHrPaymentDto dto, long userId);

    // Cancels the payment and its Payment Voucher
    Task CancelAsync(string group, Guid publicId, CancelHrPaymentDto dto, long userId);
}


//===============================================================
// Leave Encashments
//===============================================================

public interface ILeaveEncashmentsRepository
{
    Task<List<LeaveEncashmentDto>> GetListAsync();

    Task<LeaveEncashmentDto> GetAsync(Guid publicId);

    Task<LeaveEncashmentDefaultsDto> GetDefaultsAsync();

    // The leave an employee can encash for a leave year, by the
    // employee's leave encashment policy
    Task<EncashEligibilityDto> GetBalanceAsync(long employeeId, int year);

    // Saves it as Pending : the days are held, nothing is posted
    Task<LeaveEncashmentDto> CreateAsync(LeaveEncashmentDto dto, long userId);

    // Pending -> Approved : posts its Journal Voucher
    Task ApproveAsync(Guid publicId, long userId);

    // Pending -> Rejected : the days go back
    Task RejectAsync(Guid publicId, SalarySheetReasonDto dto, long userId);

    // Cancels the voucher (when approved) and gives the days back
    Task DeleteAsync(Guid publicId, long userId);
}


//===============================================================
// Festival Bonus
//===============================================================

public interface IBonusSheetsRepository
{
    Task<List<BonusSheetListItemDto>> GetListAsync();

    Task<BonusSheetDto> GetAsync(Guid publicId);

    Task<BonusSheetDefaultsDto> GetDefaultsAsync();

    // Makes the Draft sheet of a branch
    Task<BonusSheetDto> GenerateAsync(GenerateBonusSheetDto dto, long userId);

    // Draft : the amounts typed
    Task SaveAsync(Guid publicId, SaveBonusSheetDto dto, long userId);

    // Draft -> Posted : the Journal Voucher
    Task PostAsync(Guid publicId, long userId);

    // Posted -> Draft : the Journal Voucher is cancelled
    Task UnpostAsync(Guid publicId, SalarySheetReasonDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);
}
