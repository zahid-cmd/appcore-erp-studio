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


    //===========================================================
    // One activity on one page (server-side permission check)
    //
    //   submenuRoutePattern : the page's route, '%' allowed
    //                         ("/procurement/%motor-bike%/purchase-orders")
    //   activityName        : Master Activity name ("Approve",
    //                         "Place Order", "Add" …)
    //
    // true when the user's roles or special assignment give the
    // activity on a matching page
    //===========================================================

    Task<bool>
        HasActivityAsync
        (
            long userProfileId,
            string submenuRoutePattern,
            string activityName
        );
}