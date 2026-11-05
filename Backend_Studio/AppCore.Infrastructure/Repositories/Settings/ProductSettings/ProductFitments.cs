//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;

using SparePartFitmentsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartFitments;
using AccessoryFitmentsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryFitments;
using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;
using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Product Fitments ("Fits models")
//
// A spare part / accessory lives in ONE sub category (its home :
// stock, price, ledgers) and may also fit other sub categories
// (models) of the same Product Category. Links are information
// only : selling a part for any model moves the home item.
//
//   Attach   fills Fits + FitsText ("A04 · Y06") for read DTOs
//   Replace  saves the links of one item (validated)
//   Fitting  item ids linked to a sub category (list filter)
//===============================================================

public static class ProductFitments
{
    private sealed class FitRow
    {
        public long ItemId { get; init; }

        public ProductFitDto Fit { get; init; } = null!;
    }


    //===========================================================
    // Read
    //===========================================================

    private static async Task<List<FitRow>> LoadAsync(
        AppDbContext context,
        List<(long ItemId, long SubCategoryId)> pairs)
    {
        if (pairs.Count == 0)
        {
            return new List<FitRow>();
        }

        List<long> subIds =
            pairs.Select(x => x.SubCategoryId).Distinct().ToList();

        var subs =
            await (
                from s in context.Set<ProductSubCategoryEntity>().AsNoTracking()
                where subIds.Contains(s.ProductSubCategoryId) && !s.IsDeleted
                join m in context.Set<BikeModelsEntity>().AsNoTracking()
                    on s.BikeModelId equals (long?)m.BikeModelId into mj
                from m in mj.DefaultIfEmpty()
                select new
                {
                    s.ProductSubCategoryId,
                    s.SubCategoryCode,
                    s.SubCategoryName,
                    ModelName = m != null ? m.ModelName : string.Empty
                })
            .ToListAsync();

        return pairs
            .Select(
                p =>
                {
                    var s = subs.FirstOrDefault(x => x.ProductSubCategoryId == p.SubCategoryId);

                    return s == null
                        ? null
                        : new FitRow
                        {
                            ItemId = p.ItemId,
                            Fit =
                                new ProductFitDto
                                {
                                    ProductSubCategoryId = s.ProductSubCategoryId,
                                    SubCategoryCode = s.SubCategoryCode,
                                    SubCategoryName = s.SubCategoryName,
                                    ModelName = s.ModelName
                                }
                        };
                })
            .Where(x => x != null)
            .Select(x => x!)
            .ToList();
    }

    // "Y06" (the model) or the sub category name when it has none
    public static string ShortName(
        ProductFitDto fit) =>
        string.IsNullOrWhiteSpace(fit.ModelName) ? fit.SubCategoryName : fit.ModelName;


    public static async Task AttachSparePartsAsync(
        AppDbContext context,
        List<SparePartsDto> items)
    {
        if (items.Count == 0)
        {
            return;
        }

        long[] ids =
            items.Select(x => x.SparePartId).ToArray();

        var raw =
            await context.Set<SparePartFitmentsEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SparePartId))
                .Select(x => new { x.SparePartId, x.ProductSubCategoryId })
                .ToListAsync();

        List<FitRow> rows =
            await LoadAsync(
                context,
                raw.Select(x => (x.SparePartId, x.ProductSubCategoryId)).ToList());

        foreach (SparePartsDto item in items)
        {
            item.Fits =
                rows
                    .Where(x => x.ItemId == item.SparePartId)
                    .Select(x => x.Fit)
                    .OrderBy(x => x.SubCategoryCode)
                    .ToList();

            item.FitsText =
                string.Join(", ", item.Fits.Select(ShortName));
        }
    }


    public static async Task AttachAccessoriesAsync(
        AppDbContext context,
        List<AccessoriesDto> items)
    {
        if (items.Count == 0)
        {
            return;
        }

        long[] ids =
            items.Select(x => x.AccessoryId).ToArray();

        var raw =
            await context.Set<AccessoryFitmentsEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.AccessoryId))
                .Select(x => new { x.AccessoryId, x.ProductSubCategoryId })
                .ToListAsync();

        List<FitRow> rows =
            await LoadAsync(
                context,
                raw.Select(x => (x.AccessoryId, x.ProductSubCategoryId)).ToList());

        foreach (AccessoriesDto item in items)
        {
            item.Fits =
                rows
                    .Where(x => x.ItemId == item.AccessoryId)
                    .Select(x => x.Fit)
                    .OrderBy(x => x.SubCategoryCode)
                    .ToList();

            item.FitsText =
                string.Join(", ", item.Fits.Select(ShortName));
        }
    }


    //===========================================================
    // Validate : sub categories of the same Product Category,
    // not deleted, not the home one. Returns the clean id list.
    //===========================================================

    private static async Task<List<long>> ValidateAsync(
        AppDbContext context,
        long productCategoryId,
        long homeSubCategoryId,
        IEnumerable<long> ids)
    {
        List<long> wanted =
            (ids ?? Enumerable.Empty<long>())
                .Where(x => x > 0 && x != homeSubCategoryId)
                .Distinct()
                .ToList();

        if (wanted.Count == 0)
        {
            return wanted;
        }

        var found =
            await context.Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => wanted.Contains(x.ProductSubCategoryId) && !x.IsDeleted)
                .Select(x => new { x.ProductSubCategoryId, x.ProductCategoryId, x.SubCategoryName })
                .ToListAsync();

        if (found.Count != wanted.Count)
        {
            throw new InvalidOperationException(
                "A model in Fits Models was not found. It may have been deleted. Refresh the page.");
        }

        var other =
            found.FirstOrDefault(x => x.ProductCategoryId != productCategoryId);

        if (other != null)
        {
            throw new InvalidOperationException(
                $"'{other.SubCategoryName}' belongs to another Product Category. Fits Models must be of the same category.");
        }

        return wanted;
    }


    //===========================================================
    // Save (replace) the links of one item
    //===========================================================

    public static async Task ReplaceSparePartAsync(
        AppDbContext context,
        long sparePartId,
        long productCategoryId,
        long homeSubCategoryId,
        IEnumerable<long> subCategoryIds,
        long userId)
    {
        List<long> wanted =
            await ValidateAsync(context, productCategoryId, homeSubCategoryId, subCategoryIds);

        List<SparePartFitmentsEntity> current =
            await context.Set<SparePartFitmentsEntity>()
                .Where(x => x.SparePartId == sparePartId)
                .ToListAsync();

        context.Set<SparePartFitmentsEntity>()
            .RemoveRange(current.Where(x => !wanted.Contains(x.ProductSubCategoryId)));

        foreach (long subId in wanted.Where(id => current.All(x => x.ProductSubCategoryId != id)))
        {
            context.Set<SparePartFitmentsEntity>()
                .Add(
                    new SparePartFitmentsEntity
                    {
                        SparePartId = sparePartId,
                        ProductSubCategoryId = subId,
                        CreatedBy = userId,
                        CreatedDate = DateTime.UtcNow
                    });
        }

        await context.SaveChangesAsync();
    }


    public static async Task ReplaceAccessoryAsync(
        AppDbContext context,
        long accessoryId,
        long productCategoryId,
        long homeSubCategoryId,
        IEnumerable<long> subCategoryIds,
        long userId)
    {
        List<long> wanted =
            await ValidateAsync(context, productCategoryId, homeSubCategoryId, subCategoryIds);

        List<AccessoryFitmentsEntity> current =
            await context.Set<AccessoryFitmentsEntity>()
                .Where(x => x.AccessoryId == accessoryId)
                .ToListAsync();

        context.Set<AccessoryFitmentsEntity>()
            .RemoveRange(current.Where(x => !wanted.Contains(x.ProductSubCategoryId)));

        foreach (long subId in wanted.Where(id => current.All(x => x.ProductSubCategoryId != id)))
        {
            context.Set<AccessoryFitmentsEntity>()
                .Add(
                    new AccessoryFitmentsEntity
                    {
                        AccessoryId = accessoryId,
                        ProductSubCategoryId = subId,
                        CreatedBy = userId,
                        CreatedDate = DateTime.UtcNow
                    });
        }

        await context.SaveChangesAsync();
    }


    //===========================================================
    // Add ONE link (onboarding); nothing when it already exists
    //===========================================================

    public static async Task<bool> AddSparePartLinkAsync(
        AppDbContext context,
        long sparePartId,
        long subCategoryId,
        long userId)
    {
        bool exists =
            await context.Set<SparePartFitmentsEntity>()
                .AnyAsync(x => x.SparePartId == sparePartId && x.ProductSubCategoryId == subCategoryId);

        if (exists)
        {
            return false;
        }

        context.Set<SparePartFitmentsEntity>()
            .Add(
                new SparePartFitmentsEntity
                {
                    SparePartId = sparePartId,
                    ProductSubCategoryId = subCategoryId,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });

        return true;
    }


    public static async Task<bool> AddAccessoryLinkAsync(
        AppDbContext context,
        long accessoryId,
        long subCategoryId,
        long userId)
    {
        bool exists =
            await context.Set<AccessoryFitmentsEntity>()
                .AnyAsync(x => x.AccessoryId == accessoryId && x.ProductSubCategoryId == subCategoryId);

        if (exists)
        {
            return false;
        }

        context.Set<AccessoryFitmentsEntity>()
            .Add(
                new AccessoryFitmentsEntity
                {
                    AccessoryId = accessoryId,
                    ProductSubCategoryId = subCategoryId,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });

        return true;
    }


    //===========================================================
    // Item ids linked to a sub category (list filter : a sub
    // category shows its own items AND the ones that fit it)
    //===========================================================

    public static IQueryable<long> SparePartsFitting(
        AppDbContext context,
        long subCategoryId) =>
        context.Set<SparePartFitmentsEntity>()
            .Where(x => x.ProductSubCategoryId == subCategoryId)
            .Select(x => x.SparePartId);

    public static IQueryable<long> AccessoriesFitting(
        AppDbContext context,
        long subCategoryId) =>
        context.Set<AccessoryFitmentsEntity>()
            .Where(x => x.ProductSubCategoryId == subCategoryId)
            .Select(x => x.AccessoryId);
}
