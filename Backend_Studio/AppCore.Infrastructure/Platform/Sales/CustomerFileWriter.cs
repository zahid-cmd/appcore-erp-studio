//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.RegistrationManagement.CustomerFile;
using AppCore.Application.RegistrationManagement.RegistrationControl;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.RegistrationManagement.CustomerFile;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Sales;


//===============================================================
// Customer File Writer (2026-11-11) : Sales Invoices - MB
//
//   Posting an MB invoice creates one Customer File per chassis
//   (owner 2026-11-11 : every posted sale, dues or not) :
//     Customer File No  <invoice no>/<n>, n = the bike's place
//                       among the invoice's bike lines (1, 2, ...)
//     Source Invoice; file date = invoice date; branch, salesman,
//     customer (original = current owner), chassis, engine,
//     Fuel / Electric (the model's specification), year, CKD
//     Registration By : Customer (owner 2026-11-11)
//     Status Open
//   Cancelling the posted invoice cancels its files; refused when
//   a file has moved on (name transfer, Ready / Delivered, a fee).
//   Backfill of older invoices : CustomerFiles_FromSales_Backfill.sql
//===============================================================

public static class CustomerFileWriter
{
    private const string HistoryModule = "Registration Management";

    private const string HistoryEntity = "CustomerFile";

    public const string RegistrationByDefault = "Customer";


    public static async Task
        CreateForInvoiceAsync
        (
            AppDbContext context,
            SalesInvoiceHeader header,
            IEnumerable<SalesInvoiceLine> lines,
            long userId,
            DateTime now
        )
    {
        List<(SalesInvoiceLine Line, IMotorBikeSaleLine Bike)> bikes =
            lines
                .Where(x => x is IMotorBikeSaleLine b && (b.MotorBikeUnitId ?? 0) > 0)
                .OrderBy(x => x.LineNo)
                .ThenBy(x => x.SalesInvoiceLineId)
                .Select(x => (x, (IMotorBikeSaleLine)x))
                .ToList();

        if (bikes.Count == 0)
        {
            return;
        }

        // Fuel / Electric of each product : its model's specification
        List<long> productIds =
            bikes.Select(x => x.Line.ProductId).Distinct().ToList();

        var specs =
            await
            (
                from b in context.Set<MotorBikes>().AsNoTracking()
                where productIds.Contains(b.MotorBikeId)
                join s in context.Set<ProductSubCategory>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId
                join p in context.Set<MotorBikeSpecifications>().AsNoTracking()
                    on s.BikeModelId equals (long?)p.BikeModelId
                where !p.IsDeleted
                select new { b.MotorBikeId, p.FuelType }
            )
            .ToListAsync();

        List<CustomerFiles> created = new();

        for (int n = 0; n < bikes.Count; n++)
        {
            (SalesInvoiceLine line, IMotorBikeSaleLine bike) = bikes[n];

            string fileNo = $"{header.InvoiceNo}/{n + 1}";

            string chassis = (bike.ChassisNo ?? string.Empty).Trim();

            string upper = chassis.ToUpperInvariant();

            // Posted again after a failure : the file is there already
            if (await context.Set<CustomerFiles>().AnyAsync(x => !x.IsDeleted && x.CustomerFileNo == fileNo))
            {
                continue;
            }

            CustomerFiles? same =
                await context.Set<CustomerFiles>().AsNoTracking()
                    .FirstOrDefaultAsync(
                        x => !x.IsDeleted
                             && x.Status != CustomerFileStatuses.Cancelled
                             && x.ChassisNo.ToUpper() == upper);

            if (same != null)
            {
                throw new InvalidOperationException(
                    $"Chassis {chassis} already has the customer file {same.CustomerFileNo} : cancel that file first.");
            }

            string power =
                RegistrationVehiclePowers.OfFuelType(
                    specs.FirstOrDefault(x => x.MotorBikeId == line.ProductId)?.FuelType);

            CustomerFiles file =
                new()
                {
                    CustomerFileNo = fileNo,
                    Source = CustomerFileSources.Invoice,
                    FileDate = header.InvoiceDate,
                    BranchId = header.BranchId,
                    SalesInvoiceId = header.SalesInvoiceId,
                    SalesInvoiceNo = header.InvoiceNo,
                    SalesInvoiceDate = header.InvoiceDate,
                    SalesmanName = header.SalesPersonName ?? string.Empty,
                    MotorBikeId = line.ProductId,
                    ChassisNo = chassis,
                    EngineNo = (bike.EngineNo ?? string.Empty).Trim(),
                    VehiclePower = power,
                    OriginalCustomerId = header.CustomerId,
                    CurrentCustomerId = header.CustomerId,
                    RegistrationBy = RegistrationByDefault,
                    RegistrationFileNo = string.Empty,
                    TransferCount = 0,
                    CkdStatus = string.IsNullOrWhiteSpace(bike.CkdStatus) ? "No" : bike.CkdStatus,
                    ManufactureYear = bike.ManufactureYear,
                    Status = CustomerFileStatuses.Open,
                    Remarks = string.Empty,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            context.Set<CustomerFiles>().Add(file);

            created.Add(file);
        }

        if (created.Count == 0)
        {
            return;
        }

        await context.SaveChangesAsync();

        foreach (CustomerFiles file in created)
        {
            AddHistory(context, file.CustomerFileId, "Create", "Invoice File Created",
                $"{file.CustomerFileNo} : posted Sales Invoice - MB {header.InvoiceNo}, chassis {file.ChassisNo}, engine {file.EngineNo} ({file.VehiclePower}), customer {header.CustomerName} ({header.CustomerCode}), registration by {file.RegistrationBy}.",
                userId, now);
        }
    }


    // Cancel of a posted MB invoice : its files cancelled.
    // chassisNo (Sales Returns - MB) : only that chassis's file.
    public static async Task
        CancelForInvoiceAsync
        (
            AppDbContext context,
            long salesInvoiceId,
            string invoiceNo,
            long userId,
            DateTime now,
            string? chassisNo = null
        )
    {
        string chassis = (chassisNo ?? string.Empty).Trim();

        bool returning = chassisNo != null;

        List<CustomerFiles> files =
            await context.Set<CustomerFiles>()
                .Where(x => !x.IsDeleted
                            && x.Source == CustomerFileSources.Invoice
                            && x.SalesInvoiceId == salesInvoiceId
                            && x.Status != CustomerFileStatuses.Cancelled
                            && (!returning || x.ChassisNo == chassis))
                .ToListAsync();

        if (files.Count == 0)
        {
            return;
        }

        List<long> ids = files.Select(x => x.CustomerFileId).ToList();

        bool hasFees =
            await context.Set<CustomerFileFees>()
                .AnyAsync(x => ids.Contains(x.CustomerFileId) && !x.IsDeleted && x.Status != CustomerFileFeeStatuses.Cancelled);

        foreach (CustomerFiles file in files)
        {
            if (file.TransferCount > 0 || file.Status != CustomerFileStatuses.Open)
            {
                throw new InvalidOperationException(
                    $"The customer file {file.CustomerFileNo} has moved on ({(file.TransferCount > 0 ? "name transferred" : file.Status)}) : the {(returning ? "bike cannot be returned" : "invoice cannot be cancelled")}.");
            }
        }

        if (hasFees)
        {
            throw new InvalidOperationException(
                "A customer file of this invoice has fees : cancel them on Customer Files first.");
        }

        foreach (CustomerFiles file in files)
        {
            file.Status = CustomerFileStatuses.Cancelled;
            file.ModifiedBy = userId;
            file.ModifiedDate = now;

            AddHistory(context, file.CustomerFileId, "Cancel", "Invoice File Cancelled",
                returning
                    ? $"{file.CustomerFileNo} : chassis {file.ChassisNo} returned on Sales Invoice - MB {invoiceNo} (Sales Returns - MB)."
                    : $"{file.CustomerFileNo} : Sales Invoice - MB {invoiceNo} was cancelled.",
                userId, now);
        }
    }


    private static void AddHistory
    (
        AppDbContext context,
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
                EntityName = HistoryEntity,
                EntityId = entityId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }
}
