//===============================================================
// Effective Access DTO
//===============================================================

namespace AppCore.Application.Platform.EffectiveAccess.DTOs;


//===============================================================
// Effective Access
//===============================================================

public class EffectiveAccessDto
{
    public long UserProfileId { get; set; }

    public long ModuleId { get; set; }

    public long MenuId { get; set; }

    public long SubMenuId { get; set; }

    public long? MasterActivityId { get; set; }

    public long? NavigationActivityId { get; set; }
}