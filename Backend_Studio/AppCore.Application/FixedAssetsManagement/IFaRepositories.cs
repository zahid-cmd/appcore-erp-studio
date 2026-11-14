//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.FixedAssetsManagement;


//===============================================================
// Fixed Assets Management : repositories
//===============================================================

// Asset Categories, Asset Locations, Asset Configuration, and the
// lists every page needs
public interface IFaSetupRepository
{
    Task<FaLookupsDto> GetLookupsAsync();

    Task<List<FaCategoryDto>> GetCategoriesAsync();

    Task<FaCategoryDto> GetCategoryAsync(Guid publicId);

    // An asset group : making it makes its two ledgers
    // ("PPE - <name>", "ACD - <name>")
    Task<FaCategoryDto> SaveCategoryAsync(Guid? publicId, FaCategoryDto dto, long userId);

    // Depreciation of Fixed Assets : the rule of an asset group
    // (method, rate / life, residual %, the expense ledger). It
    // also goes onto the group's cards that are not depreciated yet.
    Task<FaCategoryDto> SaveDepreciationAsync(Guid publicId, FaCategoryDto dto, long userId);

    Task DeleteCategoryAsync(Guid publicId, long userId);

    Task<string?> RestoreCategoryAsync(long userId);

    Task<List<FaLocationDto>> GetLocationsAsync();

    Task<FaLocationDto> GetLocationAsync(Guid publicId);

    Task<FaLocationDto> SaveLocationAsync(Guid? publicId, FaLocationDto dto, long userId);

    Task DeleteLocationAsync(Guid publicId, long userId);

    Task<string?> RestoreLocationAsync(long userId);

    Task<FaConfigurationDto> GetConfigurationAsync();

    Task SaveConfigurationAsync(FaConfigurationDto dto, long userId);
}

// The asset cards (Fixed Asset Register, Opening Assets) and the
// Asset Acquisitions
public interface IFaAssetsRepository
{
    // source : '' (all) / Opening / Acquisition
    Task<List<FaAssetDto>> GetAssetsAsync(string? source);

    // With the history of the card
    Task<FaAssetDto> GetAssetAsync(Guid publicId);

    // An opening asset : the card and its depreciation to date,
    // no voucher
    Task<FaAssetDto> CreateOpeningAsync(SaveFaAssetDto dto, long userId);

    // The asset no the next card of this branch and asset group gets
    // (shown on the add form before it is saved); '' until both are
    // picked
    Task<string> NextAssetNoAsync(long branchId, long categoryId);

    Task UpdateAssetAsync(Guid publicId, SaveFaAssetDto dto, long userId);

    // An opening card with nothing after it
    Task DeleteAssetAsync(Guid publicId, long userId);

    Task<List<FaAcquisitionDto>> GetAcquisitionsAsync();

    Task<FaAcquisitionDto> GetAcquisitionAsync(Guid publicId);

    // Draft
    Task<FaAcquisitionDto> SaveAcquisitionAsync(Guid? publicId, FaAcquisitionDto dto, long userId);

    // Draft -> Posted : the Journal Voucher and the asset cards
    Task PostAcquisitionAsync(Guid publicId, long userId);

    // Posted -> Draft : cancels the voucher, removes the cards
    // (refused once a card was depreciated or moved)
    Task UnpostAcquisitionAsync(Guid publicId, FaReasonDto dto, long userId);

    Task DeleteAcquisitionAsync(Guid publicId, long userId);
}

// Depreciation Runs, Depreciation Schedule
public interface IFaDepreciationRepository
{
    Task<List<FaRunBranchDto>> GetBranchesAsync();

    Task<List<FaRunDto>> GetRunsAsync();

    Task<FaRunDto> GetRunAsync(Guid publicId);

    // What a run of the month would charge (nothing is saved)
    Task<FaRunDto> PreviewAsync(long branchId, int period);

    // Posts one Journal Voucher for the branch
    Task<FaRunDto> PostAsync(PostFaRunDto dto, long userId);

    // The last run of the branch only
    Task UndoAsync(Guid publicId, FaReasonDto dto, long userId);

    Task<FaScheduleDto> GetScheduleAsync(Guid assetPublicId);
}

// Disposals (Asset Movements - transfers, improvements, maintenance -
// were removed 2026-11-15 : not required)
public interface IFaMovementsRepository
{
    Task<List<FaDisposalDto>> GetDisposalsAsync();

    Task<FaDisposalDto> CreateDisposalAsync(FaDisposalDto dto, long userId);

    Task DeleteDisposalAsync(Guid publicId, long userId);
}

// Fixed Asset Schedule, Asset Verification
public interface IFaReportsRepository
{
    Task<FaScheduleReportDto> GetScheduleReportAsync(string? from, string? to, long branchId);

    Task<List<FaVerificationDto>> GetVerificationsAsync();

    Task<FaVerificationDto> GetVerificationAsync(Guid publicId);

    // Makes the count sheet : every card of the branch / location
    // that is not disposed
    Task<FaVerificationDto> CreateVerificationAsync(FaVerificationDto dto, long userId);

    // Draft : the results typed
    Task SaveVerificationAsync(Guid publicId, FaVerificationDto dto, long userId);

    Task CloseVerificationAsync(Guid publicId, long userId);

    Task DeleteVerificationAsync(Guid publicId, long userId);
}
