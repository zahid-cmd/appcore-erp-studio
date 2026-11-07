//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.RegistrationControl;


//===============================================================
// Registration Configuration Repository Interface
//
// Rules broken -> InvalidOperationException (400 / 409),
// missing row -> KeyNotFoundException (404).
//===============================================================

public interface IRegistrationConfigurationRepository
{
    //===========================================================
    // Read (every tab in one call) / next codes
    //===========================================================

    Task<RegistrationConfigurationDto> GetAllAsync();

    Task<RegistrationConfigurationDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Registration Types
    //===========================================================

    Task<Guid> CreateTypeAsync(SaveRegistrationTypeDto dto, long userId);

    Task UpdateTypeAsync(Guid publicId, SaveRegistrationTypeDto dto, long userId);

    Task DeleteTypeAsync(Guid publicId, long userId);

    Task<bool> RestoreTypeAsync(long userId);


    //===========================================================
    // Registration Fees
    //===========================================================

    Task<Guid> CreateFeeAsync(SaveRegistrationFeeDto dto, long userId);

    Task UpdateFeeAsync(Guid publicId, SaveRegistrationFeeDto dto, long userId);

    Task DeleteFeeAsync(Guid publicId, long userId);

    Task<bool> RestoreFeeAsync(long userId);


    //===========================================================
    // Registration Costs
    //===========================================================

    Task<Guid> CreateCostAsync(SaveRegistrationCostDto dto, long userId);

    Task UpdateCostAsync(Guid publicId, SaveRegistrationCostDto dto, long userId);

    Task DeleteCostAsync(Guid publicId, long userId);

    Task<bool> RestoreCostAsync(long userId);


    //===========================================================
    // Stage Timings (edit only)
    //===========================================================

    Task UpdateStageAsync(Guid publicId, SaveRegistrationStageTimingDto dto, long userId);
}
