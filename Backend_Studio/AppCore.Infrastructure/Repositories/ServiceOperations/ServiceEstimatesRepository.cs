//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.ServiceSettings;
using AppCore.Domain.Entities.VatManagement.VatSetup;
using AppCore.Domain.Platform.Accounting;
using AppCore.Domain.Platform.Inventory;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// What the estimates and the job cards share (hand-written pages,
// 2026-11-16; NEVER run Code Sync for them; tables made by
// ServiceOperations_Estimates_Engine.sql and ServiceOperations_
// Estimates_Open.sql)
//
// An estimate is made for a customer and a bike. A job card can be
// made from it : the estimate becomes Converted and carries the job
// card.
//===============================================================

internal static class Est
{
    public const string Draft = "Draft";

    public const string Sent = "Sent";

    public const string Approved = "Approved";

    public const string Rejected = "Rejected";

    public const string Revised = "Revised";

    // A job card was made from it
    public const string Converted = "Converted";

    // Still open : it can become a job card
    public static readonly string[] Live = { Draft, Sent, Approved };

    // The Estimate Charge can still be collected
    public static readonly string[] Collectable = { Draft, Sent, Approved, Rejected };

    public const string Service = "Service";

    public const string Part = "Part";

    public const string PartyCustomer = "Customer";

    public const string VatService = "Service Charges";

    // The customer does not pay for these jobs : no estimate is
    // needed for their job card
    public static readonly string[] NoEstimateJobTypes = { "Free Service", "Warranty", "Rework", Ws.Internal };

    public static List<string> Next(string status) =>
        status switch
        {
            Draft => new List<string> { Sent, Approved, Rejected },
            Sent => new List<string> { Approved, Rejected },
            _ => new List<string>()
        };

    // "EST-010101-2627-11-00001" for the first version,
    // "EST-010101-2627-11-00001 v2" afterwards
    public static string Name(string estimateNo, int version) =>
        version > 1 ? $"{estimateNo} v{version}" : estimateNo;

    // The estimate each job card was made from
    public static async Task<Dictionary<long, ServiceEstimates>> LiveByCardAsync(AppDbContext context, long? jobCardId = null)
    {
        IQueryable<ServiceEstimates> query =
            context.Set<ServiceEstimates>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.JobCardId != null && x.Status != Revised && x.Status != Rejected);

        if (jobCardId != null)
        {
            query = query.Where(x => x.JobCardId == jobCardId);
        }

        return (await query.OrderBy(x => x.ServiceEstimateId).ToListAsync())
            .GroupBy(x => x.JobCardId!.Value)
            .ToDictionary(x => x.Key, x => x.Last());
    }

    // The job card was made from an estimate
    public static Task<bool> ApprovedAsync(AppDbContext context, long jobCardId) =>
        context.Set<ServiceEstimates>().AsNoTracking()
            .AnyAsync(x => x.JobCardId == jobCardId && !x.IsDeleted && x.Status != Revised && x.Status != Rejected);
}


//===============================================================
// Service Estimates
//===============================================================

public class ServiceEstimatesRepository
    : IServiceEstimatesRepository
{
    private const string Entity = "ServiceEstimates";

    private const string PostingPage = "Settings > Account Settings > Posting Setup";

    // An estimate stays valid this many days (the date can be changed)
    private const int ValidDays = 7;

    private readonly AppDbContext _context;

    // The service catalogue and the parts with price and stock come
    // from where the service enquiries read them
    private readonly IServiceEnquiriesRepository _enquiries;

    // The estimate is numbered like the other operational documents :
    // EST-<branch>-<FY>-<MM>-00001, by service center and month
    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;

    private readonly IReceiptVoucherRepository _receiptVouchers;

    public ServiceEstimatesRepository(
        AppDbContext context,
        IServiceEnquiriesRepository enquiries,
        IVoucherNumberService numberService,
        IVoucherPostingService postingService,
        IReceiptVoucherRepository receiptVouchers)
    {
        _context = context;
        _enquiries = enquiries;
        _numberService = numberService;
        _postingService = postingService;
        _receiptVouchers = receiptVouchers;
    }

    private DbSet<ServiceEstimates> Estimates => _context.Set<ServiceEstimates>();

    private DbSet<ServiceEstimateLines> Lines => _context.Set<ServiceEstimateLines>();

    private DbSet<ServiceEstimateObservations> Observations => _context.Set<ServiceEstimateObservations>();

    private DbSet<JobCards> Cards => _context.Set<JobCards>();


    //===========================================================
    // The Estimate Charge : the customized service selected in
    // Workshop Configuration, with the VAT of Service Charges
    //===========================================================

    private sealed class Charge
    {
        public long ServiceId { get; init; }

        public string Name { get; init; } = string.Empty;

        public decimal Amount { get; init; }

        public decimal VatRate { get; set; }

        public decimal VatAmount { get; set; }

        public decimal Total { get; set; }

        public string IncomeLedger { get; init; } = string.Empty;

        public string VatLedger { get; set; } = string.Empty;
    }

    // null : no service is selected (estimates are free)
    private async Task<Charge?> ChargeAsync(DateOnly date)
    {
        long? serviceId =
            await _context.Set<WorkshopConfiguration>().AsNoTracking()
                .OrderBy(x => x.WorkshopConfigurationId)
                .Select(x => x.EstimateChargeServiceId)
                .FirstOrDefaultAsync();

        if (serviceId == null)
        {
            return null;
        }

        CustomizedServices? service =
            await _context.Set<CustomizedServices>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.CustomizedServiceId == serviceId && !x.IsDeleted && x.IsActive);

        if (service == null || service.ServiceCharge <= 0m)
        {
            return null;
        }

        var charge =
            new Charge
            {
                ServiceId = service.CustomizedServiceId,
                Name = service.ServiceName,
                Amount = Ws.Round(service.ServiceCharge),
                IncomeLedger = (service.IncomeLedgerCode ?? string.Empty).Trim()
            };

        charge.Total = charge.Amount;

        SalesVat? rule =
            await _context.Set<SalesVat>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status && x.VatType == Est.VatService && x.EffectiveFrom <= date && x.ValidTo >= date)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

        if (rule != null && rule.VatRate > 0m)
        {
            charge.VatRate = rule.VatRate;

            if (rule.PriceIncludesVat)
            {
                charge.VatAmount = Ws.Round(charge.Amount * rule.VatRate / (100m + rule.VatRate));
            }
            else
            {
                charge.VatAmount = Ws.Round(charge.Amount * rule.VatRate / 100m);
                charge.Total = charge.Amount + charge.VatAmount;
            }

            if (charge.VatAmount > 0m)
            {
                charge.VatLedger = PostingLedgerCodes.TryGet(_context, PostingPurposes.VatServiceCharges);
            }
        }

        return charge;
    }

    // The charge as it is today goes onto an estimate whose charge
    // was not collected yet
    private static void SetCharge(ServiceEstimates estimate, Charge? charge)
    {
        if (estimate.ChargeCollected)
        {
            return;
        }

        estimate.ChargeServiceId = charge?.ServiceId;
        estimate.ChargeName = Wp.Limit(charge?.Name, 200);
        estimate.ChargeAmount = charge?.Amount ?? 0m;
        estimate.ChargeVatRate = charge?.VatRate ?? 0m;
        estimate.ChargeVatAmount = charge?.VatAmount ?? 0m;
        estimate.ChargeTotal = charge?.Total ?? 0m;
        estimate.ChargeIncomeLedgerCode = Wp.Limit(charge?.IncomeLedger, 40);
        estimate.ChargeVatLedgerCode = Wp.Limit(charge?.VatLedger, 40);
    }


    //===========================================================
    // Lookups
    //===========================================================

    public async Task<string> PeekNoAsync(long branchId, string? date)
    {
        DateOnly day = HrCalendar.ParseDay(date) ?? HrCalendar.Today();

        try
        {
            return (await _numberService.PeekAsync(VoucherTypes.ServiceEstimate, branchId, day)).VoucherNo;
        }
        catch (InvalidOperationException)
        {
            return string.Empty;
        }
    }

    public async Task<ServiceEstimateLookupsDto> GetLookupsAsync()
    {
        DateOnly today = HrCalendar.Today();

        ServiceEnquiriesDefaultsDto defaults = await _enquiries.GetDefaultsAsync(today);

        Charge? charge = await ChargeAsync(today);

        return new ServiceEstimateLookupsDto
        {
            Today = HrCalendar.Day(today),
            ValidUntil = HrCalendar.Day(today.AddDays(ValidDays)),
            NextEstimateNo = string.Empty,
            Branches = await Ws.BranchesAsync(_context),
            Models = defaults.Models,
            ServiceItems = defaults.ServiceItems,
            Charge =
                new EstimateChargeDto
                {
                    IsSet = charge != null,
                    Name = charge?.Name ?? string.Empty,
                    Amount = charge?.Amount ?? 0m,
                    VatRate = charge?.VatRate ?? 0m,
                    VatAmount = charge?.VatAmount ?? 0m,
                    Total = charge?.Total ?? 0m
                }
        };
    }

    // The business line a part belongs to (Business Configuration)
    private static string LineOf(string kind) =>
        kind == "Accessory" ? BusinessLineAccess.Accessories : BusinessLineAccess.SpareParts;

    // The business lines the service center runs today : the core
    // lines of its wing and the extra ones granted to it
    private async Task<HashSet<string>> LinesOfAsync(long branchId)
    {
        Dictionary<long, HashSet<string>> lines =
            await BusinessLineAccess.ActiveLinesByBranchAsync(_context, BusinessLineAccess.Today());

        return lines.TryGetValue(branchId, out HashSet<string>? own) ? own : new HashSet<string>();
    }

    // A service center is offered the parts of its own business
    // lines only : no accessories where Accessories is not its line
    public async Task<List<PartOptionDto>> GetPartsAsync(long? branchId = null)
    {
        List<PartOptionDto> parts = await _enquiries.GetPartsAsync();

        if (branchId == null)
        {
            return parts;
        }

        HashSet<string> lines = await LinesOfAsync(branchId.Value);

        return parts.Where(x => lines.Contains(LineOf(x.Kind))).ToList();
    }


    //===========================================================
    // Reading
    //===========================================================

    private static ServiceEstimateDto Head(ServiceEstimates e, JobCards? card, Dictionary<long, string> branches, Dictionary<long, string> customerCodes)
    {
        bool converted = e.JobCardId != null;

        return new ServiceEstimateDto
        {
            ServiceEstimateId = e.ServiceEstimateId,
            PublicId = e.PublicId,
            EstimateNo = e.EstimateNo,
            Version = e.Version,
            EstimateDate = HrCalendar.Day(e.EstimateDate),
            ValidUntil = e.ValidUntil == null ? string.Empty : HrCalendar.Day(e.ValidUntil),
            BranchId = e.BranchId,
            BranchName = branches.TryGetValue(e.BranchId, out string? branch) ? branch : string.Empty,
            CustomerId = e.CustomerId,
            CustomerCode = e.CustomerId != null && customerCodes.TryGetValue(e.CustomerId.Value, out string? code) ? code : string.Empty,
            CustomerName = e.CustomerName,
            Mobile = e.Mobile,
            ServiceVehicleId = e.ServiceVehicleId,
            ModelId = e.ModelId,
            BrandManagementId = e.BrandManagementId,
            BrandName = e.BrandName,
            ModelName = e.ModelName,
            ColorName = e.ColorName,
            ChassisNo = e.ChassisNo,
            EngineNo = e.EngineNo,
            RegistrationNo = e.RegistrationNo,
            KmReading = e.KmReading,
            BasicRequirement = e.Requirement,
            JobCardId = e.JobCardId,
            JobCardPublicId = card?.PublicId,
            JobCardNo = card?.JobCardNo ?? string.Empty,
            JobCardStatus = card?.Status ?? string.Empty,
            Status = e.Status,
            StatusDate = e.StatusDate,
            StatusNote = e.StatusNote,
            LabourTotal = e.LabourTotal,
            PartsTotal = e.PartsTotal,
            GrandTotal = e.GrandTotal,
            Remarks = e.Remarks,
            ChargeName = e.ChargeName,
            ChargeAmount = e.ChargeAmount,
            ChargeVatRate = e.ChargeVatRate,
            ChargeVatAmount = e.ChargeVatAmount,
            ChargeTotal = e.ChargeTotal,
            ChargeCollected = e.ChargeCollected,
            ChargeCollectedDate = e.ChargeCollectedDate == null ? string.Empty : HrCalendar.Day(e.ChargeCollectedDate),
            ChargeReceiptVoucherNo = e.ChargeReceiptVoucherNo,
            ChargeInvoiceNo = e.ChargeInvoiceNo,
            CanEdit = e.Status == Est.Draft,
            NextStatuses = Est.Next(e.Status),
            CanRevise = !converted && e.Status is Est.Sent or Est.Approved or Est.Rejected,
            CanCollect = !converted && !e.ChargeCollected && e.ChargeTotal > 0m && Est.Collectable.Contains(e.Status),
            CanPrint = converted || e.ChargeCollected || e.ChargeTotal <= 0m,
            CanConvert = !converted && Est.Live.Contains(e.Status)
        };
    }

    private async Task<Dictionary<long, string>> CustomerCodesAsync(IEnumerable<long?> ids)
    {
        List<long> list = ids.Where(x => x != null).Select(x => x!.Value).Distinct().ToList();

        if (list.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        return (await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => list.Contains(x.CustomerId))
                .Select(x => new { x.CustomerId, x.CustomerCode })
                .ToListAsync())
            .ToDictionary(x => x.CustomerId, x => x.CustomerCode ?? string.Empty);
    }

    public async Task<List<ServiceEstimateDto>> GetAllAsync()
    {
        List<ServiceEstimates> estimates =
            await Estimates.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.ServiceEstimateId)
                .ToListAsync();

        List<long> cardIds = estimates.Where(x => x.JobCardId != null).Select(x => x.JobCardId!.Value).Distinct().ToList();

        Dictionary<long, JobCards> cards =
            (await Cards.AsNoTracking().Where(x => cardIds.Contains(x.JobCardId)).ToListAsync())
            .ToDictionary(x => x.JobCardId);

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        Dictionary<long, string> codes = await CustomerCodesAsync(estimates.Select(x => x.CustomerId));

        return estimates
            .Select(x => Head(x, x.JobCardId != null && cards.TryGetValue(x.JobCardId.Value, out JobCards? card) ? card : null, branches, codes))
            .ToList();
    }

    public async Task<ServiceEstimateDto> GetAsync(Guid publicId)
    {
        ServiceEstimates estimate =
            await Estimates.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The estimate was not found.");

        return await FullAsync(estimate);
    }

    private static ServiceEstimateLineDto ToDto(ServiceEstimateLines x) =>
        new()
        {
            ItemKind = x.ItemKind,
            ItemId = x.ItemId,
            ItemCode = x.ItemCode,
            ItemName = x.ItemName,
            Quantity = x.Quantity,
            Rate = x.Rate,
            Amount = x.Amount,
            IsFree = x.IsFree,
            Note = x.Note
        };

    private async Task<ServiceEstimateDto> FullAsync(ServiceEstimates estimate)
    {
        JobCards? card =
            estimate.JobCardId == null
                ? null
                : await Cards.AsNoTracking().FirstOrDefaultAsync(x => x.JobCardId == estimate.JobCardId);

        ServiceEstimateDto dto =
            Head(estimate, card, await Ws.BranchNamesAsync(_context), await CustomerCodesAsync(new[] { estimate.CustomerId }));

        List<ServiceEstimateLines> lines =
            await Lines.AsNoTracking()
                .Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        dto.Services = lines.Where(x => x.LineType == Est.Service).Select(ToDto).ToList();
        dto.Parts = lines.Where(x => x.LineType == Est.Part).Select(ToDto).ToList();

        dto.Observations =
            await Observations.AsNoTracking()
                .Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId)
                .OrderBy(x => x.LineNo)
                .Select(x => new ServiceEstimateObservationDto { WorkshopObservationId = x.WorkshopObservationId, Observation = x.Observation, WorkshopDiagnosisId = x.WorkshopDiagnosisId, Diagnosis = x.Diagnosis, Note = x.Note })
                .ToListAsync();

        return dto;
    }

    // The observations as they are stored : the names are kept as
    // they are now, a row without an observation is left out
    private static List<ServiceEstimateObservations> BuildObservations(SaveServiceEstimateDto dto)
    {
        var rows = new List<ServiceEstimateObservations>();

        foreach (ServiceEstimateObservationDto line in dto.Observations ?? new())
        {
            string observation = Ws.Clean(line.Observation, 150, "Observation");
            string diagnosis = Ws.Clean(line.Diagnosis, 150, "Diagnosis");

            if (observation.Length == 0)
            {
                if (diagnosis.Length == 0)
                {
                    continue;
                }

                throw new InvalidOperationException($"{diagnosis} : pick the observation it belongs to.");
            }

            rows.Add(
                new ServiceEstimateObservations
                {
                    LineNo = rows.Count + 1,
                    WorkshopObservationId = line.WorkshopObservationId > 0 ? line.WorkshopObservationId : null,
                    Observation = observation,
                    WorkshopDiagnosisId = diagnosis.Length > 0 && line.WorkshopDiagnosisId > 0 ? line.WorkshopDiagnosisId : null,
                    Diagnosis = diagnosis,
                    Note = Ws.Clean(line.Note, 300, "Note")
                });
        }

        if (rows.Count > 50)
        {
            throw new InvalidOperationException("An estimate can have 50 observations at most.");
        }

        return rows;
    }


    //===========================================================
    // Save (a new estimate, or a Draft)
    //===========================================================

    // The lines as they are stored : a catalogue item at its own
    // rate, a typed one at what was typed
    private async Task<List<ServiceEstimateLines>> BuildLinesAsync(SaveServiceEstimateDto dto, long branchId)
    {
        var lines = new List<ServiceEstimateLines>();

        List<ServiceEstimateLineDto> services = dto.Services ?? new();
        List<ServiceEstimateLineDto> parts = dto.Parts ?? new();

        List<ServiceItemOptionDto> serviceCatalogue =
            services.Count > 0 ? (await _enquiries.GetDefaultsAsync(HrCalendar.Today())).ServiceItems : new();

        int lineNo = 0;

        foreach (ServiceEstimateLineDto line in services)
        {
            string kind = (line.ItemKind ?? string.Empty).Trim();

            ServiceItemOptionDto? item =
                kind == "Other" || line.ItemId == null
                    ? null
                    : serviceCatalogue.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

            string name = item?.Name ?? Ws.Clean(line.ItemName, 200, "Service");

            if (name.Length == 0)
            {
                continue;
            }

            decimal quantity = line.Quantity <= 0 ? 1 : Ws.Round(line.Quantity);
            decimal rate = item != null ? item.Rate : Ws.Round(line.Rate);

            if (rate < 0)
            {
                throw new InvalidOperationException($"{name} : the rate cannot be below zero.");
            }

            bool isFree = item != null ? item.IsFree : line.IsFree;

            lines.Add(
                new ServiceEstimateLines
                {
                    LineType = Est.Service,
                    LineNo = ++lineNo,
                    ItemKind = item != null || line.ItemId != null ? kind : "Other",
                    ItemId = item != null ? item.Id : (kind == "Other" ? null : line.ItemId),
                    ItemCode = item?.Code ?? Ws.Clean(line.ItemCode, 40, "Service Code"),
                    ItemName = name,
                    Quantity = quantity,
                    Rate = rate,
                    Amount = isFree ? 0 : Ws.Round(quantity * rate),
                    IsFree = isFree,
                    Note = Ws.Clean(line.Note, 200, "Note")
                });
        }

        if (parts.Count > 0)
        {
            List<PartOptionDto> partCatalogue = await _enquiries.GetPartsAsync();

            HashSet<string> branchLines = await LinesOfAsync(branchId);

            foreach (ServiceEstimateLineDto line in parts)
            {
                string kind = (line.ItemKind ?? string.Empty).Trim();

                if (kind != "Other" && line.ItemId != null && !branchLines.Contains(LineOf(kind)))
                {
                    throw new InvalidOperationException($"{Ws.Clean(line.ItemName, 200, "Part")} : {LineOf(kind)} is not a business line of this service center (Settings > Business Configuration). Remove the line.");
                }

                PartOptionDto? item =
                    kind == "Other" || line.ItemId == null
                        ? null
                        : partCatalogue.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

                string name = item?.Name ?? Ws.Clean(line.ItemName, 200, "Part");

                if (name.Length == 0)
                {
                    continue;
                }

                decimal quantity = Ws.Round(line.Quantity);

                if (quantity <= 0)
                {
                    throw new InvalidOperationException($"{name} : give the quantity.");
                }

                decimal rate = item?.Price ?? Ws.Round(line.Rate);

                if (rate < 0)
                {
                    throw new InvalidOperationException($"{name} : the rate cannot be below zero.");
                }

                lines.Add(
                    new ServiceEstimateLines
                    {
                        LineType = Est.Part,
                        LineNo = ++lineNo,
                        ItemKind = item != null || line.ItemId != null ? kind : "Other",
                        ItemId = item != null ? item.Id : (kind == "Other" ? null : line.ItemId),
                        ItemCode = item?.Code ?? Ws.Clean(line.ItemCode, 40, "Part Code"),
                        ItemName = name,
                        Quantity = quantity,
                        Rate = rate,
                        Amount = Ws.Round(quantity * rate),
                        Note = Ws.Clean(line.Note, 200, "Note")
                    });
            }
        }

        return lines;
    }

    private static void SetTotals(ServiceEstimates estimate, List<ServiceEstimateLines> lines)
    {
        estimate.LabourTotal = lines.Where(x => x.LineType == Est.Service).Sum(x => x.Amount);
        estimate.PartsTotal = lines.Where(x => x.LineType == Est.Part).Sum(x => x.Amount);
        estimate.GrandTotal = estimate.LabourTotal + estimate.PartsTotal;
    }

    // The customer and the bike of the estimate, as the job card
    // takes them : a customer of the customer profiles or a typed
    // one; a bike the service center knows or a typed one
    private async Task SetPartyAsync(ServiceEstimates entity, SaveServiceEstimateDto dto, DateOnly date)
    {
        if (dto.ServiceVehicleId != null)
        {
            ServiceVehicles vehicle =
                await _context.Set<ServiceVehicles>().AsNoTracking().FirstOrDefaultAsync(x => x.ServiceVehicleId == dto.ServiceVehicleId && !x.IsDeleted)
                ?? throw new InvalidOperationException("The bike was not found : find it again.");

            entity.ServiceVehicleId = vehicle.ServiceVehicleId;
            entity.ChassisNo = vehicle.ChassisNo;
            entity.EngineNo = vehicle.EngineNo;
            entity.RegistrationNo = vehicle.RegistrationNo;
            entity.ModelId = vehicle.ModelId;
            entity.ModelName = vehicle.ModelName;
            entity.BrandManagementId = vehicle.BrandManagementId;
            entity.BrandName = vehicle.BrandName;
            entity.ColorName = vehicle.ColorName;
            entity.CustomerId = dto.CustomerId ?? vehicle.CustomerId;
        }
        else
        {
            entity.ServiceVehicleId = null;
            entity.ChassisNo = Ws.Clean(dto.ChassisNo, 50, "Chassis No").ToUpperInvariant();
            entity.EngineNo = Ws.Clean(dto.EngineNo, 50, "Engine No").ToUpperInvariant();
            entity.RegistrationNo = Ws.Clean(dto.RegistrationNo, 50, "Registration No").ToUpperInvariant();
            entity.ColorName = Ws.Clean(dto.ColorName, 60, "Colour");
            entity.CustomerId = dto.CustomerId;

            EnquiryModelOptionDto? model =
                dto.ModelId == null ? null : (await _enquiries.GetDefaultsAsync(date)).Models.FirstOrDefault(x => x.Id == dto.ModelId);

            if (model != null)
            {
                entity.ModelId = model.Id;
                entity.ModelName = model.Name;
                entity.BrandManagementId = model.BrandManagementId;
                entity.BrandName = model.BrandName;
            }
            else
            {
                entity.ModelId = null;
                entity.ModelName = Ws.Clean(dto.ModelName, 150, "Model");
                entity.BrandManagementId = null;
                entity.BrandName = Ws.Clean(dto.BrandName, 100, "Brand");

                if (entity.ModelName.Length == 0)
                {
                    throw new InvalidOperationException("Give the model of the bike.");
                }
            }
        }

        if (entity.CustomerId != null
            && !await _context.Set<CustomerProfiles>().AsNoTracking().AnyAsync(x => x.CustomerId == entity.CustomerId && !x.IsDeleted))
        {
            entity.CustomerId = null;
        }

        entity.CustomerName = Ws.Clean(dto.CustomerName, 150, "Customer Name");
        entity.Mobile = Ws.Clean(dto.Mobile, 20, "Mobile");

        if (entity.CustomerName.Length == 0 || entity.Mobile.Length == 0)
        {
            throw new InvalidOperationException("Give the name and the mobile no of the customer.");
        }

        if (dto.KmReading is < 0 or > 9999999)
        {
            throw new InvalidOperationException("The km reading is not right.");
        }

        entity.KmReading = dto.KmReading;
        entity.Requirement = Ws.Clean(dto.BasicRequirement, 1000, "Requirement");
    }

    public async Task<ServiceEstimateDto> SaveAsync(Guid? publicId, SaveServiceEstimateDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.EstimateDate)
            ?? throw new InvalidOperationException("Give the date of the estimate.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of an estimate cannot be in the future.");
        }

        DateOnly? validUntil = HrCalendar.ParseDay(dto.ValidUntil);

        if (validUntil != null && validUntil < date)
        {
            throw new InvalidOperationException("Valid Until cannot be before the date of the estimate.");
        }

        ServiceEstimates entity;

        if (publicId == null)
        {
            if (!(await Ws.BranchesAsync(_context)).Any(x => x.Id == dto.BranchId))
            {
                throw new InvalidOperationException("Pick the service center.");
            }

            entity =
                new ServiceEstimates
                {
                    EstimateNo = string.Empty,
                    Version = 1,
                    BranchId = dto.BranchId,
                    Status = Est.Draft,
                    StatusDate = DateTime.UtcNow,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };
        }
        else
        {
            entity = await LoadAsync(publicId.Value);

            if (entity.Status != Est.Draft)
            {
                throw new InvalidOperationException($"{Est.Name(entity.EstimateNo, entity.Version)} is {entity.Status} : it cannot be changed. Revise it to make a new version.");
            }

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        // The customer of a collected charge stays : the money is on
        // that customer's ledger
        long? customerBefore = entity.CustomerId;

        await SetPartyAsync(entity, dto, date);

        if (entity.ChargeCollected && entity.CustomerId != customerBefore)
        {
            throw new InvalidOperationException("The Estimate Charge was collected from the customer of this estimate : the customer cannot be changed.");
        }

        entity.EstimateDate = date;
        entity.ValidUntil = validUntil;
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");

        List<ServiceEstimateLines> lines = await BuildLinesAsync(dto, entity.BranchId);

        if (lines.Count == 0)
        {
            throw new InvalidOperationException("Put one labour or part line on the estimate at least.");
        }

        List<ServiceEstimateObservations> observations = BuildObservations(dto);

        SetTotals(entity, lines);

        SetCharge(entity, await ChargeAsync(date));

        await using var transaction = await _context.Database.BeginTransactionAsync();

        bool isNew = publicId == null;

        if (isNew)
        {
            entity.EstimateNo = (await _numberService.NextAsync(VoucherTypes.ServiceEstimate, entity.BranchId, date)).VoucherNo;

            Estimates.Add(entity);
        }

        await _context.SaveChangesAsync();

        long id = entity.ServiceEstimateId;

        if (!isNew)
        {
            Lines.RemoveRange(await Lines.Where(x => x.ServiceEstimateId == id).ToListAsync());

            Observations.RemoveRange(await Observations.Where(x => x.ServiceEstimateId == id).ToListAsync());
        }

        lines.ForEach(x => x.ServiceEstimateId = id);

        Lines.AddRange(lines);

        observations.ForEach(x => x.ServiceEstimateId = id);

        Observations.AddRange(observations);

        Ws.AddHistory(_context, Entity, id, isNew ? "Create" : "Update", isNew ? "Estimate Created" : "Estimate Updated", $"{Est.Name(entity.EstimateNo, entity.Version)} : {entity.CustomerName}, {entity.ModelName}; labour {entity.LabourTotal:0.00}, parts {entity.PartsTotal:0.00}, total {entity.GrandTotal:0.00}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(entity);
    }


    //===========================================================
    // Status
    //===========================================================

    private async Task<ServiceEstimates> LoadAsync(Guid publicId) =>
        await Estimates.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
        ?? throw new KeyNotFoundException("The estimate was not found.");

    private void SetStatus(ServiceEstimates estimate, string status, string note, long userId)
    {
        estimate.Status = status;
        estimate.StatusDate = DateTime.UtcNow;
        estimate.StatusNote = note;
        estimate.ModifiedBy = userId;
        estimate.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, estimate.ServiceEstimateId, "Status", $"Estimate {status}", $"{Est.Name(estimate.EstimateNo, estimate.Version)} is {status}.{(note.Length > 0 ? " " + note : string.Empty)}", userId);
    }

    public async Task<ServiceEstimateDto> ChangeStatusAsync(Guid publicId, ServiceEstimateStatusChangeDto dto, long userId)
    {
        ServiceEstimates estimate = await LoadAsync(publicId);

        string status = (dto.Status ?? string.Empty).Trim();
        string note = Ws.Clean(dto.Note, 300, "Note");
        string name = Est.Name(estimate.EstimateNo, estimate.Version);

        if (estimate.JobCardId != null || !Est.Next(estimate.Status).Contains(status))
        {
            throw new InvalidOperationException($"{name} is {estimate.Status} : it cannot be made {(status.Length > 0 ? status : "that")}.");
        }

        if (status == Est.Rejected && note.Length == 0)
        {
            throw new InvalidOperationException("Say why the customer rejected the estimate.");
        }

        if (status == Est.Approved && estimate.ValidUntil != null && estimate.ValidUntil < HrCalendar.Today())
        {
            throw new InvalidOperationException($"{name} was valid until {HrCalendar.Day(estimate.ValidUntil)}. Revise it : the prices are read again.");
        }

        SetStatus(estimate, status, note, userId);

        await _context.SaveChangesAsync();

        return await FullAsync(estimate);
    }

    // A new version : this estimate becomes Revised, a Draft with the
    // next version carries its customer, its bike, its lines and its
    // collected charge on
    public async Task<ServiceEstimateDto> ReviseAsync(Guid publicId, long userId)
    {
        ServiceEstimates estimate = await LoadAsync(publicId);

        string name = Est.Name(estimate.EstimateNo, estimate.Version);

        if (estimate.JobCardId != null || estimate.Status is not (Est.Sent or Est.Approved or Est.Rejected))
        {
            throw new InvalidOperationException($"{name} is {estimate.Status} : {(estimate.Status == Est.Draft ? "change it as it is." : "it cannot be revised.")}");
        }

        DateOnly today = HrCalendar.Today();

        string estimateNo = estimate.EstimateNo;

        int version =
            await Estimates.AsNoTracking().Where(x => x.EstimateNo == estimateNo).MaxAsync(x => x.Version) + 1;

        var next =
            new ServiceEstimates
            {
                EstimateNo = estimateNo,
                Version = version,
                EstimateDate = today,
                ValidUntil = today.AddDays(ValidDays),
                BranchId = estimate.BranchId,
                CustomerId = estimate.CustomerId,
                CustomerName = estimate.CustomerName,
                Mobile = estimate.Mobile,
                ServiceVehicleId = estimate.ServiceVehicleId,
                ChassisNo = estimate.ChassisNo,
                EngineNo = estimate.EngineNo,
                RegistrationNo = estimate.RegistrationNo,
                ModelId = estimate.ModelId,
                ModelName = estimate.ModelName,
                BrandManagementId = estimate.BrandManagementId,
                BrandName = estimate.BrandName,
                ColorName = estimate.ColorName,
                KmReading = estimate.KmReading,
                Requirement = estimate.Requirement,
                ChargeServiceId = estimate.ChargeServiceId,
                ChargeName = estimate.ChargeName,
                ChargeAmount = estimate.ChargeAmount,
                ChargeVatRate = estimate.ChargeVatRate,
                ChargeVatAmount = estimate.ChargeVatAmount,
                ChargeTotal = estimate.ChargeTotal,
                ChargeIncomeLedgerCode = estimate.ChargeIncomeLedgerCode,
                ChargeVatLedgerCode = estimate.ChargeVatLedgerCode,
                ChargeCollected = estimate.ChargeCollected,
                ChargeCollectedDate = estimate.ChargeCollectedDate,
                ChargeReceiptVoucherId = estimate.ChargeReceiptVoucherId,
                ChargeReceiptVoucherNo = estimate.ChargeReceiptVoucherNo,
                Status = Est.Draft,
                StatusDate = DateTime.UtcNow,
                LabourTotal = estimate.LabourTotal,
                PartsTotal = estimate.PartsTotal,
                GrandTotal = estimate.GrandTotal,
                Remarks = estimate.Remarks,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        List<ServiceEstimateLines> lines =
            await Lines.AsNoTracking().Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId).OrderBy(x => x.LineNo).ToListAsync();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        Estimates.Add(next);

        SetStatus(estimate, Est.Revised, $"Revised : version {version} was made.", userId);

        await _context.SaveChangesAsync();

        Lines.AddRange(
            lines.Select(x => new ServiceEstimateLines
            {
                ServiceEstimateId = next.ServiceEstimateId,
                LineType = x.LineType,
                LineNo = x.LineNo,
                ItemKind = x.ItemKind,
                ItemId = x.ItemId,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                Rate = x.Rate,
                Amount = x.Amount,
                IsFree = x.IsFree,
                Note = x.Note
            }));

        Observations.AddRange(
            (await Observations.AsNoTracking().Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new ServiceEstimateObservations
            {
                ServiceEstimateId = next.ServiceEstimateId,
                LineNo = x.LineNo,
                WorkshopObservationId = x.WorkshopObservationId,
                Observation = x.Observation,
                WorkshopDiagnosisId = x.WorkshopDiagnosisId,
                Diagnosis = x.Diagnosis,
                Note = x.Note
            }));

        Ws.AddHistory(_context, Entity, next.ServiceEstimateId, "Create", "Estimate Revised", $"{Est.Name(estimateNo, version)} was made from {name}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(next);
    }


    //===========================================================
    // The Estimate Charge is collected
    //
    //   journal (under the estimate number) :
    //     Dr  customer receivable        the charge with its VAT
    //     Cr  income ledger of the charge service
    //     Cr  VAT (Service Charges)
    //   Receipt Voucher of its own number :
    //     Dr  cash / bank / MFS          Cr  customer receivable
    //===========================================================

    public async Task<ServiceEstimateDto> CollectChargeAsync(Guid publicId, CollectEstimateChargeDto dto, long userId)
    {
        ServiceEstimates estimate = await LoadAsync(publicId);

        string name = Est.Name(estimate.EstimateNo, estimate.Version);

        if (estimate.ChargeCollected)
        {
            throw new InvalidOperationException($"The Estimate Charge of {name} was collected already ({estimate.ChargeReceiptVoucherNo}).");
        }

        if (estimate.JobCardId != null)
        {
            throw new InvalidOperationException($"{name} became a job card : no Estimate Charge is collected.");
        }

        if (!Est.Collectable.Contains(estimate.Status))
        {
            throw new InvalidOperationException($"{name} is {estimate.Status} : its Estimate Charge cannot be collected.");
        }

        DateOnly date = HrCalendar.ParseDay(dto.CollectDate) ?? HrCalendar.Today();

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The collection cannot be dated in the future.");
        }

        if (date < estimate.EstimateDate)
        {
            throw new InvalidOperationException($"The collection cannot be dated before the estimate ({HrCalendar.Day(estimate.EstimateDate)}).");
        }

        // The charge as Workshop Configuration has it on the day
        SetCharge(estimate, await ChargeAsync(date));

        decimal total = estimate.ChargeTotal;

        if (total <= 0m)
        {
            throw new InvalidOperationException("No Estimate Charge is set : select the service in Workshop Configuration (Estimate Charge).");
        }

        if (estimate.ChargeIncomeLedgerCode.Length == 0)
        {
            throw new InvalidOperationException($"{estimate.ChargeName} has no income ledger (Service Setup > Customized Services).");
        }

        if (estimate.ChargeVatAmount > 0m && estimate.ChargeVatLedgerCode.Length == 0)
        {
            throw new InvalidOperationException($"{estimate.ChargeName} carries VAT, but the VAT ledger of Service Charges is not selected ({PostingPage}).");
        }

        CustomerProfiles? customer =
            estimate.CustomerId == null
                ? null
                : await _context.Set<CustomerProfiles>().AsNoTracking().FirstOrDefaultAsync(x => x.CustomerId == estimate.CustomerId && !x.IsDeleted);

        if (customer == null)
        {
            throw new InvalidOperationException($"{name} has no customer of the customer profiles : pick the customer on the estimate first. The charge is posted to the customer's ledger.");
        }

        string receivable = (customer.ReceivableLedgerCode ?? string.Empty).Trim();

        if (receivable.Length == 0)
        {
            throw new InvalidOperationException($"{customer.CustomerName} has no receivable ledger (Customer Profiles).");
        }

        //-------------------------------------------------------
        // The collection lines
        //-------------------------------------------------------

        List<ServiceInvoicePaymentDto> payments = (dto.Payments ?? new()).Where(x => x.Amount != 0m || !string.IsNullOrWhiteSpace(x.LedgerCode)).ToList();

        foreach (ServiceInvoicePaymentDto p in payments)
        {
            p.Mode = Sb.Modes.FirstOrDefault(x => string.Equals(x, (p.Mode ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                     ?? throw new InvalidOperationException("A collection line needs its mode : Cash, Bank or MFS.");

            p.LedgerCode = (p.LedgerCode ?? string.Empty).Trim();
            p.Amount = Ws.Round(p.Amount);
            p.TransactionRef = Ws.Clean(p.TransactionRef, 100, "Transaction ID");

            if (p.LedgerCode.Length == 0)
            {
                throw new InvalidOperationException($"Pick the {p.Mode} account the money goes to.");
            }

            if (p.Amount <= 0m)
            {
                throw new InvalidOperationException($"{p.Mode} : give the amount collected.");
            }

            if (p.Mode == "MFS" && p.TransactionRef.Length == 0)
            {
                throw new InvalidOperationException("MFS : give the transaction ID.");
            }
        }

        decimal paid = payments.Sum(x => x.Amount);

        if (paid != total)
        {
            throw new InvalidOperationException($"The Estimate Charge is {total:N2} : collect exactly that (the lines add up to {paid:N2}).");
        }

        // Fails here when the financial year of the date is not open
        await _numberService.ResolvePeriodAsync(estimate.BranchId, date);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        DateTime now = DateTime.UtcNow;

        string customerCode = Wp.Limit(customer.CustomerCode, 30);

        string narration = Wp.Limit($"Estimate Charge of {name} ({estimate.CustomerName})", 300);

        var postingLines =
            new List<VoucherPostingLine>
            {
                new VoucherPostingLine { GroupNo = 1, LedgerCode = receivable, Debit = total, Narration = narration, PartyType = Est.PartyCustomer, PartyCode = customerCode },
                new VoucherPostingLine { GroupNo = 1, LedgerCode = estimate.ChargeIncomeLedgerCode, Credit = total - estimate.ChargeVatAmount, Narration = narration }
            };

        if (estimate.ChargeVatAmount > 0m)
        {
            postingLines.Add(
                new VoucherPostingLine { GroupNo = 1, LedgerCode = estimate.ChargeVatLedgerCode, Credit = estimate.ChargeVatAmount, Narration = narration });

            _context.Set<VatRegister>().Add(
                new VatRegister
                {
                    Direction = "Sale",
                    DocumentType = VoucherTypes.ServiceEstimate,
                    DocumentId = estimate.ServiceEstimateId,
                    DocumentLineId = null,
                    DocumentNo = estimate.EstimateNo,
                    DocumentDate = date,
                    MushakNo = string.Empty,
                    MushakDate = null,
                    PartyType = Est.PartyCustomer,
                    PartyCode = customerCode,
                    PartyName = Wp.Limit(customer.CustomerName, 200),
                    PartyBin = Wp.Limit(customer.BinNo, 30),
                    BranchId = estimate.BranchId,
                    ProductType = "SV",
                    ProductId = estimate.ChargeServiceId,
                    ProductCode = "EST-CHARGE",
                    ProductName = estimate.ChargeName,
                    Quantity = 1m,
                    TaxableValue = total - estimate.ChargeVatAmount,
                    VatRate = estimate.ChargeVatRate,
                    VatAmount = estimate.ChargeVatAmount,
                    VatClaimable = 0m,
                    VatLedgerCode = Wp.Limit(estimate.ChargeVatLedgerCode, 30),
                    IsReversal = false,
                    CreatedBy = userId,
                    CreatedDate = now
                });
        }

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = VoucherTypes.ServiceEstimate,
                VoucherId = estimate.ServiceEstimateId,
                VoucherNo = estimate.EstimateNo,
                VoucherDate = date,
                BranchId = estimate.BranchId,
                PartyType = Est.PartyCustomer,
                PartyCode = customerCode,
                ReferenceNo = name,
                Narration = narration,
                Lines = postingLines
            },
            userId);

        string against = $"Estimate Charge of {name}";

        ReceiptVoucherSavedDto receipt =
            await _receiptVouchers.CreatePostedAsync(
                new CreateReceiptVoucherDto
                {
                    VoucherDate = HrCalendar.Day(date),
                    BranchId = estimate.BranchId,
                    Narration = Wp.Limit($"{against} ({estimate.CustomerName})", 500),
                    Debits =
                        payments.Select(p => new ReceiptVoucherDebitDto
                        {
                            Mode = p.Mode,
                            LedgerCode = p.LedgerCode,
                            Amount = p.Amount,
                            TransactionRef = p.TransactionRef,
                            ShortNotes = against
                        }).ToList(),
                    Credits =
                        new List<ReceiptVoucherCreditDto>
                        {
                            new ReceiptVoucherCreditDto
                            {
                                LedgerType = Est.PartyCustomer,
                                LedgerCode = receivable,
                                PartyCode = customerCode,
                                Amount = total,
                                ShortNotes = against
                            }
                        }
                },
                estimate.EstimateNo,
                userId);

        estimate.ChargeCollected = true;
        estimate.ChargeCollectedDate = date;
        estimate.ChargeReceiptVoucherId = receipt.ReceiptVoucherId;
        estimate.ChargeReceiptVoucherNo = Wp.Limit(receipt.VoucherNo, 30);
        estimate.ModifiedBy = userId;
        estimate.ModifiedDate = now;

        Ws.AddHistory(_context, Entity, estimate.ServiceEstimateId, "Update", "Estimate Charge Collected", $"{name} : {estimate.ChargeName} {total:N2} collected from {estimate.CustomerName} ({estimate.ChargeReceiptVoucherNo}).", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(estimate);
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        ServiceEstimates estimate = await LoadAsync(publicId);

        string name = Est.Name(estimate.EstimateNo, estimate.Version);

        if (estimate.Status != Est.Draft)
        {
            throw new InvalidOperationException($"{name} is {estimate.Status} : only a Draft can be deleted.");
        }

        if (estimate.Version > 1)
        {
            throw new InvalidOperationException($"{name} is a revision : it cannot be deleted. Reject it instead.");
        }

        if (estimate.ChargeCollected)
        {
            throw new InvalidOperationException($"The Estimate Charge of {name} was collected ({estimate.ChargeReceiptVoucherNo}) : it cannot be deleted.");
        }

        estimate.IsDeleted = true;
        estimate.DeletedBy = userId;
        estimate.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, estimate.ServiceEstimateId, "Delete", "Estimate Deleted", name, userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        ServiceEstimates? estimate = await Estimates.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (estimate == null)
        {
            return null;
        }

        string name = Est.Name(estimate.EstimateNo, estimate.Version);

        estimate.IsDeleted = false;
        estimate.DeletedBy = null;
        estimate.DeletedDate = null;
        estimate.ModifiedBy = userId;
        estimate.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, estimate.ServiceEstimateId, "Restore", "Estimate Restored", name, userId);

        await _context.SaveChangesAsync();

        return name;
    }
}
