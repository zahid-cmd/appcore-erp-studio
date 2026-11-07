//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.WarrantyManagement.WarrantyControl;


//===============================================================
// Warranty Configuration Repository Interface
//
// Rules broken -> InvalidOperationException (400 / 409),
// missing row -> KeyNotFoundException (404).
//===============================================================

public interface IWarrantyConfigurationRepository
{
    //===========================================================
    // Read (every tab in one call) / next codes
    //===========================================================

    Task<WarrantyConfigurationDto> GetAllAsync();

    Task<WarrantyConfigurationDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Warranty Parts
    //===========================================================

    Task<Guid> CreatePartAsync(SaveWarrantyPartDto dto, long userId);

    Task UpdatePartAsync(Guid publicId, SaveWarrantyPartDto dto, long userId);

    Task DeletePartAsync(Guid publicId, long userId);

    Task<bool> RestorePartAsync(long userId);


    //===========================================================
    // Warranty Policies
    //===========================================================

    Task<Guid> CreatePolicyAsync(SaveWarrantyPolicyDto dto, long userId);

    Task UpdatePolicyAsync(Guid publicId, SaveWarrantyPolicyDto dto, long userId);

    Task DeletePolicyAsync(Guid publicId, long userId);

    Task<bool> RestorePolicyAsync(long userId);


    //===========================================================
    // Warranty Coverages
    //===========================================================

    Task<Guid> CreateCoverageAsync(SaveWarrantyCoverageDto dto, long userId);

    Task UpdateCoverageAsync(Guid publicId, SaveWarrantyCoverageDto dto, long userId);

    Task DeleteCoverageAsync(Guid publicId, long userId);

    Task<bool> RestoreCoverageAsync(long userId);
}
