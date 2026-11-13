//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Human Resource Setup repository (hand-written pages) : the same
// calls for Shifts, Holidays, Leave Types and Salary Heads.
//===============================================================

public interface IHrSetupRepository<TDto>
    where TDto : HrSetupDto
{
    // The history entity name of the page (ActivityHistories)
    string HistoryEntity { get; }

    Task<List<TDto>> GetListAsync();

    Task<TDto> GetAsync(Guid publicId);

    Task<HrSetupDefaultsDto> GetDefaultsAsync();

    Task<TDto> CreateAsync(TDto dto, long userId);

    Task UpdateAsync(Guid publicId, TDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted row back : its code; null = none
    Task<string?> RestoreAsync(long userId);
}
