//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Parts & Accessories Onboarding Service
//===============================================================

public interface IPartsOnboardingService
{
    Task<PartsOnboardingDefaultsDto> GetDefaultsAsync();

    // Items already in a sub category (template reference)
    Task<List<PartsOnboardingExistingDto>> GetExistingAsync(
        string productType,
        long productSubCategoryId);

    // Checks every row; nothing is written
    Task<PartsOnboardingAnalysisDto> AnalyzeAsync(
        PartsOnboardingRequestDto request);

    // All or nothing : every row sent must be Ready, else an
    // InvalidOperationException with a readable message
    Task<PartsOnboardingResultDto> OnboardAsync(
        PartsOnboardingRequestDto request,
        long userId);
}
