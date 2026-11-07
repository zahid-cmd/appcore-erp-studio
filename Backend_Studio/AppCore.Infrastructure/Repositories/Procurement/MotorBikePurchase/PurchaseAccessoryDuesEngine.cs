//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Procurement.MotorBikePurchase;
using AppCore.Domain.Entities.Procurement.Shared;
using AppCore.Infrastructure.Persistence;

using SchemesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemes;

using SchemeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeModels;

using SchemeItemsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeItems;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.MotorBikePurchase;


//===============================================================
// Accessories due from the supplier on MB Purchases
//
// Post      : MB Purchase posting works out the due rows from
//             the Supplier Bike Accessory Schemes valid on the
//             purchase date : bikes (paid + free) of the scheme's
//             models × quantity per bike. Fixed after that.
// Cancel    : a purchase cancel cancels its due rows (refused
//             when some accessories were received).
// Receive   : Motor Bike Receiving takes up to the pending
//             quantity; each row received gets its own Accessories
//             batch at zero cost, on hand in the receiving's
//             warehouse (no voucher).
// Reverse   : a receiving cancel takes them back while the whole
//             quantity is still on hand there.
// Close Due : the rest of a row is written off (reason kept).
//===============================================================

public static class PurchaseAccessoryDuesEngine
{
    public const string StatusPending = "Pending";

    public const string StatusReceived = "Received";

    public const string StatusClosed = "Closed";

    public const string StatusCancelled = "Cancelled";

    private const string SourceSupplier = "Supplier";

    // Batch source of a received accessory
    public const string SourceScheme = "AccessoryScheme";

    private const string ProductTypeAccessories = "AC";

    private const string BucketOnHand = "OnHand";

    private const string BatchOnHand = "OnHand";

    private const string BatchClosed = "Closed";

    private const string MoveReceive = "Receive";

    private const string MoveReceiveCancel = "ReceiveCancel";


    private static string Limit(string? value, int max)
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= max ? text : text[..max];
    }


    private static string Qty(decimal value) =>
        value.ToString("0.##");


    private static decimal Pending(PurchaseAccessoryDues x) =>
        Math.Max(0m, x.QuantityDue - x.QuantityReceived - x.QuantityClosed);


    private static string StatusOf(PurchaseAccessoryDues x) =>
        Pending(x) > 0m
            ? StatusPending
            : x.QuantityClosed > 0m
                ? StatusClosed
                : StatusReceived;


    //===========================================================
    // Post : due rows of a posted MB purchase (once)
    //===========================================================

    public static async Task CreateForPurchaseAsync
    (
        AppDbContext context,
        PurchaseHeader purchase,
        IEnumerable<PurchaseLine> lines,
        long userId,
        DateTime now
    )
    {
        bool exists =
            await context
                .Set<PurchaseAccessoryDues>()
                .AnyAsync(x => x.PurchaseId == purchase.PurchaseId);

        if (exists)
        {
            return;
        }

        // Bikes (paid + free) per product
        Dictionary<long, decimal> bikesOfProduct =
            lines
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity + x.FreeQuantity));

        List<long> productIds =
            bikesOfProduct.Keys.ToList();

        if (productIds.Count == 0)
        {
            return;
        }

        // Product -> bike model (its sub category's model)
        var productModels =
            await
            (
                from b in context.Set<MotorBikesEntity>().AsNoTracking()
                where productIds.Contains(b.MotorBikeId)
                join s in context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId
                where s.BikeModelId != null
                select new { b.MotorBikeId, BikeModelId = s.BikeModelId!.Value }
            )
            .ToListAsync();

        Dictionary<long, decimal> bikesOfModel =
            productModels
                .GroupBy(x => x.BikeModelId)
                .ToDictionary(g => g.Key, g => g.Sum(x => bikesOfProduct.GetValueOrDefault(x.MotorBikeId)));

        List<long> modelIds =
            bikesOfModel.Keys.ToList();

        if (modelIds.Count == 0)
        {
            return;
        }

        DateOnly date =
            purchase.PurchaseDate;

        // Supplier schemes valid on the purchase date covering
        // these models
        var schemeModels =
            await
            (
                from s in context.Set<SchemesEntity>().AsNoTracking()
                where !s.IsDeleted
                      && s.Status
                      && s.SchemeSource == SourceSupplier
                      && s.ValidFrom <= date
                      && (s.ValidTo == null || s.ValidTo >= date)
                join m in context.Set<SchemeModelsEntity>().AsNoTracking()
                    on s.BikeAccessorySchemeId equals m.BikeAccessorySchemeId
                where modelIds.Contains(m.BikeModelId)
                select new
                {
                    s.BikeAccessorySchemeId,
                    s.SchemeCode,
                    s.SchemeName,
                    s.SchemeKind,
                    m.BikeModelId
                }
            )
            .ToListAsync();

        if (schemeModels.Count == 0)
        {
            return;
        }

        List<long> schemeIds =
            schemeModels.Select(x => x.BikeAccessorySchemeId).Distinct().ToList();

        var items =
            await
            (
                from i in context.Set<SchemeItemsEntity>().AsNoTracking()
                where schemeIds.Contains(i.BikeAccessorySchemeId)
                join a in context.Set<AccessoriesEntity>().AsNoTracking()
                    on i.AccessoryId equals a.AccessoryId
                orderby i.BikeAccessorySchemeId, i.LineNo
                select new
                {
                    i.BikeAccessorySchemeId,
                    i.AccessoryId,
                    i.QuantityPerBike,
                    a.ProductCode,
                    a.AccessoryName,
                    a.Unit
                }
            )
            .ToListAsync();

        foreach (long schemeId in schemeIds)
        {
            var scheme =
                schemeModels.First(x => x.BikeAccessorySchemeId == schemeId);

            decimal bikes =
                schemeModels
                    .Where(x => x.BikeAccessorySchemeId == schemeId)
                    .Select(x => x.BikeModelId)
                    .Distinct()
                    .Sum(x => bikesOfModel.GetValueOrDefault(x));

            if (bikes <= 0m)
            {
                continue;
            }

            foreach (var item in items.Where(x => x.BikeAccessorySchemeId == schemeId))
            {
                context.Set<PurchaseAccessoryDues>().Add(
                    new PurchaseAccessoryDues
                    {
                        PurchaseId = purchase.PurchaseId,
                        PurchaseNo = Limit(purchase.PurchaseNo, 50),
                        PurchaseDate = purchase.PurchaseDate,
                        BranchId = purchase.BranchId,
                        SupplierCode = Limit(purchase.SupplierCode, 50),
                        SupplierName = Limit(purchase.SupplierName, 200),
                        BikeAccessorySchemeId = schemeId,
                        SchemeCode = Limit(scheme.SchemeCode, 30),
                        SchemeName = Limit(scheme.SchemeName, 150),
                        SchemeKind = Limit(scheme.SchemeKind, 20),
                        AccessoryId = item.AccessoryId,
                        ProductCode = Limit(item.ProductCode, 50),
                        AccessoryName = Limit(item.AccessoryName, 200),
                        Unit = Limit(item.Unit, 30),
                        BikeQuantity = bikes,
                        QuantityDue = bikes * item.QuantityPerBike,
                        QuantityReceived = 0m,
                        QuantityClosed = 0m,
                        CloseReason = string.Empty,
                        Status = StatusPending,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
        }
    }


    //===========================================================
    // Purchase cancel : its due rows are cancelled
    //===========================================================

    public static async Task CancelForPurchaseAsync
    (
        AppDbContext context,
        long purchaseId,
        string purchaseNo,
        long userId,
        DateTime now
    )
    {
        List<PurchaseAccessoryDues> rows =
            await context
                .Set<PurchaseAccessoryDues>()
                .Where(x => x.PurchaseId == purchaseId && x.Status != StatusCancelled)
                .ToListAsync();

        if (rows.Any(x => x.QuantityReceived > 0m))
        {
            throw new InvalidOperationException(
                $"Free accessories of purchase {purchaseNo} were received on Motor Bike Receiving; cancel that receiving first.");
        }

        foreach (PurchaseAccessoryDues row in rows)
        {
            row.Status = StatusCancelled;
            row.ModifiedBy = userId;
            row.ModifiedDate = now;
        }
    }


    //===========================================================
    // Receiving : purchases of the branch with accessories pending
    //===========================================================

    public static async Task<List<long>> PurchasesWithPendingAsync
    (
        AppDbContext context,
        long branchId
    )
    {
        return await context
            .Set<PurchaseAccessoryDues>()
            .AsNoTracking()
            .Where
            (
                x =>
                    x.Status == StatusPending
                    &&
                    x.QuantityDue - x.QuantityReceived - x.QuantityClosed > 0
                    &&
                    (branchId <= 0 || x.BranchId == branchId)
            )
            .Select(x => x.PurchaseId)
            .Distinct()
            .ToListAsync();
    }


    // The purchase's due rows (pending ones only when asked)
    public static async Task<List<ReceivingAccessoryDueDto>> DuesOfPurchaseAsync
    (
        AppDbContext context,
        long purchaseId,
        bool pendingOnly
    )
    {
        List<PurchaseAccessoryDues> rows =
            await context
                .Set<PurchaseAccessoryDues>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == purchaseId && x.Status != StatusCancelled)
                .OrderBy(x => x.SchemeCode)
                .ThenBy(x => x.AccessoryName)
                .ToListAsync();

        return rows
            .Where(x => !pendingOnly || Pending(x) > 0m)
            .Select
            (
                x =>
                    new ReceivingAccessoryDueDto
                    {
                        PurchaseAccessoryDueId = x.PurchaseAccessoryDueId,
                        SchemeCode = x.SchemeCode,
                        SchemeName = x.SchemeName,
                        SchemeKind = x.SchemeKind,
                        AccessoryId = x.AccessoryId,
                        ProductCode = x.ProductCode,
                        AccessoryName = x.AccessoryName,
                        Unit = x.Unit,
                        QuantityDue = x.QuantityDue,
                        ReceivedBefore = x.QuantityReceived,
                        QuantityClosed = x.QuantityClosed,
                        PendingQuantity = Pending(x)
                    }
            )
            .ToList();
    }


    //===========================================================
    // Receive : zero-cost batches, on hand in the warehouse.
    // Runs inside the receiving's transaction; returns the
    // quantity received.
    //===========================================================

    public static async Task<decimal> ReceiveAsync
    (
        AppDbContext context,
        long purchaseId,
        long branchId,
        string supplierCode,
        long receivingId,
        string receivingNo,
        DateOnly receivingDate,
        long warehouseId,
        string warehouseName,
        string documentType,
        List<CreateReceivingAccessoryDto> inputs,
        long userId,
        DateTime now
    )
    {
        List<CreateReceivingAccessoryDto> wanted =
            (inputs ?? new List<CreateReceivingAccessoryDto>())
                .Where(x => x.Quantity > 0m)
                .ToList();

        if (wanted.Count == 0)
        {
            return 0m;
        }

        if (wanted.GroupBy(x => x.PurchaseAccessoryDueId).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException(
                "An accessory is on the receiving twice.");
        }

        await context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"PurchaseAccessoryDues\" WHERE \"PurchaseId\" = {0} FOR UPDATE",
            purchaseId);

        List<long> dueIds =
            wanted.Select(x => x.PurchaseAccessoryDueId).ToList();

        Dictionary<long, PurchaseAccessoryDues> dues =
            await context
                .Set<PurchaseAccessoryDues>()
                .Where(x => dueIds.Contains(x.PurchaseAccessoryDueId) && x.PurchaseId == purchaseId)
                .ToDictionaryAsync(x => x.PurchaseAccessoryDueId);

        List<long> accessoryIds =
            dues.Values.Select(x => x.AccessoryId).Distinct().ToList();

        Dictionary<long, string> ledgers =
            await context
                .Set<AccessoriesEntity>()
                .AsNoTracking()
                .Where(x => accessoryIds.Contains(x.AccessoryId))
                .ToDictionaryAsync(x => x.AccessoryId, x => x.InventoryLedgerCode ?? string.Empty);

        List<(PurchaseAccessoryReceipts Receipt, StockBatchesEntity Batch)> made =
            new();

        int lineNo = 0;

        foreach (CreateReceivingAccessoryDto input in wanted)
        {
            if (!dues.TryGetValue(input.PurchaseAccessoryDueId, out PurchaseAccessoryDues? due)
                || due.Status == StatusCancelled)
            {
                throw new InvalidOperationException(
                    "An accessory is not due on this purchase. Load the purchase again.");
            }

            if (input.Quantity != Math.Truncate(input.Quantity))
            {
                throw new InvalidOperationException(
                    $"{due.AccessoryName} : the quantity must be whole pieces.");
            }

            decimal pending =
                Pending(due);

            if (input.Quantity > pending)
            {
                throw new InvalidOperationException(
                    $"{due.AccessoryName} : only {Qty(pending)} {due.Unit} is still due.");
            }

            due.QuantityReceived += input.Quantity;
            due.Status = StatusOf(due);
            due.ModifiedBy = userId;
            due.ModifiedDate = now;

            string batchNo =
                Limit($"{receivingNo}-A{++lineNo:D2}", 40);

            StockBatchesEntity batch =
                new()
                {
                    BatchNo = batchNo,
                    ProductType = ProductTypeAccessories,
                    ProductId = due.AccessoryId,
                    ProductCode = due.ProductCode,
                    ProductName = Limit(due.AccessoryName, 250),
                    InventoryLedgerCode = ledgers.GetValueOrDefault(due.AccessoryId, string.Empty),
                    SourceType = SourceScheme,
                    SourceId = receivingId,
                    SourceLineId = due.PurchaseAccessoryDueId,
                    SourceNo = receivingNo,
                    SourceDate = receivingDate,
                    SupplierCode = supplierCode,
                    BranchId = branchId,
                    Quantity = input.Quantity,
                    UnitCost = 0m,
                    TotalValue = 0m,
                    QuantityInTransit = 0m,
                    QuantityOnHand = input.Quantity,
                    QuantityOut = 0m,
                    RemainingValue = 0m,
                    Mrp = 0m,
                    SourceVatRate = 0m,
                    SourceVatPerUnit = 0m,
                    Status = BatchOnHand,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            context.Set<StockBatchesEntity>().Add(batch);

            PurchaseAccessoryReceipts receipt =
                new()
                {
                    ReceivingId = receivingId,
                    ReceivingNo = Limit(receivingNo, 50),
                    ReceivingDate = receivingDate,
                    PurchaseAccessoryDueId = due.PurchaseAccessoryDueId,
                    PurchaseId = purchaseId,
                    AccessoryId = due.AccessoryId,
                    ProductCode = due.ProductCode,
                    AccessoryName = due.AccessoryName,
                    Unit = due.Unit,
                    Quantity = input.Quantity,
                    BatchNo = batchNo,
                    WarehouseId = warehouseId,
                    IsCancelled = false,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            made.Add((receipt, batch));
        }

        await context.SaveChangesAsync();

        string narration =
            Limit($"Free accessories received {receivingNo} into {warehouseName}", 300);

        foreach ((PurchaseAccessoryReceipts receipt, StockBatchesEntity batch) in made)
        {
            receipt.StockBatchId = batch.StockBatchId;

            context.Set<PurchaseAccessoryReceipts>().Add(receipt);

            context.Set<StockMovementsEntity>().Add(
                new StockMovementsEntity
                {
                    StockBatchId = batch.StockBatchId,
                    ProductType = ProductTypeAccessories,
                    ProductId = batch.ProductId,
                    BranchId = branchId,
                    WarehouseId = warehouseId,
                    Bucket = BucketOnHand,
                    MovementType = MoveReceive,
                    QuantityIn = receipt.Quantity,
                    QuantityOut = 0m,
                    UnitCost = 0m,
                    Value = 0m,
                    DocumentType = documentType,
                    DocumentId = receivingId,
                    DocumentLineId = receipt.PurchaseAccessoryDueId,
                    DocumentNo = receivingNo,
                    DocumentDate = receivingDate,
                    IsReversal = false,
                    Narration = narration,
                    CreatedBy = userId,
                    CreatedDate = now
                });
        }

        await context.SaveChangesAsync();

        return wanted.Sum(x => x.Quantity);
    }


    //===========================================================
    // Receiving cancel : back off while all of it is still on
    // hand in the warehouse
    //===========================================================

    public static async Task CancelReceivingAsync
    (
        AppDbContext context,
        long receivingId,
        string receivingNo,
        DateOnly receivingDate,
        long branchId,
        long warehouseId,
        string warehouseName,
        string documentType,
        string reason,
        long userId,
        DateTime now
    )
    {
        List<PurchaseAccessoryReceipts> receipts =
            await context
                .Set<PurchaseAccessoryReceipts>()
                .Where(x => x.ReceivingId == receivingId && !x.IsCancelled)
                .ToListAsync();

        if (receipts.Count == 0)
        {
            return;
        }

        List<long> batchIds =
            receipts.Select(x => x.StockBatchId).ToList();

        await context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"StockBatches\" WHERE \"SourceType\" = {0} AND \"SourceId\" = {1} FOR UPDATE",
            SourceScheme,
            receivingId);

        Dictionary<long, StockBatchesEntity> batches =
            await context
                .Set<StockBatchesEntity>()
                .Where(x => batchIds.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId);

        Dictionary<long, decimal> onHand =
            await context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        batchIds.Contains(x.StockBatchId)
                        &&
                        x.Bucket == BucketOnHand
                        &&
                        x.WarehouseId == warehouseId
                )
                .GroupBy(x => x.StockBatchId)
                .Select(g => new { g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToDictionaryAsync(x => x.Key, x => x.Quantity);

        foreach (PurchaseAccessoryReceipts receipt in receipts)
        {
            decimal held =
                onHand.GetValueOrDefault(receipt.StockBatchId);

            if (!batches.TryGetValue(receipt.StockBatchId, out StockBatchesEntity? batch)
                || held < receipt.Quantity
                || batch.QuantityOnHand < receipt.Quantity)
            {
                throw new InvalidOperationException(
                    $"{receipt.AccessoryName} : only {Qty(Math.Max(0m, held))} of the {Qty(receipt.Quantity)} received is still in {warehouseName}; the rest was given, moved or sold. The receiving cannot be cancelled.");
            }
        }

        List<long> dueIds =
            receipts.Select(x => x.PurchaseAccessoryDueId).Distinct().ToList();

        Dictionary<long, PurchaseAccessoryDues> dues =
            await context
                .Set<PurchaseAccessoryDues>()
                .Where(x => dueIds.Contains(x.PurchaseAccessoryDueId))
                .ToDictionaryAsync(x => x.PurchaseAccessoryDueId);

        string narration =
            Limit($"Receiving {receivingNo} cancelled : {reason}", 300);

        foreach (PurchaseAccessoryReceipts receipt in receipts)
        {
            StockBatchesEntity batch =
                batches[receipt.StockBatchId];

            context.Set<StockMovementsEntity>().Add(
                new StockMovementsEntity
                {
                    StockBatchId = batch.StockBatchId,
                    ProductType = ProductTypeAccessories,
                    ProductId = batch.ProductId,
                    BranchId = branchId,
                    WarehouseId = warehouseId,
                    Bucket = BucketOnHand,
                    MovementType = MoveReceiveCancel,
                    QuantityIn = 0m,
                    QuantityOut = receipt.Quantity,
                    UnitCost = 0m,
                    Value = 0m,
                    DocumentType = documentType,
                    DocumentId = receivingId,
                    DocumentLineId = receipt.PurchaseAccessoryDueId,
                    DocumentNo = receivingNo,
                    DocumentDate = receivingDate,
                    IsReversal = true,
                    Narration = narration,
                    CreatedBy = userId,
                    CreatedDate = now
                });

            batch.QuantityOnHand -= receipt.Quantity;
            batch.Status = BatchClosed;
            batch.ModifiedBy = userId;
            batch.ModifiedDate = now;

            receipt.IsCancelled = true;

            if (dues.TryGetValue(receipt.PurchaseAccessoryDueId, out PurchaseAccessoryDues? due))
            {
                due.QuantityReceived = Math.Max(0m, due.QuantityReceived - receipt.Quantity);
                due.Status = due.Status == StatusCancelled ? StatusCancelled : StatusOf(due);
                due.ModifiedBy = userId;
                due.ModifiedDate = now;
            }
        }
    }


    // Received on one receiving (View)
    public static async Task<List<ReceivingAccessoryLineDto>> ReceiptsOfAsync
    (
        AppDbContext context,
        long receivingId
    )
    {
        return await
        (
            from r in context.Set<PurchaseAccessoryReceipts>().AsNoTracking()
            where r.ReceivingId == receivingId
            join d in context.Set<PurchaseAccessoryDues>().AsNoTracking()
                on r.PurchaseAccessoryDueId equals d.PurchaseAccessoryDueId into dueRows
            from d in dueRows.DefaultIfEmpty()
            orderby r.PurchaseAccessoryReceiptId
            select new ReceivingAccessoryLineDto
            {
                PurchaseAccessoryDueId = r.PurchaseAccessoryDueId,
                SchemeCode = d != null ? d.SchemeCode : string.Empty,
                SchemeKind = d != null ? d.SchemeKind : string.Empty,
                AccessoryId = r.AccessoryId,
                ProductCode = r.ProductCode,
                AccessoryName = r.AccessoryName,
                Unit = r.Unit,
                Quantity = r.Quantity,
                BatchNo = r.BatchNo
            }
        )
        .ToListAsync();
    }


    //===========================================================
    // Close Due : the rest of one row is written off
    //===========================================================

    public static async Task CloseAsync
    (
        AppDbContext context,
        long dueId,
        long branchId,
        string? reason,
        long userId
    )
    {
        string text =
            Limit(reason, 500);

        if (text.Length == 0)
        {
            throw new InvalidOperationException(
                "A reason is required to close the due.");
        }

        DateTime now =
            DateTime.UtcNow;

        PurchaseAccessoryDues due =
            await context
                .Set<PurchaseAccessoryDues>()
                .FirstOrDefaultAsync(x => x.PurchaseAccessoryDueId == dueId)
            ??
            throw new KeyNotFoundException("The due accessory was not found.");

        if (branchId > 0 && due.BranchId != branchId)
        {
            throw new InvalidOperationException(
                $"Purchase {due.PurchaseNo} belongs to another branch.");
        }

        decimal pending =
            Pending(due);

        if (due.Status == StatusCancelled || pending <= 0m)
        {
            throw new InvalidOperationException(
                $"{due.AccessoryName} : nothing is pending on purchase {due.PurchaseNo}.");
        }

        due.QuantityClosed += pending;
        due.CloseReason = due.CloseReason.Length == 0 ? text : Limit($"{due.CloseReason} | {text}", 500);
        due.ClosedBy = userId;
        due.ClosedDate = now;
        due.Status = StatusOf(due);
        due.ModifiedBy = userId;
        due.ModifiedDate = now;

        context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = "Inventory Management",
                EntityName = "ReceivingMB",
                EntityId = due.PurchaseId,
                ActivityType = "Close Due",
                ActivityTitle = "Accessory Due Closed",
                ActivityDescription = Limit($"Purchase {due.PurchaseNo} : {Qty(pending)} {due.Unit} {due.AccessoryName} ({due.SchemeCode}) closed. Reason : {text}", 1000),
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });

        await context.SaveChangesAsync();
    }
}
