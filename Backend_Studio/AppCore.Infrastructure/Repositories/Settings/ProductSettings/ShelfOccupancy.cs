//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Shelf Occupancy
//
// A shelf (rack + shelf number) holds ONE item only : a spare
// part OR an accessory. Only items that are not deleted hold a
// shelf, so deleting an item frees its shelves.
//
// Used by the Spare Parts and Accessories repositories (refuse a
// taken shelf) and by Rack Management (items placed on a rack).
//===============================================================

public sealed class ShelfHolder
{
    public long RackManagementId { get; init; }

    public int ShelfNumber { get; init; }

    // "Spare Part" / "Accessory"
    public string ItemType { get; init; } = string.Empty;

    public long ItemId { get; init; }

    public string ProductCode { get; init; } = string.Empty;

    // Part name / accessory name
    public string ItemName { get; init; } = string.Empty;
}


public static class ShelfOccupancy
{
    public const string SparePartType =
        "Spare Part";

    public const string AccessoryType =
        "Accessory";


    //===========================================================
    // Holders of the shelves of these racks
    //
    // excludeSparePartId / excludeAccessoryId : the item being
    // saved (its own shelves don't block it); 0 = none.
    //===========================================================

    public static async Task<List<ShelfHolder>>
        GetHoldersAsync
        (
            AppDbContext context,
            long[] rackIds,
            long excludeSparePartId,
            long excludeAccessoryId
        )
    {
        if
        (
            rackIds.Length ==
            0
        )
        {
            return new List<ShelfHolder>();
        }

        List<ShelfHolder> spareParts =
            await
            (
                from l in context.Set<SparePartLocationsEntity>().AsNoTracking()

                join p in context.Set<SparePartsEntity>().AsNoTracking()
                    on l.SparePartId equals p.SparePartId

                where rackIds.Contains(l.RackManagementId)
                    && l.SparePartId != excludeSparePartId
                    && !p.IsDeleted

                select new ShelfHolder
                {
                    RackManagementId =
                        l.RackManagementId,

                    ShelfNumber =
                        l.ShelfNumber,

                    ItemType =
                        SparePartType,

                    ItemId =
                        p.SparePartId,

                    ProductCode =
                        p.ProductCode,

                    ItemName =
                        p.PartName
                }
            )
            .ToListAsync();

        List<ShelfHolder> accessories =
            await
            (
                from l in context.Set<AccessoryLocationsEntity>().AsNoTracking()

                join a in context.Set<AccessoriesEntity>().AsNoTracking()
                    on l.AccessoryId equals a.AccessoryId

                where rackIds.Contains(l.RackManagementId)
                    && l.AccessoryId != excludeAccessoryId
                    && !a.IsDeleted

                select new ShelfHolder
                {
                    RackManagementId =
                        l.RackManagementId,

                    ShelfNumber =
                        l.ShelfNumber,

                    ItemType =
                        AccessoryType,

                    ItemId =
                        a.AccessoryId,

                    ProductCode =
                        a.ProductCode,

                    ItemName =
                        a.AccessoryName
                }
            )
            .ToListAsync();

        return spareParts
            .Concat(
                accessories)
            .ToList();
    }
}