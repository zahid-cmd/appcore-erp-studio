//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Bonus Structures Repository
//===============================================================

public interface IBonusStructuresRepository
{
    Task<List<BonusStructureDto>> GetListAsync();

    Task<BonusStructureDto> GetAsync(Guid publicId);

    Task<BonusStructureDefaultsDto> GetDefaultsAsync();

    Task<BonusStructureDto> CreateAsync(BonusStructureDto dto, long userId);

    Task UpdateAsync(Guid publicId, BonusStructureDto dto, long userId);

    // Refused when a bonus sheet uses it
    Task DeleteAsync(Guid publicId, long userId);

    // The code of the structure brought back (null : none)
    Task<string?> RestoreAsync(long userId);
}
