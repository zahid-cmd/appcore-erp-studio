//===============================================================
// Namespaces
//===============================================================

using System.Data.Common;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using FinancialYearsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Voucher Number Service
//
// RV-010101-2627-10-00001
//   RV     : voucher type prefix
//   010101 : digits of the branch code (BRN-01-01-01)
//   2627   : financial year (start / end year, 2 digits each)
//   10     : calendar month of the voucher date
//   00001  : sequence, restarts every month per prefix + branch
//===============================================================

public class VoucherNumberService : IVoucherNumberService
{
    //===========================================================
    // Constants
    //===========================================================

    private const string OpenYearStatus =
        "Open";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public VoucherNumberService(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Resolve Period
    //===========================================================

    public async Task<VoucherPeriodDto>
        ResolvePeriodAsync
        (
            long branchId,
            DateOnly voucherDate
        )
    {
        //=======================================================
        // Branch
        //=======================================================

        if (branchId <= 0)
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        BranchesEntity? branch =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BranchId == branchId
                        &&
                        !x.IsDeleted
                );

        if (branch == null)
        {
            throw new InvalidOperationException(
                "The selected branch was not found.");
        }

        if (!branch.IsActive)
        {
            throw new InvalidOperationException(
                $"Branch '{branch.BranchName}' is inactive.");
        }

        string branchDigits =
            new string(
                (branch.BranchCode ?? string.Empty)
                    .Where(char.IsDigit)
                    .ToArray());

        if (string.IsNullOrWhiteSpace(branchDigits))
        {
            throw new InvalidOperationException(
                $"Branch code '{branch.BranchCode}' has no digits for the voucher number.");
        }

        //=======================================================
        // Financial Year (must cover the date and be Open)
        //=======================================================

        if (voucherDate == default)
        {
            throw new InvalidOperationException(
                "Voucher date is required.");
        }

        List<FinancialYearsEntity> years =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.StartDate <= voucherDate
                        &&
                        x.EndDate >= voucherDate
                )
                .ToListAsync();

        if (years.Count == 0)
        {
            throw new InvalidOperationException(
                $"No financial year covers {voucherDate:dd-MMM-yyyy}. Create it on the Financial Years page first.");
        }

        if (years.Count > 1)
        {
            throw new InvalidOperationException(
                $"More than one financial year covers {voucherDate:dd-MMM-yyyy}. Fix the overlapping years first.");
        }

        FinancialYearsEntity year =
            years[0];

        if (!year.Status)
        {
            throw new InvalidOperationException(
                $"{year.FinancialYearName} is inactive.");
        }

        if (!string.Equals(
                (year.YearStatus ?? string.Empty).Trim(),
                OpenYearStatus,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"{year.FinancialYearName} is {year.YearStatus}. Vouchers can only be entered in an Open financial year.");
        }

        string yearCode =
            $"{year.StartDate.Year % 100:D2}{year.EndDate.Year % 100:D2}";

        return new VoucherPeriodDto
        {
            BranchId = branch.BranchId,

            BranchCode = branch.BranchCode ?? string.Empty,

            BranchName = branch.BranchName ?? string.Empty,

            BranchDigits = branchDigits,

            FinancialYearId = year.FinancialYearId,

            FinancialYearName = year.FinancialYearName ?? string.Empty,

            FinancialYearCode = yearCode,

            PeriodMonth = voucherDate.Month,

            VoucherDate = voucherDate
        };
    }


    //===========================================================
    // Next Number
    //
    // One atomic INSERT ... ON CONFLICT ... RETURNING : two users
    // saving at the same moment never get the same number. Runs
    // in the caller's transaction (if any), so a rolled-back save
    // gives the number back.
    //===========================================================

    public async Task<VoucherNumberDto>
        NextAsync
        (
            string prefix,
            long branchId,
            DateOnly voucherDate
        )
    {
        string type =
            (prefix ?? string.Empty).Trim().ToUpperInvariant();

        if (!VoucherTypes.IsValid(type))
        {
            throw new InvalidOperationException(
                $"Unknown voucher type '{prefix}'.");
        }

        // The number must be taken in the same transaction that
        // saves the voucher, so a failed save gives it back.
        if (_context.Database.CurrentTransaction == null)
        {
            throw new InvalidOperationException(
                "A voucher number can only be taken inside the transaction that saves the voucher.");
        }

        VoucherPeriodDto period =
            await ResolvePeriodAsync(
                branchId,
                voucherDate);

        int sequence =
            await TakeSequenceAsync(
                type,
                period.BranchDigits,
                period.FinancialYearCode,
                period.PeriodMonth);

        if (sequence > 99999)
        {
            throw new InvalidOperationException(
                $"{type} numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999).");
        }

        return new VoucherNumberDto
        {
            BranchId = period.BranchId,

            BranchCode = period.BranchCode,

            BranchName = period.BranchName,

            BranchDigits = period.BranchDigits,

            FinancialYearId = period.FinancialYearId,

            FinancialYearName = period.FinancialYearName,

            FinancialYearCode = period.FinancialYearCode,

            PeriodMonth = period.PeriodMonth,

            VoucherDate = period.VoucherDate,

            Prefix = type,

            Sequence = sequence,

            VoucherNo =
                CodeGenerator.GenerateVoucherNo(
                    type,
                    period.BranchDigits,
                    period.FinancialYearCode,
                    period.PeriodMonth,
                    sequence)
        };
    }


    //===========================================================
    // Peek (preview, nothing reserved)
    //===========================================================

    public async Task<VoucherNumberDto>
        PeekAsync
        (
            string prefix,
            long branchId,
            DateOnly voucherDate
        )
    {
        string type =
            (prefix ?? string.Empty).Trim().ToUpperInvariant();

        if (!VoucherTypes.IsValid(type))
        {
            throw new InvalidOperationException(
                $"Unknown voucher type '{prefix}'.");
        }

        VoucherPeriodDto period =
            await ResolvePeriodAsync(
                branchId,
                voucherDate);

        int lastNumber =
            await _context
                .Set<VoucherSequences>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.Prefix == type
                        &&
                        x.BranchDigits == period.BranchDigits
                        &&
                        x.FinancialYearCode == period.FinancialYearCode
                        &&
                        x.PeriodMonth == period.PeriodMonth
                )
                .Select(x => x.LastNumber)
                .FirstOrDefaultAsync();

        if (lastNumber >= 99999)
        {
            throw new InvalidOperationException(
                $"{type} numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999).");
        }

        int sequence =
            lastNumber + 1;

        return new VoucherNumberDto
        {
            BranchId = period.BranchId,

            BranchCode = period.BranchCode,

            BranchName = period.BranchName,

            BranchDigits = period.BranchDigits,

            FinancialYearId = period.FinancialYearId,

            FinancialYearName = period.FinancialYearName,

            FinancialYearCode = period.FinancialYearCode,

            PeriodMonth = period.PeriodMonth,

            VoucherDate = period.VoucherDate,

            Prefix = type,

            Sequence = sequence,

            VoucherNo =
                CodeGenerator.GenerateVoucherNo(
                    type,
                    period.BranchDigits,
                    period.FinancialYearCode,
                    period.PeriodMonth,
                    sequence)
        };
    }


    //===========================================================
    // Take Sequence (atomic upsert)
    //===========================================================

    private async Task<int>
        TakeSequenceAsync
        (
            string prefix,
            string branchDigits,
            string financialYearCode,
            int periodMonth
        )
    {
        const string sql =
            "INSERT INTO \"VoucherSequences\" " +
            "(\"Prefix\", \"BranchDigits\", \"FinancialYearCode\", \"PeriodMonth\", \"LastNumber\", \"ModifiedDate\") " +
            "VALUES (@prefix, @branchDigits, @yearCode, @periodMonth, 1, now()) " +
            "ON CONFLICT (\"Prefix\", \"BranchDigits\", \"FinancialYearCode\", \"PeriodMonth\") " +
            "DO UPDATE SET " +
            "\"LastNumber\" = \"VoucherSequences\".\"LastNumber\" + 1, " +
            "\"ModifiedDate\" = now() " +
            "RETURNING \"LastNumber\";";

        // Opened through EF so EF keeps track of it (a no-op when
        // the caller's transaction already holds it open)
        await _context.Database.OpenConnectionAsync();

        DbConnection connection =
            _context.Database.GetDbConnection();

        try
        {
            await using DbCommand command =
                connection.CreateCommand();

            command.CommandText =
                sql;

            command.Transaction =
                _context.Database.CurrentTransaction?.GetDbTransaction();

            AddParameter(command, "prefix", prefix);

            AddParameter(command, "branchDigits", branchDigits);

            AddParameter(command, "yearCode", financialYearCode);

            AddParameter(command, "periodMonth", periodMonth);

            object? result =
                await command.ExecuteScalarAsync();

            return Convert.ToInt32(result);
        }
        finally
        {
            await _context.Database.CloseConnectionAsync();
        }
    }


    private static void AddParameter
    (
        DbCommand command,
        string name,
        object value
    )
    {
        DbParameter parameter =
            command.CreateParameter();

        parameter.ParameterName =
            name;

        parameter.Value =
            value;

        command.Parameters.Add(parameter);
    }
}