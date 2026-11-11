//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.RegistrationManagement.RegistrationControl;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.RegistrationManagement.CustomerFile;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationControl;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationProcessing;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Sales;


//===============================================================
// Registration on the Sales Invoice - MB (2026-11-11)
//
//   The invoice takes one registration : a Registration Type
//   (Registration Configuration : an active type with a current
//   fee and cost row on the invoice date, of the bikes' power)
//   and an amount per chassis between the type's Minimum and
//   Maximum Collection. Regular sale : its one chassis; Corporate
//   sale : the chassis ticked in the modal.
//
//   Invoice total += amount x chassis. Posting credits :
//     Registration Commission Account (commission of the cost row
//     x chassis) and Registration Fees Collection Account (the
//     rest); no VAT, no discount.
//   Posting also makes one Registration Profile per chassis
//   (Processing when the invoice is fully paid, else Pending) and
//   marks its Customer File : Registration By Dealer.
//   Cancel (invoice cancelled or registration reversed) : the
//   profiles are Cancelled (refused once one was submitted to
//   BRTA) and the files go back to Registration By Customer.
//===============================================================

public static class RegistrationOnInvoice
{
    // Ledgers read by code (owner, 2026-11-08)
    public const string LedgerCollection = "GLR-003-003-001-00001";

    public const string LedgerCommission = "GLR-003-003-001-00004";

    // Invoice registration status
    public const string StatusActive = "Active";

    public const string StatusReversed = "Reversed";

    private const string HistoryModule = "Registration Management";

    private const string HistoryEntity = "RegistrationProfile";

    private const string FileHistoryEntity = "CustomerFile";

    private const string ByDealer = "Dealer";

    private const string ByCustomer = "Customer";


    //===========================================================
    // A usable registration type on a date
    //===========================================================

    public sealed class Option
    {
        public long RegistrationTypeId { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Plan { get; set; } = string.Empty;

        public string Mode { get; set; } = string.Empty;

        public int ValidityYears { get; set; }

        // Fuel / Electric ('' = any)
        public string VehiclePower { get; set; } = string.Empty;

        public bool IsDefault { get; set; }

        // A current fee and cost row on the date (false : listed
        // only, cannot be taken)
        public bool HasRates { get; set; } = true;

        public decimal Minimum { get; set; }

        public decimal Maximum { get; set; }

        public decimal BrtaFees { get; set; }

        public decimal SubmissionCharges { get; set; }

        public decimal BrtaTips { get; set; }

        public decimal Commission { get; set; }

        public decimal TotalCost =>
            BrtaFees + SubmissionCharges + BrtaTips + Commission;
    }


    //===========================================================
    // The registration chosen on an invoice
    //===========================================================

    public sealed class Chosen
    {
        public Option Type { get; set; } = new();

        // Per chassis
        public decimal Amount { get; set; }

        // The chassis registered (MotorBikeUnitId)
        public List<long> UnitIds { get; set; } = new();

        public int Count =>
            UnitIds.Count;

        public decimal Total =>
            Money(Amount * Count);

        public decimal Commission =>
            Money(Type.Commission * Count);

        // To the Registration Fees Collection Account
        public decimal Collection =>
            Total - Commission;
    }


    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);


    //===========================================================
    // Usable types on a date : active type, current active fee
    // and cost rows (latest Effective From on or before the date).
    // withoutRates : also the active types with no rates yet
    // (HasRates false; the invoice lists them, cannot take them)
    //===========================================================

    public static async Task<List<Option>>
        OptionsAsync
        (
            AppDbContext context,
            DateOnly date,
            bool withoutRates = false
        )
    {
        List<RegistrationTypes> types =
            await context.Set<RegistrationTypes>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Name)
                .ToListAsync();

        if (types.Count == 0)
        {
            return new List<Option>();
        }

        List<long> ids =
            types.Select(x => x.RegistrationTypeId).ToList();

        List<RegistrationFees> fees =
            await context.Set<RegistrationFees>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.RegistrationTypeId) && !x.IsDeleted && x.IsActive && x.EffectiveFrom <= date)
                .ToListAsync();

        List<RegistrationCosts> costs =
            await context.Set<RegistrationCosts>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.RegistrationTypeId) && !x.IsDeleted && x.IsActive && x.EffectiveFrom <= date)
                .ToListAsync();

        List<Option> result =
            new();

        foreach (RegistrationTypes type in types)
        {
            RegistrationFees? fee =
                fees
                    .Where(x => x.RegistrationTypeId == type.RegistrationTypeId)
                    .OrderByDescending(x => x.EffectiveFrom)
                    .ThenByDescending(x => x.RegistrationFeeId)
                    .FirstOrDefault();

            RegistrationCosts? cost =
                costs
                    .Where(x => x.RegistrationTypeId == type.RegistrationTypeId)
                    .OrderByDescending(x => x.EffectiveFrom)
                    .ThenByDescending(x => x.RegistrationCostId)
                    .FirstOrDefault();

            if (fee == null || cost == null)
            {
                if (withoutRates)
                {
                    result.Add(
                        new Option
                        {
                            RegistrationTypeId = type.RegistrationTypeId,
                            Code = type.Code,
                            Name = type.Name,
                            Plan = type.RegistrationPlan,
                            Mode = type.RegistrationMode,
                            ValidityYears = type.ValidityYears,
                            VehiclePower = type.VehiclePower ?? string.Empty,
                            IsDefault = type.IsDefault,
                            HasRates = false
                        });
                }

                continue;
            }

            result.Add(
                new Option
                {
                    RegistrationTypeId = type.RegistrationTypeId,
                    Code = type.Code,
                    Name = type.Name,
                    Plan = type.RegistrationPlan,
                    Mode = type.RegistrationMode,
                    ValidityYears = type.ValidityYears,
                    VehiclePower = type.VehiclePower ?? string.Empty,
                    IsDefault = type.IsDefault,
                    Minimum = fee.MinimumCollection,
                    Maximum = fee.MaximumCollection,
                    BrtaFees = cost.BrtaFees,
                    SubmissionCharges = cost.SubmissionCharges,
                    BrtaTips = cost.BrtaTips,
                    Commission = cost.RegistrationCommission
                });
        }

        return result;
    }


    //===========================================================
    // Fuel / Electric of bike products (their model's
    // specification; same rule as the Customer Files)
    //===========================================================

    public static async Task<Dictionary<long, string>>
        PowersAsync
        (
            AppDbContext context,
            IEnumerable<long> productIds
        )
    {
        List<long> ids =
            productIds.Distinct().ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        var specs =
            await
            (
                from b in context.Set<MotorBikes>().AsNoTracking()
                where ids.Contains(b.MotorBikeId)
                join s in context.Set<ProductSubCategory>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId
                join p in context.Set<MotorBikeSpecifications>().AsNoTracking()
                    on s.BikeModelId equals (long?)p.BikeModelId
                where !p.IsDeleted
                select new { b.MotorBikeId, p.FuelType }
            )
            .ToListAsync();

        return ids.ToDictionary(
            id => id,
            id => RegistrationVehiclePowers.OfFuelType(
                specs.FirstOrDefault(x => x.MotorBikeId == id)?.FuelType));
    }


    //===========================================================
    // Price : the registration typed on the invoice (null = none;
    // problems go to errors)
    //   bikes : (MotorBikeUnitId, ProductId) of the bike lines
    //===========================================================

    public static async Task<Chosen?>
        ChooseAsync
        (
            AppDbContext context,
            long? typeId,
            decimal amount,
            IReadOnlyCollection<long>? requestedUnits,
            IReadOnlyList<(long UnitId, long ProductId)> bikes,
            bool corporate,
            bool allowed,
            DateOnly date,
            List<string> errors
        )
    {
        if (!typeId.HasValue || typeId.Value <= 0)
        {
            return null;
        }

        if (!allowed)
        {
            errors.Add("Registration cannot be taken on the invoice (System Configuration › Registration Fees on Invoice is OFF).");

            return null;
        }

        if (bikes.Count == 0)
        {
            errors.Add("Registration : add the bike (chassis) first.");

            return null;
        }

        List<long> onInvoice =
            bikes.Select(x => x.UnitId).Distinct().ToList();

        List<long> units;

        if (!corporate)
        {
            units = onInvoice;
        }
        else
        {
            units =
                (requestedUnits ?? Array.Empty<long>())
                    .Where(x => x > 0)
                    .Distinct()
                    .ToList();

            if (units.Count == 0)
            {
                errors.Add("Registration : tick at least one chassis.");

                return null;
            }

            if (units.Any(x => !onInvoice.Contains(x)))
            {
                errors.Add("Registration : a ticked chassis is not on this invoice. Open the Registration again.");

                return null;
            }
        }

        Option? option =
            (await OptionsAsync(context, date))
                .FirstOrDefault(x => x.RegistrationTypeId == typeId.Value);

        if (option == null)
        {
            errors.Add("Registration : the type is not usable on the invoice date (inactive, or no current fee / cost in Registration Configuration).");

            return null;
        }

        if (!(amount > 0m) || decimal.Round(amount, 2) != amount)
        {
            errors.Add("Registration : the amount must be more than 0 with at most 2 decimals.");

            return null;
        }

        if (amount < option.Minimum || amount > option.Maximum)
        {
            errors.Add($"Registration : {option.Name} is collected between {option.Minimum:N2} and {option.Maximum:N2} per chassis ({amount:N2} typed).");

            return null;
        }

        if (option.VehiclePower.Length > 0)
        {
            Dictionary<long, string> powers =
                await PowersAsync(
                    context,
                    bikes.Where(x => units.Contains(x.UnitId)).Select(x => x.ProductId));

            string? other =
                powers.Values.FirstOrDefault(
                    x => !string.Equals(x, option.VehiclePower, StringComparison.OrdinalIgnoreCase));

            if (other != null)
            {
                errors.Add($"Registration : {option.Name} is for {option.VehiclePower} bikes; a chosen bike is {other}.");

                return null;
            }
        }

        return new Chosen
        {
            Type = option,
            Amount = amount,
            UnitIds = units
        };
    }


    //===========================================================
    // Post : one Registration Profile per registered chassis; its
    // Customer File : Registration By Dealer
    //===========================================================

    public static async Task
        CreateProfilesAsync
        (
            AppDbContext context,
            SalesInvoiceHeader header,
            IEnumerable<SalesInvoiceLine> lines,
            long userId,
            DateTime now
        )
    {
        if (header is not IMotorBikeSaleHeader bikeHeader
            || bikeHeader.RegistrationStatus != StatusActive
            || !bikeHeader.RegistrationTypeId.HasValue
            || bikeHeader.RegistrationCount <= 0)
        {
            return;
        }

        // Same order as the Customer Files (suffix /n)
        List<(SalesInvoiceLine Line, IMotorBikeSaleLine Bike)> bikes =
            lines
                .Where(x => x is IMotorBikeSaleLine b && (b.MotorBikeUnitId ?? 0) > 0)
                .OrderBy(x => x.LineNo)
                .ThenBy(x => x.SalesInvoiceLineId)
                .Select(x => (x, (IMotorBikeSaleLine)x))
                .ToList();

        Option? option =
            (await OptionsAsync(context, header.InvoiceDate))
                .FirstOrDefault(x => x.RegistrationTypeId == bikeHeader.RegistrationTypeId.Value);

        if (option == null)
        {
            throw new InvalidOperationException(
                $"Registration : {bikeHeader.RegistrationTypeName} has no current fee / cost on {header.InvoiceDate:dd-MMM-yyyy} (Registration Configuration).");
        }

        Dictionary<long, string> powers =
            await PowersAsync(context, bikes.Select(x => x.Line.ProductId));

        bool paid =
            header.DueAmount <= 0m;

        DateOnly today =
            DateOnly.FromDateTime(now.AddHours(6));

        decimal amount =
            bikeHeader.RegistrationAmount;

        decimal surplus =
            amount - option.TotalCost;

        List<RegistrationProfiles> created =
            new();

        for (int n = 0; n < bikes.Count; n++)
        {
            (SalesInvoiceLine line, IMotorBikeSaleLine bike) = bikes[n];

            if (!bike.IsRegistered)
            {
                continue;
            }

            string fileNo =
                $"{header.InvoiceNo}/{n + 1}";

            string profileNo =
                $"REG-{fileNo}";

            // Posted again after a failure : it is there already
            if (await context.Set<RegistrationProfiles>().AnyAsync(x => x.ProfileNo == profileNo))
            {
                continue;
            }

            CustomerFiles? file =
                await context.Set<CustomerFiles>()
                    .FirstOrDefaultAsync(x => !x.IsDeleted && x.CustomerFileNo == fileNo);

            RegistrationProfiles profile =
                new()
                {
                    ProfileNo = profileNo,
                    ProfileDate = header.InvoiceDate,
                    BranchId = header.BranchId,
                    Source = "Invoice",
                    SalesInvoiceId = header.SalesInvoiceId,
                    SalesInvoiceNo = header.InvoiceNo,
                    SalesInvoiceDate = header.InvoiceDate,
                    CustomerFileId = file?.CustomerFileId,
                    CustomerFileNo = file?.CustomerFileNo ?? string.Empty,
                    CustomerId = header.CustomerId,
                    CustomerCode = header.CustomerCode ?? string.Empty,
                    CustomerName = header.CustomerName ?? string.Empty,
                    CustomerPhone = header.CustomerPhone ?? string.Empty,
                    SalesmanName = header.SalesPersonName ?? string.Empty,
                    MotorBikeUnitId = bike.MotorBikeUnitId,
                    MotorBikeId = line.ProductId,
                    ModelName = line.ProductName ?? string.Empty,
                    ChassisNo = (bike.ChassisNo ?? string.Empty).Trim(),
                    EngineNo = (bike.EngineNo ?? string.Empty).Trim(),
                    ColorName = bike.ColorName ?? string.Empty,
                    VehiclePower = powers.GetValueOrDefault(line.ProductId, RegistrationVehiclePowers.Fuel),
                    RegistrationTypeId = option.RegistrationTypeId,
                    RegistrationTypeName = option.Name,
                    RegistrationPlan = option.Plan,
                    RegistrationMode = option.Mode,
                    ValidityYears = option.ValidityYears,
                    Amount = amount,
                    CollectedAmount = paid ? amount : 0m,
                    BrtaFees = option.BrtaFees,
                    SubmissionCharges = option.SubmissionCharges,
                    BrtaTips = option.BrtaTips,
                    RegistrationCommission = option.Commission,
                    Surplus = surplus,
                    Status = paid ? RegistrationStages.Processing : RegistrationStages.Pending,
                    StatusDate = today,
                    Remarks = string.Empty,
                    CancelReason = string.Empty,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            context.Set<RegistrationProfiles>().Add(profile);

            created.Add(profile);

            if (file != null)
            {
                file.RegistrationBy = ByDealer;
                file.RegistrationTypeId = option.RegistrationTypeId;
                file.RegistrationFileNo = profileNo;
                file.ModifiedBy = userId;
                file.ModifiedDate = now;

                AddHistory(context, FileHistoryEntity, file.CustomerFileId, "Update", "Registration By Dealer",
                    $"{file.CustomerFileNo} : registration taken on Sales Invoice - MB {header.InvoiceNo} ({option.Name}, {amount:N2}); Registration Profile {profileNo}.",
                    userId, now);
            }
        }

        if (created.Count == 0)
        {
            return;
        }

        await context.SaveChangesAsync();

        foreach (RegistrationProfiles profile in created)
        {
            AddHistory(context, HistoryEntity, profile.RegistrationProfileId, "Create", "Registration Profile Created",
                $"{profile.ProfileNo} : Sales Invoice - MB {profile.SalesInvoiceNo}, chassis {profile.ChassisNo}, {profile.RegistrationTypeName}, {profile.Amount:N2} ({(profile.Status == RegistrationStages.Processing ? "paid : Processing" : "not fully paid : Pending")}).",
                userId, now);
        }
    }


    //===========================================================
    // Cancel : the invoice's profiles Cancelled (refused once one
    // was submitted to BRTA); their files back to Registration By
    // Customer
    //===========================================================

    public static async Task
        CancelForInvoiceAsync
        (
            AppDbContext context,
            long salesInvoiceId,
            string invoiceNo,
            string reason,
            long userId,
            DateTime now
        )
    {
        List<RegistrationProfiles> profiles =
            await context.Set<RegistrationProfiles>()
                .Where(x => !x.IsDeleted
                            && x.SalesInvoiceId == salesInvoiceId
                            && x.Status != RegistrationStages.Cancelled)
                .ToListAsync();

        RegistrationProfiles? moved =
            profiles.FirstOrDefault(
                x => x.Status != RegistrationStages.Pending && x.Status != RegistrationStages.Processing);

        if (moved != null)
        {
            throw new InvalidOperationException(
                $"Registration Profile {moved.ProfileNo} is {moved.Status} (sent to BRTA) : the registration cannot be cancelled.");
        }

        DateOnly today =
            DateOnly.FromDateTime(now.AddHours(6));

        foreach (RegistrationProfiles profile in profiles)
        {
            profile.Status = RegistrationStages.Cancelled;
            profile.StatusDate = today;
            profile.CancelReason = (reason ?? string.Empty).Length > 500 ? reason!.Substring(0, 500) : (reason ?? string.Empty);
            profile.CancelledBy = userId;
            profile.CancelledDate = now;
            profile.ModifiedBy = userId;
            profile.ModifiedDate = now;

            AddHistory(context, HistoryEntity, profile.RegistrationProfileId, "Cancel", "Registration Profile Cancelled",
                $"{profile.ProfileNo} : {reason}",
                userId, now);
        }

        List<CustomerFiles> files =
            await context.Set<CustomerFiles>()
                .Where(x => !x.IsDeleted
                            && x.SalesInvoiceId == salesInvoiceId
                            && x.RegistrationBy == ByDealer)
                .ToListAsync();

        foreach (CustomerFiles file in files)
        {
            file.RegistrationBy = ByCustomer;
            file.RegistrationTypeId = null;
            file.RegistrationFileNo = string.Empty;
            file.ModifiedBy = userId;
            file.ModifiedDate = now;

            AddHistory(context, FileHistoryEntity, file.CustomerFileId, "Update", "Registration By Customer",
                $"{file.CustomerFileNo} : the registration on Sales Invoice - MB {invoiceNo} was cancelled ({reason}).",
                userId, now);
        }
    }


    private static void AddHistory
    (
        AppDbContext context,
        string entityName,
        long entityId,
        string activityType,
        string title,
        string description,
        long userId,
        DateTime now
    )
    {
        context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = entityName,
                EntityId = entityId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }
}
