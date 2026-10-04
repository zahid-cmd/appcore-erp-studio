//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.EffectiveAccess.DTOs;


//===============================================================
// Interface
//===============================================================

namespace AppCore.Application.Platform.EffectiveAccess.Interfaces;


//===============================================================
// Effective Access Repository
//===============================================================

public interface IEffectiveAccessRepository
{
    Task<List<EffectiveAccessDto>>
        GetEffectiveAccessAsync
        (
            long userProfileId
        );
}