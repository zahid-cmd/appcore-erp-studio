//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;
using AppCore.Domain.Entities.Procurement.Shared;
using AppCore.Infrastructure.Persistence;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Purchase Receiving Mirror (2026-11-10)
// --------------------------------------------------------------
// A purchase whose stock is received with it (Products Received
// on Purchase ON) still gets its receiving document on Product
// Receiving (RCMB / RCSP / RCAC), so every stock-in shows there :
//
//   - made when the purchase is posted, dated on the purchase
//     date, its lines = the purchase's batches (all received)
//   - ReceivedOn = "Purchase" : read only on the receiving page
//     (no cancel there); it moves no stock of its own (the
//     purchase posted the stock on hand)
//   - MB : the purchase's bikes point at it (ReceivingId)
//   - cancelled with the purchase
//===============================================================

public static class PurchaseReceivingMirror
{
    public const string ReceivedOnPurchase = "Purchase";

    private const string StatusPosted = "Posted";

    private const string StatusCancelled = "Cancelled";


    //===========================================================
    // Make it (inside the purchase's Post transaction)
    //===========================================================

    public static Task CreateAsync
    (
        AppDbContext context,
        IVoucherNumberService numbers,
        PurchaseHeader purchase,
        IReadOnlyList<(PurchaseLine Line, StockBatchesEntity Batch)> lines,
        long userId,
        DateTime now
    )
    {
        return purchase.PageType switch
        {
            "MB" => CreateAsync<MotorBikeReceiving, MotorBikeReceivingLines>(context, numbers, purchase, lines, userId, now),
            "SP" => CreateAsync<SparePartsLubricantsReceiving, SparePartsLubricantsReceivingLines>(context, numbers, purchase, lines, userId, now),
            "AC" => CreateAsync<AccessoriesReceiving, AccessoriesReceivingLines>(context, numbers, purchase, lines, userId, now),
            _ => Task.CompletedTask
        };
    }


    //===========================================================
    // Cancel it with its purchase
    //===========================================================

    public static Task CancelAsync
    (
        AppDbContext context,
        PurchaseHeader purchase,
        string reason,
        long userId,
        DateTime now
    )
    {
        return purchase.PageType switch
        {
            "MB" => CancelAsync<MotorBikeReceiving>(context, purchase, reason, userId, now),
            "SP" => CancelAsync<SparePartsLubricantsReceiving>(context, purchase, reason, userId, now),
            "AC" => CancelAsync<AccessoriesReceiving>(context, purchase, reason, userId, now),
            _ => Task.CompletedTask
        };
    }


    private static async Task CreateAsync<THeader, TLine>
    (
        AppDbContext context,
        IVoucherNumberService numbers,
        PurchaseHeader purchase,
        IReadOnlyList<(PurchaseLine Line, StockBatchesEntity Batch)> lines,
        long userId,
        DateTime now
    )
        where THeader : ReceivingHeader, new()
        where TLine : ReceivingLine, new()
    {
        if (lines.Count == 0 || !purchase.WarehouseId.HasValue)
        {
            return;
        }

        // Once per purchase
        bool exists =
            await context
                .Set<THeader>()
                .AnyAsync(x => x.PurchaseId == purchase.PurchaseId && x.ReceivedOn == ReceivedOnPurchase && !x.IsDeleted);

        if (exists)
        {
            return;
        }

        VoucherNumberDto number =
            await numbers.NextAsync(
                "RC" + purchase.PageType,
                purchase.BranchId,
                purchase.PurchaseDate);

        THeader header =
            new THeader
            {
                PageType = purchase.PageType,
                ReceivingNo = number.VoucherNo,
                ReceivingDate = purchase.PurchaseDate,
                BranchId = purchase.BranchId,
                BranchCode = purchase.BranchCode,
                BranchName = purchase.BranchName,
                FinancialYearId = purchase.FinancialYearId,
                WarehouseId = purchase.WarehouseId.Value,
                WarehouseName = Limit(purchase.WarehouseName, 150),
                PurchaseId = purchase.PurchaseId,
                PurchaseNo = purchase.PurchaseNo,
                PurchaseDate = purchase.PurchaseDate,
                SupplierCode = purchase.SupplierCode,
                SupplierName = Limit(purchase.SupplierName, 200),
                SupplierInvoiceNo = purchase.SupplierInvoiceNo,
                MushakNo = purchase.MushakNo,
                DoReference = purchase.DoReference,
                GatePassNo = purchase.GatePassNo,
                ReceivedBy = string.Empty,
                Remarks = Limit($"Received with purchase {purchase.PurchaseNo}", 500),
                ReceivedOn = ReceivedOnPurchase,
                TotalQuantity = lines.Sum(x => x.Batch.Quantity),
                Status = StatusPosted,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        context.Set<THeader>().Add(header);

        await context.SaveChangesAsync();

        int lineNo = 0;

        foreach ((PurchaseLine line, StockBatchesEntity batch) in lines.OrderBy(x => x.Line.LineNo))
        {
            context.Set<TLine>().Add(
                new TLine
                {
                    ReceivingId = header.ReceivingId,
                    LineNo = ++lineNo,
                    PurchaseLineId = line.PurchaseLineId,
                    StockBatchId = batch.StockBatchId,
                    BatchNo = Limit(batch.BatchNo, 50),
                    ProductType = purchase.PageType,
                    ProductId = line.ProductId,
                    ProductCode = line.ProductCode,
                    ProductName = Limit(line.ProductName, 200),
                    Unit = Limit(line.Unit, 30),
                    PurchasedQuantity = batch.Quantity,
                    ReceivedBefore = 0m,
                    Quantity = batch.Quantity,
                    UnitCost = batch.UnitCost,
                    RackManagementId = null,
                    RackCode = string.Empty,
                    ShelfNumber = 0,
                    BinNumber = 0,
                    ShortNotes = string.Empty
                });
        }

        // MB : the bikes came in on it
        if (purchase.PageType == "MB")
        {
            List<MotorBikeUnitsEntity> units =
                await context
                    .Set<MotorBikeUnitsEntity>()
                    .Where(x => x.PurchaseId == purchase.PurchaseId && !x.IsDeleted && x.ReceivingId == null)
                    .ToListAsync();

            foreach (MotorBikeUnitsEntity unit in units)
            {
                unit.ReceivingId = header.ReceivingId;
            }
        }

        await context.SaveChangesAsync();
    }


    private static async Task CancelAsync<THeader>
    (
        AppDbContext context,
        PurchaseHeader purchase,
        string reason,
        long userId,
        DateTime now
    )
        where THeader : ReceivingHeader
    {
        List<THeader> rows =
            await context
                .Set<THeader>()
                .Where
                (
                    x =>
                        x.PurchaseId == purchase.PurchaseId
                        &&
                        x.ReceivedOn == ReceivedOnPurchase
                        &&
                        x.Status == StatusPosted
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        foreach (THeader row in rows)
        {
            row.Status = StatusCancelled;
            row.CancelReason = Limit($"Purchase {purchase.PurchaseNo} cancelled : {reason}", 500);
            row.CancelledBy = userId;
            row.CancelledDate = now;
            row.ModifiedBy = userId;
            row.ModifiedDate = now;
        }
    }


    private static string Limit
    (
        string? value,
        int length
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length > length
            ? text[..length]
            : text;
    }
}
