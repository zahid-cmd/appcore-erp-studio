//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// VAT Applicability Service
//
// Reads the four switches BY CODE. The first read after a change
// writes it to VatApplicabilityHistory (state + Effective From
// from the switch Value; empty / unreadable Value = the day it
// is first seen). Moving the date of the current state replaces
// its row, so the earlier state holds until the new date. A date is answered from the history : the
// latest change effective on or before it; none = applicable.
// The table is used through plain SQL (no DbSet needed).
//===============================================================

public class VatApplicabilityService
    : IVatApplicabilityService
{
    //===========================================================
    // Codes
    //===========================================================

    public const string PurchaseSp = "CFG-MOD-013-0001";

    public const string SalesSp = "CFG-MOD-013-0002";

    public const string PurchaseAc = "CFG-MOD-013-0003";

    public const string SalesAc = "CFG-MOD-013-0004";

    private static readonly string[] DateFormats =
        { "yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "d-M-yyyy", "d/M/yyyy" };


    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext _context;


    public VatApplicabilityService(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // History row (plain SQL)
    //===========================================================

    private sealed class HistoryRow
    {
        public long VatApplicabilityHistoryId { get; set; }

        public bool IsApplicable { get; set; }

        public DateOnly EffectiveFrom { get; set; }
    }


    //===========================================================
    // Get
    //===========================================================

    public async Task<VatApplicabilityDto>
        GetAsync
        (
            string productLine,
            DateOnly date
        )
    {
        string line =
            (productLine ?? string.Empty).Trim().ToUpperInvariant();

        VatApplicabilityDto result =
            new()
            {
                ProductLine = line,
                Date = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            };

        (string? purchaseCode, string? salesCode) =
            line switch
            {
                "SP" => (PurchaseSp, SalesSp),
                "AC" => (PurchaseAc, SalesAc),
                _ => ((string?)null, (string?)null)
            };

        if (purchaseCode == null || salesCode == null)
        {
            return result;
        }

        (result.PurchaseVatApplicable, result.PurchaseSince) =
            await StateOnAsync(purchaseCode, date);

        (result.SalesVatApplicable, result.SalesSince) =
            await StateOnAsync(salesCode, date);

        return result;
    }


    //===========================================================
    // State of one switch on a date
    //===========================================================

    private async Task<(bool Applicable, string Since)>
        StateOnAsync
        (
            string code,
            DateOnly date
        )
    {
        await RecordChangeAsync(code);

        HistoryRow? row =
            await _context.Database
                .SqlQuery<HistoryRow>(
                    $@"SELECT ""VatApplicabilityHistoryId"", ""IsApplicable"", ""EffectiveFrom""
                       FROM ""VatApplicabilityHistory""
                       WHERE ""ConfigurationCode"" = {code}
                         AND ""EffectiveFrom"" <= {date}
                       ORDER BY ""EffectiveFrom"" DESC, ""VatApplicabilityHistoryId"" DESC
                       LIMIT 1")
                .FirstOrDefaultAsync();

        return row == null
            ? (true, string.Empty)
            : (row.IsApplicable, row.EffectiveFrom.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
    }


    //===========================================================
    // Keeps the history in step with the switch
    //
    // The "current run" = the rows written since the switch last
    // had the opposite state. It must be exactly ONE row : the
    // current state from its Effective From. When the date is
    // moved (e.g. ON from 30-Oct corrected to ON from 31-Oct),
    // the run is replaced, so before the new date the earlier
    // state (OFF) holds again. Earlier periods are never touched.
    //===========================================================

    private sealed class RunRow
    {
        public long VatApplicabilityHistoryId { get; set; }

        public DateOnly EffectiveFrom { get; set; }
    }

    private async Task RecordChangeAsync
    (
        string code
    )
    {
        var current =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        // Missing switch = applicable, nothing to record
        if (current == null)
        {
            return;
        }

        bool state =
            current.IsEnabled;

        // Last row with the opposite state (0 = none)
        long lastOpposite =
            await _context.Database
                .SqlQuery<long>(
                    $@"SELECT COALESCE(MAX(""VatApplicabilityHistoryId""), 0) AS ""Value""
                       FROM ""VatApplicabilityHistory""
                       WHERE ""ConfigurationCode"" = {code}
                         AND ""IsApplicable"" <> {state}")
                .FirstAsync();

        List<RunRow> run =
            await _context.Database
                .SqlQuery<RunRow>(
                    $@"SELECT ""VatApplicabilityHistoryId"", ""EffectiveFrom""
                       FROM ""VatApplicabilityHistory""
                       WHERE ""ConfigurationCode"" = {code}
                         AND ""VatApplicabilityHistoryId"" > {lastOpposite}")
                .OrderBy(x => x.VatApplicabilityHistoryId)
                .ToListAsync();

        DateOnly? typed =
            ParseDate(current.Value);

        // Never changed and still ON with no date : nothing to record
        if (lastOpposite == 0 && run.Count == 0 && state && typed == null)
        {
            return;
        }

        DateOnly effective =
            typed
            ??
            (run.Count > 0 ? run[0].EffectiveFrom : Today());

        // Already exactly one row with this state and date
        if (run.Count == 1 && run[0].EffectiveFrom == effective)
        {
            return;
        }

        DateTime now =
            DateTime.UtcNow;

        // Own transaction only when the caller has none
        await using var transaction =
            _context.Database.CurrentTransaction == null
                ? await _context.Database.BeginTransactionAsync()
                : null;

        if (run.Count > 0)
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $@"DELETE FROM ""VatApplicabilityHistory""
                   WHERE ""ConfigurationCode"" = {code}
                     AND ""VatApplicabilityHistoryId"" > {lastOpposite}");
        }

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"INSERT INTO ""VatApplicabilityHistory""
                   (""ConfigurationCode"", ""IsApplicable"", ""EffectiveFrom"", ""RecordedDate"", ""SwitchValue"")
               VALUES ({code}, {state}, {effective}, {now}, {current.Value ?? string.Empty})");

        if (transaction != null)
        {
            await transaction.CommitAsync();
        }
    }


    private static DateOnly? ParseDate
    (
        string? text
    )
    {
        return DateOnly.TryParseExact(
                (text ?? string.Empty).Trim(),
                DateFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date)
            ? date
            : null;
    }


    private static DateOnly Today()
    {
        TimeZoneInfo zone;

        try
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Dhaka");
        }
        catch (Exception)
        {
            try
            {
                zone = TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time");
            }
            catch (Exception)
            {
                zone = TimeZoneInfo.Local;
            }
        }

        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                zone));
    }
}