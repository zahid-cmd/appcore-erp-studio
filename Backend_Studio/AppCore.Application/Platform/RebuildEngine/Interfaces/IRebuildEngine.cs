//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.Platform.RebuildEngine.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.RebuildEngine.Interfaces;


//===============================================================
// Rebuild Engine Interface
//===============================================================

public interface IRebuildEngine
{

    //===========================================================
    // Rebuild Application
    //===========================================================
    //
    // Supported rebuild types:
    //
    //     Frontend
    //     Backend
    //     All
    //
    //===========================================================

    Task<RebuildResultDto> RebuildAsync
    (
        string rebuildType
    );

}