//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Model Onboarding Service
//===============================================================

public interface IModelOnboardingService
{
    Task<ModelOnboardingDefaultsDto> GetDefaultsAsync();

    // All or nothing : throws InvalidOperationException with a
    // readable message when something is not allowed
    Task<ModelOnboardingResultDto> OnboardAsync(
        ModelOnboardingRequestDto request,
        long userId);
}
