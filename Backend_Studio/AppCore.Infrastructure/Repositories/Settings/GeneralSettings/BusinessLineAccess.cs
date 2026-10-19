//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using BusinessConfigurationEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.BusinessConfiguration;

using WingBusinessLinesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.WingBusinessLines;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Business Line Access
//
// Which business lines a branch runs on a given day :
//   core lines of its wing (WingBusinessLines, always on)
//   + extra grants (BusinessConfigurations) in force that day.
// A warehouse (and every rack under it) may hold product type T
// only while its branch has line T.
//
// Shared by Business Configuration, Spare Parts, Accessories,
// Rack Management and, later, the stock transactions.
//===============================================================

public static class BusinessLineAccess
{
    //===========================================================
    // Business lines (fixed list, in display order)
    //===========================================================

    public const string MotorBikes = "Motor Bikes";

    public const string SpareParts = "Spare Parts";

    public const string Accessories = "Accessories";

    public const string Services = "Services";

    public static readonly string[] Lines =
        new[]
        {
            MotorBikes,
            SpareParts,
            Accessories,
            Services
        };


    // Access types of an extra grant
    public const string Fixed = "Fixed";

    public const string Temporary = "Temporary";


    // "spare parts" → "Spare Parts", unknown → null
    public static string? Canonical
    (
        string? businessLine
    )
    {
        return Lines.FirstOrDefault
        (
            x =>
                string.Equals(
                    x,
                    businessLine?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    // Business day (server local date)
    public static DateOnly Today()
    {
        return DateOnly.FromDateTime(
            DateTime.Now);
    }


    //===========================================================
    // A grant in force on a day
    //===========================================================

    public static bool IsGrantActive
    (
        BusinessConfigurationEntity grant,
        DateOnly day
    )
    {
        return !grant.IsDeleted
            &&
            grant.IsActive
            &&
            (grant.ValidFrom == null || grant.ValidFrom <= day)
            &&
            (grant.ValidUntil == null || grant.ValidUntil >= day);
    }


    // Active / Scheduled / Expired / Inactive
    public static string GrantState
    (
        BusinessConfigurationEntity grant,
        DateOnly day
    )
    {
        if (!grant.IsActive)
        {
            return "Inactive";
        }

        if (grant.ValidFrom != null && grant.ValidFrom > day)
        {
            return "Scheduled";
        }

        if (grant.ValidUntil != null && grant.ValidUntil < day)
        {
            return "Expired";
        }

        return "Active";
    }


    //===========================================================
    // Core lines per wing
    //===========================================================

    public static async Task<Dictionary<long, List<string>>>
        CoreLinesByWingAsync
        (
            AppDbContext context
        )
    {
        List<WingBusinessLinesEntity> rows =
            await context
                .Set<WingBusinessLinesEntity>()
                .AsNoTracking()
                .ToListAsync();

        return rows
            .GroupBy(x => x.WingId)
            .ToDictionary
            (
                g => g.Key,
                g => Lines
                    .Where(line => g.Any(x => x.BusinessLine == line))
                    .ToList()
            );
    }


    //===========================================================
    // Lines in force per branch on a day (core + grants)
    //===========================================================

    public static async Task<Dictionary<long, HashSet<string>>>
        ActiveLinesByBranchAsync
        (
            AppDbContext context,
            DateOnly day
        )
    {
        Dictionary<long, List<string>> core =
            await CoreLinesByWingAsync(
                context);

        var branches =
            await context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new
                        {
                            x.BranchId,
                            x.WingId
                        }
                )
                .ToListAsync();

        List<BusinessConfigurationEntity> grants =
            await context
                .Set<BusinessConfigurationEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .ToListAsync();

        Dictionary<long, HashSet<string>> result =
            new();

        foreach (var branch in branches)
        {
            HashSet<string> lines =
                new(
                    core.TryGetValue(branch.WingId, out List<string>? wingLines)
                        ? wingLines
                        : new List<string>());

            foreach
            (
                BusinessConfigurationEntity grant
                in grants.Where(g => g.BranchId == branch.BranchId)
            )
            {
                if (IsGrantActive(grant, day))
                {
                    lines.Add(grant.BusinessLine);
                }
            }

            result[branch.BranchId] =
                lines;
        }

        return result;
    }


    //===========================================================
    // Active warehouses whose branch runs the line today
    // (businessLine null / '' → every active warehouse)
    //===========================================================

    public static async Task<List<(long WarehouseId, long BranchId, long WingId, HashSet<string> Lines)>>
        WarehousesAsync
        (
            AppDbContext context,
            string? businessLine
        )
    {
        string? line =
            Canonical(
                businessLine);

        Dictionary<long, HashSet<string>> byBranch =
            await ActiveLinesByBranchAsync(
                context,
                Today());

        var warehouses =
            await context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new
                        {
                            x.WarehouseId,
                            x.BranchId,
                            x.WingId
                        }
                )
                .ToListAsync();

        return warehouses
            .Select
            (
                w =>
                (
                    w.WarehouseId,
                    w.BranchId,
                    w.WingId,
                    byBranch.TryGetValue(w.BranchId, out HashSet<string>? lines)
                        ? lines
                        : new HashSet<string>()
                )
            )
            .Where
            (
                w =>
                    line == null
                    ||
                    w.Item4.Contains(line)
            )
            .ToList();
    }


    //===========================================================
    // Warehouse ids allowed for a line today (server checks)
    //===========================================================

    public static async Task<HashSet<long>>
        AllowedWarehouseIdsAsync
        (
            AppDbContext context,
            string businessLine
        )
    {
        return
        (
            await WarehousesAsync(
                context,
                businessLine)
        )
        .Select(x => x.WarehouseId)
        .ToHashSet();
    }
}