//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.ProvidentFund;


//===============================================================
// Provident Fund repository (hand-written pages)
//===============================================================

public interface IProvidentFundRepository
{
    // ---------- Policy (one record) ----------
    Task<PfPolicyDto> GetPolicyAsync();

    Task<PfPolicyDto> SavePolicyAsync(PfPolicyDto dto, long userId);

    // ---------- Members ----------
    Task<List<PfMemberDto>> GetMembersAsync();

    Task<PfMemberDto> GetMemberAsync(Guid publicId);

    Task<PfMemberDefaultsDto> GetMemberDefaultsAsync();

    Task<PfMemberDto> CreateMemberAsync(PfMemberDto dto, long userId);

    Task UpdateMemberAsync(Guid publicId, PfMemberDto dto, long userId);

    // Only a member with nothing in the ledger but the opening
    Task DeleteMemberAsync(Guid publicId, long userId);

    // ---------- Loans ----------
    Task<List<PfLoanDto>> GetLoansAsync();

    Task<PfLoanDto> GetLoanAsync(Guid publicId);

    Task<PfLoanDefaultsDto> GetLoanDefaultsAsync();

    Task<PfLoanDto> CreateLoanAsync(PfLoanDto dto, long userId);

    // Only a loan nothing was recovered of
    Task DeleteLoanAsync(Guid publicId, long userId);

    // ---------- Settlements ----------
    Task<List<PfSettlementDto>> GetSettlementsAsync();

    Task<PfSettlementDto> GetSettlementAsync(Guid publicId);

    Task<PfSettlementDefaultsDto> GetSettlementDefaultsAsync();

    // What the policy gives the member (nothing is saved)
    Task<PfSettlementDto> PreviewSettlementAsync(long memberId, string date, string reason);

    Task<PfSettlementDto> CreateSettlementAsync(PfSettlementDto dto, long userId);

    // The member is Active again, the ledger rows and loan
    // recoveries of the settlement go
    Task DeleteSettlementAsync(Guid publicId, long userId);

    // ---------- Interest ----------
    // The financial years and the interest credited already
    Task<PfInterestHomeDto> GetInterestHomeAsync();

    // The interest of a financial year as it would be credited
    Task<PfInterestYearDto> PreviewInterestAsync(long financialYearId);

    Task<PfInterestRunDto> PostInterestAsync(long financialYearId, long userId);

    // id : the financial year (or the calendar year of an interest
    // credited before financial years)
    Task DeleteInterestAsync(long id, long userId);

    // ---------- Reports ----------
    Task<PfStatementDto> GetStatementAsync(long memberId);

    Task<List<PfRegisterRowDto>> GetRegisterAsync(int year, int month);

    // Loan interest received and company parts forfeited
    Task<PfIncomeDto> GetIncomeAsync();
}
