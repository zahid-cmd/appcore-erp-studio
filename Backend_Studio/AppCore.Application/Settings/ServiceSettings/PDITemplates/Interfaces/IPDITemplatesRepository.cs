//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// PDI Templates repository (hand-written page)
//===============================================================

public interface IPdiTemplatesRepository
{
    Task<List<PdiTemplateListItemDto>> GetListAsync();

    Task<PdiTemplateDto> GetAsync(Guid publicId);

    Task<PdiTemplateDefaultsDto> GetDefaultsAsync();

    Task<PdiTemplateDto> CreateAsync(SavePdiTemplateDto dto, long userId);

    Task UpdateAsync(Guid publicId, SavePdiTemplateDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted template back; false = none
    Task<bool> RestoreAsync(long userId);
}
