//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.InventoryManagement.CkdDocuments;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Procurement.MotorBikePurchase;
using AppCore.Domain.Entities.RegistrationManagement.CustomerFile;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Entities.InventoryManagement.StoreSetup;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InventoryManagement.CkdDocuments;


//===============================================================
// CKD Documents Status Repository (hand-written page)
//
// One row per chassis :
//   Unit : every bike on record (MotorBikeUnits) except those of
//          draft purchases (Status Pending) : purchases, receivings
//          and opening stock;
//   File : an opening customer file (CF-OPEN) whose chassis has no
//          bike record (sold before the system) : its own status.
// Yes = the documents are in hand or on the CKD portal; No (the
// default) = not yet. Changing Yes -> No needs a reason (e.g. lost
// by the customer after delivery : police GD no., application to
// the distributor). Every change goes to the history. No
// accounting.
//===============================================================

public class CkdDocumentsRepository
    : ICkdDocumentsRepository
{
    private const int RemarksMaxLength = 250;

    private const string UnitPending = "Pending";


    private readonly AppDbContext _context;


    public CkdDocumentsRepository(
        AppDbContext context)
    {
        _context = context;
    }


    // Business date : Bangladesh time, whatever the server clock
    private static DateOnly Today =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BusinessZone));

    private static readonly TimeZoneInfo BusinessZone =
        FindBusinessZone();

    private static TimeZoneInfo FindBusinessZone()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("BD", TimeSpan.FromHours(6), "Bangladesh", "Bangladesh");
    }


    private static string DateText(DateOnly? date) =>
        date.HasValue ? date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;


    private static string StockStatusLabel(string status) =>
        status switch
        {
            "InStock" => "In Stock",
            _ => status
        };


    private void AddHistory
    (
        string entity,
        long entityId,
        string title,
        string description,
        long userId,
        string userName
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = CkdHistory.Module,
                EntityName = entity,
                EntityId = entityId,
                ActivityType = "Update",
                ActivityTitle = title,
                ActivityDescription = description,
                PerformedBy = userId,
                PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                PerformedDate = DateTime.UtcNow
            });
    }


    // Status + remarks checked; returns the clean values
    private static (string Status, string Remarks) Normalize
    (
        SetCkdStatusDto dto,
        string current
    )
    {
        string status =
            string.Equals((dto.CkdStatus ?? string.Empty).Trim(), CkdStatuses.Yes, StringComparison.OrdinalIgnoreCase)
                ? CkdStatuses.Yes
                : string.Equals((dto.CkdStatus ?? string.Empty).Trim(), CkdStatuses.No, StringComparison.OrdinalIgnoreCase)
                    ? CkdStatuses.No
                    : throw new InvalidOperationException("Choose the CKD status : Yes or No.");

        string remarks = (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException($"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        if (current == CkdStatuses.Yes && status == CkdStatuses.No && remarks.Length == 0)
        {
            throw new InvalidOperationException(
                "Give the reason for changing Yes to No in Remarks (e.g. lost by the customer after delivery : GD no.).");
        }

        return (status, remarks);
    }



    // Year of manufacture : null = unchanged; 2000 .. next year
    private static int? NormalizeYear
    (
        int? year
    )
    {
        if (year == null || year == 0)
        {
            return null;
        }

        int max =
            DateTime.UtcNow.Year + 1;

        if (year < 2000 || year > max)
        {
            throw new InvalidOperationException(
                $"Year of Manufacture {year} is not valid (2000 - {max}).");
        }

        return year;
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<CkdDocumentsPageDto>
        GetAllAsync()
    {
        List<MotorBikeUnits> units =
            await _context.Set<MotorBikeUnits>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != UnitPending)
                .OrderByDescending(x => x.MotorBikeUnitId)
                .ToListAsync();

        List<CustomerFiles> files =
            await _context.Set<CustomerFiles>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != "Cancelled")
                .ToListAsync();

        Dictionary<string, CustomerFiles> fileByChassis =
            files.GroupBy(x => x.ChassisNo.ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CustomerFileId).First());

        HashSet<string> unitChassis =
            units.Select(x => x.ChassisNo.ToUpperInvariant()).ToHashSet();

        // Opening files whose chassis has no bike record
        List<CustomerFiles> openingFiles =
            files.Where(x => x.Source == "Opening" && !unitChassis.Contains(x.ChassisNo.ToUpperInvariant()))
                .OrderByDescending(x => x.CustomerFileId)
                .ToList();

        HashSet<long> branchIds =
            units.Select(x => x.BranchId).Concat(openingFiles.Select(x => x.BranchId)).ToHashSet();

        Dictionary<long, string> branches =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        HashSet<long> warehouseIds =
            units.Where(x => x.WarehouseId.HasValue).Select(x => x.WarehouseId!.Value).ToHashSet();

        Dictionary<long, string> warehouses =
            await _context.Set<Warehouses>().AsNoTracking()
                .Where(x => warehouseIds.Contains(x.WarehouseId))
                .ToDictionaryAsync(x => x.WarehouseId, x => x.WarehouseName);

        HashSet<long> openingIds =
            units.Where(x => x.OpeningStockId.HasValue).Select(x => x.OpeningStockId!.Value).ToHashSet();

        Dictionary<long, string> openingNos =
            await _context.Set<OpeningStock>().AsNoTracking()
                .Where(x => openingIds.Contains(x.OpeningStockId))
                .ToDictionaryAsync(x => x.OpeningStockId, x => x.OpeningNo);

        HashSet<long> customerIds =
            files.Select(x => x.CurrentCustomerId).ToHashSet();

        Dictionary<long, string> customers =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => customerIds.Contains(x.CustomerId))
                .ToDictionaryAsync(x => x.CustomerId, x => x.CustomerName + " (" + x.CustomerCode + ")");

        HashSet<long> bikeIds =
            openingFiles.Select(x => x.MotorBikeId).ToHashSet();

        Dictionary<long, string> bikes =
            await _context.Set<AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes>().AsNoTracking()
                .Where(x => bikeIds.Contains(x.MotorBikeId))
                .ToDictionaryAsync(x => x.MotorBikeId, x => x.ProductName);

        List<CkdDocumentRowDto> rows =
            units.Select(
                x =>
                {
                    fileByChassis.TryGetValue(x.ChassisNo.ToUpperInvariant(), out CustomerFiles? file);

                    bool opening = x.OpeningStockId.HasValue;

                    return new CkdDocumentRowDto
                    {
                        Kind = CkdRowKinds.Unit,
                        Id = x.MotorBikeUnitId,
                        PublicId = null,
                        ChassisNo = x.ChassisNo,
                        EngineNo = x.EngineNo,
                        ProductName = x.ProductName,
                        Source = opening ? "Opening Stock" : "Purchase",
                        SourceNo =
                            opening
                                ? openingNos.GetValueOrDefault(x.OpeningStockId!.Value, string.Empty)
                                : x.PurchaseNo,
                        BranchId = x.BranchId,
                        BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                        WarehouseName =
                            x.WarehouseId.HasValue
                                ? warehouses.GetValueOrDefault(x.WarehouseId.Value, string.Empty)
                                : string.Empty,
                        StockStatus = StockStatusLabel(x.Status),
                        StockInDate = DateText(x.StockInDate),
                        CustomerFileNo = file?.CustomerFileNo ?? string.Empty,
                        CustomerName = file != null ? customers.GetValueOrDefault(file.CurrentCustomerId, string.Empty) : string.Empty,
                        CkdStatus = x.CkdStatus == CkdStatuses.Yes ? CkdStatuses.Yes : CkdStatuses.No,
                        CkdCheckedDate = DateText(x.CkdCheckedDate),
                        CkdCheckedByName = x.CkdCheckedByName,
                        CkdRemarks = x.CkdRemarks,
                        ManufactureYear = x.ManufactureYear
                    };
                }).ToList();

        rows.AddRange(
            openingFiles.Select(
                x => new CkdDocumentRowDto
                {
                    Kind = CkdRowKinds.File,
                    Id = x.CustomerFileId,
                    PublicId = x.PublicId,
                    ChassisNo = x.ChassisNo,
                    EngineNo = x.EngineNo,
                    ProductName = bikes.GetValueOrDefault(x.MotorBikeId, string.Empty),
                    Source = "Opening File",
                    SourceNo = x.CustomerFileNo,
                    BranchId = x.BranchId,
                    BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                    WarehouseName = string.Empty,
                    StockStatus = "Sold before the system",
                    StockInDate = string.Empty,
                    CustomerFileNo = x.CustomerFileNo,
                    CustomerName = customers.GetValueOrDefault(x.CurrentCustomerId, string.Empty),
                    CkdStatus = x.CkdStatus == CkdStatuses.Yes ? CkdStatuses.Yes : CkdStatuses.No,
                    CkdCheckedDate = DateText(x.CkdCheckedDate),
                    CkdCheckedByName = x.CkdCheckedByName,
                    CkdRemarks = x.CkdRemarks,
                    ManufactureYear = x.ManufactureYear
                }));

        return new CkdDocumentsPageDto
        {
            Rows = rows,
            Today = DateText(Today)
        };
    }



    //===========================================================
    // Change
    //===========================================================

    public async Task
        SetUnitStatusAsync
        (
            long motorBikeUnitId,
            SetCkdStatusDto dto,
            long userId,
            string userName
        )
    {
        MotorBikeUnits unit =
            await _context.Set<MotorBikeUnits>()
                .FirstOrDefaultAsync(x => x.MotorBikeUnitId == motorBikeUnitId && !x.IsDeleted && x.Status != UnitPending)
            ?? throw new KeyNotFoundException("The bike was not found.");

        string before = unit.CkdStatus == CkdStatuses.Yes ? CkdStatuses.Yes : CkdStatuses.No;

        (string status, string remarks) = Normalize(dto, before);

        int? year = NormalizeYear(dto.ManufactureYear);

        bool ckdChanged = status != before || remarks != unit.CkdRemarks;

        bool yearChanged = year.HasValue && year != unit.ManufactureYear;

        if (!ckdChanged && !yearChanged)
        {
            throw new InvalidOperationException($"Chassis {unit.ChassisNo} : nothing changed (CKD {status}{(unit.ManufactureYear.HasValue ? $", year {unit.ManufactureYear}" : string.Empty)}).");
        }

        if (ckdChanged)
        {
            unit.CkdStatus = status;
            unit.CkdCheckedDate = Today;
            unit.CkdCheckedBy = userId;
            unit.CkdCheckedByName = (userName ?? string.Empty).Length > 150 ? userName![..150] : (userName ?? string.Empty);
            unit.CkdRemarks = remarks;

            AddHistory(CkdHistory.UnitEntity, unit.MotorBikeUnitId,
                status == before ? "CKD Remarks Changed" : $"CKD Documents : {status}",
                $"Chassis {unit.ChassisNo} ({unit.ProductName}) : CKD {before} -> {status}{(remarks.Length > 0 ? $", remarks : {remarks}" : string.Empty)}.",
                userId,
                userName ?? string.Empty);
        }

        if (yearChanged)
        {
            AddHistory(CkdHistory.UnitEntity, unit.MotorBikeUnitId,
                "Year of Manufacture Changed",
                $"Chassis {unit.ChassisNo} ({unit.ProductName}) : Year of Manufacture {(unit.ManufactureYear.HasValue ? unit.ManufactureYear.ToString() : "not set")} -> {year}.",
                userId,
                userName ?? string.Empty);

            unit.ManufactureYear = year;
        }

        unit.ModifiedBy = userId;
        unit.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }


    public async Task
        SetFileStatusAsync
        (
            Guid customerFilePublicId,
            SetCkdStatusDto dto,
            long userId,
            string userName
        )
    {
        CustomerFiles file =
            await _context.Set<CustomerFiles>()
                .FirstOrDefaultAsync(x => x.PublicId == customerFilePublicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The customer file was not found.");

        string chassis = file.ChassisNo.ToUpperInvariant();

        if (await _context.Set<MotorBikeUnits>().AnyAsync(x => !x.IsDeleted && x.Status != UnitPending && x.ChassisNo.ToUpper() == chassis))
        {
            throw new InvalidOperationException(
                $"Chassis {file.ChassisNo} has a bike record : change its CKD status on the bike's row.");
        }

        string before = file.CkdStatus == CkdStatuses.Yes ? CkdStatuses.Yes : CkdStatuses.No;

        (string status, string remarks) = Normalize(dto, before);

        int? year = NormalizeYear(dto.ManufactureYear);

        bool ckdChanged = status != before || remarks != file.CkdRemarks;

        bool yearChanged = year.HasValue && year != file.ManufactureYear;

        if (!ckdChanged && !yearChanged)
        {
            throw new InvalidOperationException($"Chassis {file.ChassisNo} : nothing changed (CKD {status}{(file.ManufactureYear.HasValue ? $", year {file.ManufactureYear}" : string.Empty)}).");
        }

        if (ckdChanged)
        {
            file.CkdStatus = status;
            file.CkdCheckedDate = Today;
            file.CkdCheckedBy = userId;
            file.CkdCheckedByName = (userName ?? string.Empty).Length > 150 ? userName![..150] : (userName ?? string.Empty);
            file.CkdRemarks = remarks;

            AddHistory(CkdHistory.FileEntity, file.CustomerFileId,
                status == before ? "CKD Remarks Changed" : $"CKD Documents : {status}",
                $"Chassis {file.ChassisNo} (opening file {file.CustomerFileNo}) : CKD {before} -> {status}{(remarks.Length > 0 ? $", remarks : {remarks}" : string.Empty)}.",
                userId,
                userName ?? string.Empty);

            // The file's own history too
            _context.ActivityHistories.Add(
                new ActivityHistory
                {
                    Module = "Registration Management",
                    EntityName = "CustomerFile",
                    EntityId = file.CustomerFileId,
                    ActivityType = "Update",
                    ActivityTitle = $"CKD Documents : {status}",
                    ActivityDescription = $"{file.CustomerFileNo} : CKD {before} -> {status}{(remarks.Length > 0 ? $", remarks : {remarks}" : string.Empty)}.",
                    PerformedBy = userId,
                    PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                    PerformedDate = DateTime.UtcNow
                });
        }

        if (yearChanged)
        {
            string text =
                $"Chassis {file.ChassisNo} (opening file {file.CustomerFileNo}) : Year of Manufacture {(file.ManufactureYear.HasValue ? file.ManufactureYear.ToString() : "not set")} -> {year}.";

            AddHistory(CkdHistory.FileEntity, file.CustomerFileId, "Year of Manufacture Changed", text, userId, userName ?? string.Empty);

            _context.ActivityHistories.Add(
                new ActivityHistory
                {
                    Module = "Registration Management",
                    EntityName = "CustomerFile",
                    EntityId = file.CustomerFileId,
                    ActivityType = "Update",
                    ActivityTitle = "Year of Manufacture Changed",
                    ActivityDescription = text,
                    PerformedBy = userId,
                    PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                    PerformedDate = DateTime.UtcNow
                });

            file.ManufactureYear = year;
        }

        file.ModifiedBy = userId;
        file.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
}
