//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Common.ActivityHistory.Interfaces;


//===============================================================
// Activity History Repository Interface
//===============================================================

public interface IActivityHistoryRepository
{

    //===========================================================
    // Get History By Entity
    //===========================================================

    Task<List<ActivityHistoryDto>> GetHistoryAsync(
        string module,
        string entityName,
        long entityId
    );



    //===========================================================
    // Get List History
    //
    // Used by List Pages
    // Example:
    // Module Management History Drawer
    //===========================================================

    Task<List<ActivityHistoryDto>> GetListHistoryAsync(
        string module,
        string entityName
    );

}