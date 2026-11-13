//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Overtime Structures repository (hand-written page)
//===============================================================

public interface IOvertimeStructuresRepository
{
    Task<List<OvertimeStructureDto>> GetListAsync();

    Task<OvertimeStructureDto> GetAsync(Guid publicId);

    Task<OvertimeStructureDefaultsDto> GetDefaultsAsync();

    Task<OvertimeStructureDto> CreateAsync(OvertimeStructureDto dto, long userId);

    Task UpdateAsync(Guid publicId, OvertimeStructureDto dto, long userId);

    // Not while employees are on it
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted structure back : its code; null = none
    Task<string?> RestoreAsync(long userId);
}
