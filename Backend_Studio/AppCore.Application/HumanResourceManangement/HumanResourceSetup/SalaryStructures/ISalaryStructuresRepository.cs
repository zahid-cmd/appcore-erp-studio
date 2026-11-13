//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Salary Structures repository (hand-written page)
//===============================================================

public interface ISalaryStructuresRepository
{
    // With the lines (the Employee Profile shows them read only)
    Task<List<SalaryStructureDto>> GetListAsync();

    Task<SalaryStructureDto> GetAsync(Guid publicId);

    Task<SalaryStructureDefaultsDto> GetDefaultsAsync();

    Task<SalaryStructureDto> CreateAsync(SalaryStructureDto dto, long userId);

    // The employees on the structure get the new lines too
    Task UpdateAsync(Guid publicId, SalaryStructureDto dto, long userId);

    // Not while employees are on it
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted structure back : its code; null = none
    Task<string?> RestoreAsync(long userId);
}
