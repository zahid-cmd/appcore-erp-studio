//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Common;


//===============================================================
// Activity History Repository
//===============================================================

public class ActivityHistoryRepository :
    IActivityHistoryRepository
{

    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;



    //===========================================================
    // Constructor
    //===========================================================

    public ActivityHistoryRepository(
        AppDbContext context)
    {
        _context = context;
    }



    //===========================================================
    // Get History By Entity
    //
    // Used for Form/View pages
    //===========================================================

    public async Task<List<ActivityHistoryDto>> GetHistoryAsync(
        string module,
        string entityName,
        long entityId)
    {

        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(x =>
                x.Module == module
                &&
                x.EntityName == entityName
                &&
                x.EntityId == entityId
            )

            .OrderByDescending(
                x => x.PerformedDate
            )

            .Select(x => new ActivityHistoryDto
            {
                Id = x.Id,

                Module = x.Module,

                EntityName = x.EntityName,

                EntityId = x.EntityId,

                ActivityType =
                    x.ActivityType,

                ActivityTitle =
                    x.ActivityTitle,

                ActivityDescription =
                    x.ActivityDescription,

                PerformedBy =
                    x.PerformedBy,

                PerformedByName =
                    x.PerformedByName,

                PerformedDate =
                    x.PerformedDate
            })

            .ToListAsync();
    }



    //===========================================================
    // Get List History
    //
    // Used for List Page History Drawer
    //
    // Example:
    // Navigation Module List
    // Shows all Create / Update / Delete activities
    //===========================================================

    public async Task<List<ActivityHistoryDto>> GetListHistoryAsync(
        string module,
        string entityName)
    {

        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(x =>
                x.Module == module
                &&
                x.EntityName == entityName
            )

            .OrderByDescending(
                x => x.PerformedDate
            )

            .Select(x => new ActivityHistoryDto
            {
                Id = x.Id,

                Module = x.Module,

                EntityName = x.EntityName,

                EntityId = x.EntityId,

                ActivityType =
                    x.ActivityType,

                ActivityTitle =
                    x.ActivityTitle,

                ActivityDescription =
                    x.ActivityDescription,

                PerformedBy =
                    x.PerformedBy,

                PerformedByName =
                    x.PerformedByName,

                PerformedDate =
                    x.PerformedDate
            })

            .ToListAsync();
    }

}