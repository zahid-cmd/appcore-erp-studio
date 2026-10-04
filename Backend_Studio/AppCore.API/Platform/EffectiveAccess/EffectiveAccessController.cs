//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Platform.EffectiveAccess.DTOs;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Platform.EffectiveAccess;


//===============================================================
// Effective Access Controller
//===============================================================

[ApiController]
[Route("api/platform/effective-access")]
[Authorize]
public class EffectiveAccessController
    : ControllerBase
{

    //===========================================================
    // Effective Access Repository
    //===========================================================

    private readonly IEffectiveAccessRepository
        _effectiveAccessRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public EffectiveAccessController
    (
        IEffectiveAccessRepository effectiveAccessRepository
    )
    {
        _effectiveAccessRepository =
            effectiveAccessRepository;
    }


    //===========================================================
    // Get Effective Access
    //===========================================================

    [HttpGet("{userProfileId:long}")]
    public async Task<ActionResult<List<EffectiveAccessDto>>>
        GetEffectiveAccess
        (
            long userProfileId
        )
    {
        var
            effectiveAccess =
                await _effectiveAccessRepository
                    .GetEffectiveAccessAsync
                    (
                        userProfileId
                    );

        return
            Ok
            (
                effectiveAccess
            );
    }
}