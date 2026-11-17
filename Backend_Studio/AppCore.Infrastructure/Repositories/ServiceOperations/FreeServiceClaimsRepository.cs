//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// Free Service Claims (hand-written page, 2026-11-16; NEVER run
// Code Sync; table made by ServiceOperations_Billing_Engine.sql)
//
// A free scheduled service on a service invoice left what the brand
// pays back on the claim ledger of its Service Policy (Dr claim
// ledger / Cr service income, posted with the invoice). A claim
// collects those lines of one brand. When the brand pays or adjusts
// it, the claim is settled under its own voucher number (FSC) :
//   Dr the ledger the money went to   Cr the claim ledger(s)
//===============================================================

public class FreeServiceClaimsRepository
    : IFreeServiceClaimsRepository
{
    private const string Entity = "FreeServiceClaims";


    private const string Open = "Open";

    private const string Settled = "Settled";

    private const string Cancelled = "Cancelled";

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;

    public FreeServiceClaimsRepository(AppDbContext context, IVoucherNumberService numberService, IVoucherPostingService postingService)
    {
        _context = context;
        _numberService = numberService;
        _postingService = postingService;
    }

    private DbSet<FreeServiceClaims> Claims => _context.Set<FreeServiceClaims>();

    private DbSet<ServiceInvoiceLines> Lines => _context.Set<ServiceInvoiceLines>();

    // Free services of posted invoices with a brand reimbursement
    private IQueryable<ServiceInvoiceLines> Claimable() =>
        from line in Lines
        join invoice in _context.Set<ServiceInvoices>() on line.ServiceInvoiceId equals invoice.ServiceInvoiceId
        where invoice.Status == Sb.Posted && line.ClaimAmount > 0m && line.BrandManagementId != null
        select line;

    private async Task<List<FreeServiceClaimLineDto>> LineDtosAsync(List<ServiceInvoiceLines> lines)
    {
        List<long> invoiceIds = lines.Select(x => x.ServiceInvoiceId).Distinct().ToList();

        Dictionary<long, ServiceInvoices> invoices =
            (await _context.Set<ServiceInvoices>().AsNoTracking().Where(x => invoiceIds.Contains(x.ServiceInvoiceId)).ToListAsync()).ToDictionary(x => x.ServiceInvoiceId);

        List<long> cardIds = invoices.Values.Select(x => x.JobCardId).Distinct().ToList();

        Dictionary<long, JobCards> cards =
            (await _context.Set<JobCards>().AsNoTracking().Where(x => cardIds.Contains(x.JobCardId)).ToListAsync()).ToDictionary(x => x.JobCardId);

        return lines
            .Select(x =>
            {
                invoices.TryGetValue(x.ServiceInvoiceId, out ServiceInvoices? invoice);

                JobCards? card = invoice != null && cards.TryGetValue(invoice.JobCardId, out JobCards? found) ? found : null;

                return new FreeServiceClaimLineDto
                {
                    LineId = x.ServiceInvoiceLineId,
                    InvoiceNo = invoice?.InvoiceNo ?? string.Empty,
                    InvoiceDate = invoice == null ? string.Empty : HrCalendar.Day(invoice.InvoiceDate),
                    JobCardNo = card?.JobCardNo ?? string.Empty,
                    CustomerName = invoice?.CustomerName ?? string.Empty,
                    ChassisNo = card?.ChassisNo ?? string.Empty,
                    ModelName = card?.ModelName ?? string.Empty,
                    ServiceName = x.ItemName,
                    Amount = x.ClaimAmount
                };
            })
            .OrderBy(x => x.InvoiceDate).ThenBy(x => x.InvoiceNo)
            .ToList();
    }

    public async Task<FreeServiceClaimLookupsDto> GetLookupsAsync()
    {
        var open =
            await Claimable().AsNoTracking()
                .Where(x => x.FreeServiceClaimId == null)
                .GroupBy(x => x.BrandManagementId!.Value)
                .Select(g => new { BrandManagementId = g.Key, Count = g.Count(), Amount = g.Sum(x => x.ClaimAmount) })
                .ToListAsync();

        List<long> brandIds = open.Select(x => x.BrandManagementId).ToList();

        Dictionary<long, string> names =
            (await _context.Set<AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement>().AsNoTracking()
                .Where(x => brandIds.Contains(x.BrandManagementId))
                .Select(x => new { x.BrandManagementId, x.BrandName })
                .ToListAsync())
            .ToDictionary(x => x.BrandManagementId, x => x.BrandName);

        return new FreeServiceClaimLookupsDto
        {
            Today = HrCalendar.Day(HrCalendar.Today()),
            NextClaimNo = "Given when it is saved",
            Brands =
                open.Select(x => new FreeServiceBrandDto
                {
                    BrandManagementId = x.BrandManagementId,
                    BrandName = names.TryGetValue(x.BrandManagementId, out string? name) ? name : $"Brand {x.BrandManagementId}",
                    ServiceCount = x.Count,
                    Amount = x.Amount
                })
                .OrderBy(x => x.BrandName)
                .ToList()
        };
    }

    // The free services of a brand that are on no claim yet
    public async Task<List<FreeServiceClaimLineDto>> GetOpenLinesAsync(long brandManagementId) =>
        await LineDtosAsync(
            await Claimable().AsNoTracking().Where(x => x.FreeServiceClaimId == null && x.BrandManagementId == brandManagementId).ToListAsync());

    private static FreeServiceClaimDto Head(FreeServiceClaims x, int count) =>
        new()
        {
            Id = x.FreeServiceClaimId,
            PublicId = x.PublicId,
            ClaimNo = x.ClaimNo,
            ClaimDate = HrCalendar.Day(x.ClaimDate),
            BrandManagementId = x.BrandManagementId,
            BrandName = x.BrandName,
            ServiceCount = count,
            TotalAmount = x.TotalAmount,
            Status = x.Status,
            SettledDate = x.SettledDate == null ? string.Empty : HrCalendar.Day(x.SettledDate.Value),
            SettledLedgerCode = x.SettledLedgerCode,
            SettledLedgerName = x.SettledLedgerName,
            SettlementNo = x.SettlementNo,
            SettlementRef = x.SettlementRef,
            Remarks = x.Remarks
        };

    public async Task<List<FreeServiceClaimDto>> GetAllAsync()
    {
        List<FreeServiceClaims> rows = await Claims.AsNoTracking().OrderByDescending(x => x.FreeServiceClaimId).ToListAsync();

        Dictionary<long, int> counts =
            (await Lines.AsNoTracking().Where(x => x.FreeServiceClaimId != null).GroupBy(x => x.FreeServiceClaimId!.Value).Select(g => new { g.Key, Count = g.Count() }).ToListAsync())
            .ToDictionary(x => x.Key, x => x.Count);

        return rows.Select(x => Head(x, counts.TryGetValue(x.FreeServiceClaimId, out int count) ? count : 0)).ToList();
    }

    private async Task<FreeServiceClaimDto> FullAsync(FreeServiceClaims claim)
    {
        List<ServiceInvoiceLines> lines = await Lines.AsNoTracking().Where(x => x.FreeServiceClaimId == claim.FreeServiceClaimId).ToListAsync();

        FreeServiceClaimDto dto = Head(claim, lines.Count);

        dto.Lines = await LineDtosAsync(lines);

        return dto;
    }

    public async Task<FreeServiceClaimDto> GetAsync(Guid publicId) =>
        await FullAsync(
            await Claims.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The claim was not found."));

    public async Task<FreeServiceClaimDto> CreateAsync(SaveFreeServiceClaimDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.ClaimDate)
            ?? throw new InvalidOperationException("Give the date of the claim.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of a claim cannot be in the future.");
        }

        List<long> ids = (dto.LineIds ?? new()).Distinct().ToList();

        if (ids.Count == 0)
        {
            throw new InvalidOperationException("Tick the free services that go on the claim.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        List<ServiceInvoiceLines> lines =
            await Claimable().Where(x => ids.Contains(x.ServiceInvoiceLineId) && x.FreeServiceClaimId == null && x.BrandManagementId == dto.BrandManagementId).ToListAsync();

        if (lines.Count != ids.Count)
        {
            throw new InvalidOperationException("Some of the free services are on another claim already, or are not of this brand. Open the form again.");
        }

        string brandName =
            await _context.Set<AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement>().AsNoTracking()
                .Where(x => x.BrandManagementId == dto.BrandManagementId)
                .Select(x => x.BrandName)
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the brand.");

        // The claim is numbered on the service center with the most of it
        List<long> invoiceIds = lines.Select(x => x.ServiceInvoiceId).Distinct().ToList();

        Dictionary<long, long> invoiceBranches =
            await _context.Set<ServiceInvoices>().AsNoTracking()
                .Where(x => invoiceIds.Contains(x.ServiceInvoiceId))
                .ToDictionaryAsync(x => x.ServiceInvoiceId, x => x.BranchId);

        long claimBranchId =
            lines.GroupBy(x => invoiceBranches[x.ServiceInvoiceId])
                .OrderByDescending(g => g.Sum(x => x.ClaimAmount))
                .First().Key;

        var claim =
            new FreeServiceClaims
            {
                ClaimNo = (await _numberService.NextAsync(VoucherTypes.FreeServiceClaimNo, claimBranchId, date)).VoucherNo,
                ClaimDate = date,
                BrandManagementId = dto.BrandManagementId,
                BrandName = Wp.Limit(brandName, 100),
                TotalAmount = lines.Sum(x => x.ClaimAmount),
                Status = Open,
                Remarks = Ws.Clean(dto.Remarks, 500, "Remarks"),
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Claims.Add(claim);

        await _context.SaveChangesAsync();

        foreach (ServiceInvoiceLines line in lines)
        {
            line.FreeServiceClaimId = claim.FreeServiceClaimId;
        }

        Ws.AddHistory(_context, Entity, claim.FreeServiceClaimId, "Create", "Free Service Claim Created", $"{claim.ClaimNo} : {claim.BrandName}, {lines.Count} free service(s), {claim.TotalAmount:N2}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(claim);
    }

    private async Task<FreeServiceClaims> OpenClaimAsync(Guid publicId)
    {
        FreeServiceClaims claim =
            await Claims.FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The claim was not found.");

        if (claim.Status != Open)
        {
            throw new InvalidOperationException($"{claim.ClaimNo} is {claim.Status} already.");
        }

        return claim;
    }

    // The free services are free for another claim again
    public async Task<FreeServiceClaimDto> CancelAsync(Guid publicId, long userId)
    {
        FreeServiceClaims claim = await OpenClaimAsync(publicId);

        foreach (ServiceInvoiceLines line in await Lines.Where(x => x.FreeServiceClaimId == claim.FreeServiceClaimId).ToListAsync())
        {
            line.FreeServiceClaimId = null;
        }

        claim.Status = Cancelled;
        claim.ModifiedBy = userId;
        claim.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, claim.FreeServiceClaimId, "Status", "Free Service Claim Cancelled", $"{claim.ClaimNo} ({claim.BrandName}, {claim.TotalAmount:N2}) was cancelled.", userId);

        await _context.SaveChangesAsync();

        return await FullAsync(claim);
    }

    // The brand paid (or adjusted) the claim
    public async Task<FreeServiceClaimDto> SettleAsync(Guid publicId, SettleFreeServiceClaimDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.SettledDate)
            ?? throw new InvalidOperationException("Give the date the brand settled the claim.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The settlement date cannot be in the future.");
        }

        string ledger = (dto.LedgerCode ?? string.Empty).Trim();

        if (ledger.Length == 0)
        {
            throw new InvalidOperationException("Pick the account the money of the brand went to.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FreeServiceClaims claim = await OpenClaimAsync(publicId);

        if (date < claim.ClaimDate)
        {
            throw new InvalidOperationException($"The settlement cannot be dated before the claim ({HrCalendar.Day(claim.ClaimDate)}).");
        }

        var lines =
            await (from line in Lines.AsNoTracking()
                   join invoice in _context.Set<ServiceInvoices>().AsNoTracking() on line.ServiceInvoiceId equals invoice.ServiceInvoiceId
                   where line.FreeServiceClaimId == claim.FreeServiceClaimId
                   select new { line.ClaimLedgerCode, line.ClaimAmount, invoice.BranchId })
                .ToListAsync();

        decimal total = lines.Sum(x => x.ClaimAmount);

        if (total <= 0m)
        {
            throw new InvalidOperationException($"{claim.ClaimNo} has no free services.");
        }

        // The branch with the most of the claim carries the voucher
        long branchId = lines.GroupBy(x => x.BranchId).OrderByDescending(g => g.Sum(x => x.ClaimAmount)).First().Key;

        await _numberService.ResolvePeriodAsync(branchId, date);

        string voucherNo = (await _numberService.NextAsync(VoucherTypes.FreeServiceClaim, branchId, date)).VoucherNo;

        string narration = Wp.Limit($"Free service claim {claim.ClaimNo} settled by {claim.BrandName}", 300);

        var postingLines = new List<VoucherPostingLine> { new() { GroupNo = 1, LedgerCode = ledger, Debit = total, Narration = narration } };

        postingLines.AddRange(
            lines.GroupBy(x => x.ClaimLedgerCode.Trim())
                .Select(g => new VoucherPostingLine { GroupNo = 1, LedgerCode = g.Key, Credit = g.Sum(x => x.ClaimAmount), Narration = narration }));

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = VoucherTypes.FreeServiceClaim,
                VoucherId = claim.FreeServiceClaimId,
                VoucherNo = voucherNo,
                VoucherDate = date,
                BranchId = branchId,
                ReferenceNo = claim.ClaimNo,
                Narration = narration,
                Lines = postingLines
            },
            userId);

        claim.Status = Settled;
        claim.TotalAmount = total;
        claim.SettledDate = date;
        claim.SettledLedgerCode = Wp.Limit(ledger, 40);
        claim.SettledLedgerName = Ws.Clean(dto.LedgerName, 250, "Account");
        claim.SettlementNo = voucherNo;
        claim.SettlementRef = Ws.Clean(dto.Reference, 100, "Reference");
        claim.ModifiedBy = userId;
        claim.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, claim.FreeServiceClaimId, "Status", "Free Service Claim Settled", $"{claim.ClaimNo} ({claim.BrandName}) : {total:N2} received in {claim.SettledLedgerName} {ledger}, voucher {voucherNo}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(claim);
    }
}
