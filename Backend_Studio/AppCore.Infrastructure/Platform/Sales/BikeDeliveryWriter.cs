//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;
using AppCore.Infrastructure.Persistence;
using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;
using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;
using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;
using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Sales;


//===============================================================
// Bike Delivery Writer (2026-11-10) : shared by Bike Deliveries
// and Sales Invoices - MB (Delivery on Sale)
//
//   DeliveryNo    BDL-000001 (never reused)
//   Warranty      SWR-000001 : the Warranty Management policy of
//                 the bike's brand valid on the delivery date (a
//                 policy of its model wins), whole-bike period +
//                 km and the part coverages; it starts on the
//                 delivery date. No policy = no record.
//   Bangla        "...Bn" texts are kept escaped (ক ...)
//===============================================================

public static class BikeDeliveryWriter
{
    public const string StatusDelivered = "Delivered";

    public const string StatusUndone = "Undone";

    public const string WarrantyActive = "Active";

    public const string WarrantyVoid = "Void";

    public const string SourceBikeDelivery = "Bike Delivery";


    //===========================================================
    // Bangla (or any text outside ASCII) -> ক ... ; text that
    // is already escaped stays as it is
    //===========================================================

    public static string EscapeBn
    (
        string? value
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        StringBuilder builder =
            new(text.Length);

        foreach (char c in text)
        {
            if (c < 128 && c != '\t')
            {
                builder.Append(c);
            }
            else if (c == '\t')
            {
                builder.Append(' ');
            }
            else
            {
                builder.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
            }
        }

        return builder.ToString();
    }


    //===========================================================
    // Codes : <prefix>-nnnnnn, highest used + 1
    //===========================================================

    private static string NextCode
    (
        string prefix,
        IEnumerable<string> codes
    )
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string tail =
                (code ?? string.Empty).Trim();

            if (!tail.StartsWith(prefix + "-", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (int.TryParse(tail.Substring(prefix.Length + 1), NumberStyles.None, CultureInfo.InvariantCulture, out int number) && number > highest)
            {
                highest = number;
            }
        }

        return $"{prefix}-{highest + 1:D6}";
    }

    public static async Task<string>
        NextDeliveryNoAsync
        (
            AppDbContext context
        )
    {
        List<string> codes =
            await context
                .Set<BikeDeliveries>()
                .AsNoTracking()
                .Select(x => x.DeliveryNo)
                .ToListAsync();

        codes.AddRange(
            context
                .Set<BikeDeliveries>()
                .Local
                .Select(x => x.DeliveryNo));

        return NextCode("BDL", codes);
    }

    private static async Task<string>
        NextWarrantyCodeAsync
        (
            AppDbContext context
        )
    {
        List<string> codes =
            await context
                .Set<SalesWarrantyRecords>()
                .AsNoTracking()
                .Select(x => x.Code)
                .ToListAsync();

        codes.AddRange(
            context
                .Set<SalesWarrantyRecords>()
                .Local
                .Select(x => x.Code));

        return NextCode("SWR", codes);
    }


    //===========================================================
    // The bike's model and brand (product = MotorBikes)
    //===========================================================

    public sealed class BikeModelInfo
    {
        public long? BikeModelId { get; init; }

        public string ModelName { get; init; } = string.Empty;

        public long? BrandManagementId { get; init; }
    }

    public static async Task<BikeModelInfo>
        BikeModelAsync
        (
            AppDbContext context,
            long productId
        )
    {
        var bike =
            await
            (
                from b in context.Set<MotorBikesEntity>().AsNoTracking()
                join c in context.Set<ProductCategoryEntity>().AsNoTracking()
                    on b.ProductCategoryId equals c.ProductCategoryId
                join s in context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId into subs
                from s in subs.DefaultIfEmpty()
                where b.MotorBikeId == productId
                select new
                {
                    BrandId = (long?)c.BrandManagementId,
                    ModelId = s != null ? s.BikeModelId : null
                }
            )
            .FirstOrDefaultAsync();

        if (bike == null)
        {
            return new BikeModelInfo();
        }

        var model =
            bike.ModelId.HasValue
                ? await context
                    .Set<BikeModelsEntity>()
                    .AsNoTracking()
                    .Where(x => x.BikeModelId == bike.ModelId.Value)
                    .Select(x => new { x.ModelName, x.BrandManagementId })
                    .FirstOrDefaultAsync()
                : null;

        return new BikeModelInfo
        {
            BikeModelId = bike.ModelId,
            ModelName = model?.ModelName ?? string.Empty,
            BrandManagementId = bike.BrandId ?? model?.BrandManagementId
        };
    }


    //===========================================================
    // Warranty record of a saved delivery (caller saves)
    //===========================================================

    private static DateOnly? EndOf
    (
        DateOnly start,
        int value,
        string unit
    )
    {
        if (value <= 0)
        {
            return null;
        }

        DateOnly end =
            unit switch
            {
                "Days" => start.AddDays(value),
                "Months" => start.AddMonths(value),
                "Years" => start.AddYears(value),
                _ => start
            };

        return end.AddDays(-1);
    }

    public static async Task<SalesWarrantyRecords?>
        CreateWarrantyAsync
        (
            AppDbContext context,
            BikeDeliveries delivery,
            long userId,
            DateTime now
        )
    {
        BikeModelInfo info =
            await BikeModelAsync(context, delivery.ProductId);

        if (!info.BrandManagementId.HasValue)
        {
            return null;
        }

        long brand =
            info.BrandManagementId.Value;

        long? modelId =
            info.BikeModelId;

        DateOnly day =
            delivery.DeliveryDate;

        WarrantyPolicies? policy =
            await context
                .Set<WarrantyPolicies>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.BrandManagementId == brand
                        && !x.IsDeleted
                        && x.IsActive
                        && x.EffectiveFrom <= day
                        && (x.EffectiveTo == null || x.EffectiveTo >= day)
                        && (x.BikeModelId == null || x.BikeModelId == modelId)
                )
                .OrderByDescending(x => x.BikeModelId != null)
                .ThenByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

        if (policy == null)
        {
            return null;
        }

        SalesWarrantyRecords record =
            new()
            {
                Code = await NextWarrantyCodeAsync(context),
                SourceType = SourceBikeDelivery,
                SourceId = delivery.BikeDeliveryId,
                BranchId = delivery.BranchId,
                SalesInvoiceId = delivery.SalesInvoiceId,
                SalesInvoiceNo = delivery.SalesInvoiceNo,
                CustomerId = delivery.CustomerId,
                CustomerName = delivery.CustomerName,
                CustomerPhone = delivery.CustomerPhone,
                ProductId = delivery.ProductId,
                ProductName = delivery.ProductName,
                BikeModelId = modelId,
                ChassisNo = delivery.ChassisNo,
                EngineNo = delivery.EngineNo,
                WarrantyPolicyId = policy.WarrantyPolicyId,
                PolicyCode = policy.Code,
                PolicyName = policy.Name,
                StartDate = day,
                ExpiryDate = EndOf(day, policy.PeriodValue, policy.PeriodUnit),
                KmLimit = policy.KmLimit,
                Status = WarrantyActive,
                VoidReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        context.Set<SalesWarrantyRecords>().Add(record);

        await context.SaveChangesAsync();

        var coverages =
            await
            (
                from c in context.Set<WarrantyCoverages>().AsNoTracking()
                join p in context.Set<WarrantyParts>().AsNoTracking()
                    on c.WarrantyPartId equals p.WarrantyPartId
                where c.WarrantyPolicyId == policy.WarrantyPolicyId && !c.IsDeleted && c.IsActive
                orderby p.DisplayOrder, p.Name
                select new { c.WarrantyPartId, p.Name, c.PeriodValue, c.PeriodUnit, c.KmLimit, c.Notes }
            )
            .ToListAsync();

        foreach (var c in coverages)
        {
            context.Set<SalesWarrantyRecordParts>().Add(
                new SalesWarrantyRecordParts
                {
                    SalesWarrantyRecordId = record.SalesWarrantyRecordId,
                    WarrantyPartId = c.WarrantyPartId,
                    PartName = c.Name,
                    ExpiryDate = EndOf(day, c.PeriodValue, c.PeriodUnit),
                    KmLimit = c.KmLimit,
                    Notes = c.Notes ?? string.Empty
                });
        }

        return record;
    }


    //===========================================================
    // Void the warranty of a delivery (undo / invoice cancelled)
    //===========================================================

    public static async Task
        VoidWarrantyAsync
        (
            AppDbContext context,
            long deliveryId,
            string reason,
            long userId,
            DateTime now
        )
    {
        List<SalesWarrantyRecords> records =
            await context
                .Set<SalesWarrantyRecords>()
                .Where(x => x.SourceType == SourceBikeDelivery && x.SourceId == deliveryId && !x.IsDeleted && x.Status != WarrantyVoid)
                .ToListAsync();

        foreach (SalesWarrantyRecords record in records)
        {
            record.Status = WarrantyVoid;
            record.VoidReason = reason.Length > 500 ? reason.Substring(0, 500) : reason;
            record.ModifiedBy = userId;
            record.ModifiedDate = now;
        }
    }


    //===========================================================
    // Delivery on Sale : a delivery (no PDI) + its warranty for
    // one posted invoice line (caller saves)
    //===========================================================

    public static async Task
        RecordOnSaleAsync
        (
            AppDbContext context,
            SalesInvoiceHeader header,
            SalesInvoiceLine line,
            IMotorBikeSaleLine bike,
            bool isElectric,
            long userId,
            DateTime now
        )
    {
        bool exists =
            await context
                .Set<BikeDeliveries>()
                .AnyAsync(x => x.SalesInvoiceLineId == line.SalesInvoiceLineId && x.Status == StatusDelivered && !x.IsDeleted);

        if (exists)
        {
            return;
        }

        BikeModelInfo info =
            await BikeModelAsync(context, line.ProductId);

        BikeDeliveries delivery =
            new()
            {
                DeliveryNo = await NextDeliveryNoAsync(context),
                BranchId = header.BranchId,
                BranchName = header.BranchName ?? string.Empty,
                SalesInvoiceId = header.SalesInvoiceId,
                SalesInvoiceNo = header.InvoiceNo ?? string.Empty,
                SalesInvoiceDate = header.InvoiceDate,
                SalesInvoiceLineId = line.SalesInvoiceLineId,
                CustomerId = header.CustomerId,
                CustomerCode = header.CustomerCode ?? string.Empty,
                CustomerName = header.CustomerName ?? string.Empty,
                CustomerPhone = header.CustomerPhone ?? string.Empty,
                ProductId = line.ProductId,
                ProductCode = line.ProductCode ?? string.Empty,
                ProductName = line.ProductName ?? string.Empty,
                BikeModelId = info.BikeModelId,
                ModelName = info.ModelName,
                MotorBikeUnitId = bike.MotorBikeUnitId,
                ChassisNo = bike.ChassisNo ?? string.Empty,
                EngineNo = bike.EngineNo ?? string.Empty,
                ColorName = bike.ColorName ?? string.Empty,
                IsElectric = isElectric,
                DeliveryDate = header.InvoiceDate,
                ReceivedBy = "Customer",
                ReceiverName = header.CustomerName ?? string.Empty,
                ReceiverPhone = header.CustomerPhone ?? string.Empty,
                OdometerKm = 0,
                Remarks = "Delivered on sale (Delivery on Sale).",
                Status = StatusDelivered,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        context.Set<BikeDeliveries>().Add(delivery);

        await context.SaveChangesAsync();

        await CreateWarrantyAsync(context, delivery, userId, now);
    }


    //===========================================================
    // Invoice cancelled : its deliveries undone, warranties void
    // (caller saves)
    //===========================================================

    public static async Task
        UndoForInvoiceAsync
        (
            AppDbContext context,
            long salesInvoiceId,
            string invoiceNo,
            long userId,
            DateTime now
        )
    {
        List<BikeDeliveries> deliveries =
            await context
                .Set<BikeDeliveries>()
                .Where(x => x.SalesInvoiceId == salesInvoiceId && x.Status == StatusDelivered && !x.IsDeleted)
                .ToListAsync();

        string reason =
            $"Sales invoice {invoiceNo} cancelled.";

        foreach (BikeDeliveries delivery in deliveries)
        {
            delivery.Status = StatusUndone;
            delivery.UndoneBy = userId;
            delivery.UndoneDate = now;
            delivery.UndoReason = reason;
            delivery.ModifiedBy = userId;
            delivery.ModifiedDate = now;

            await VoidWarrantyAsync(context, delivery.BikeDeliveryId, reason, userId, now);
        }
    }
}
