//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AutoAccounts.DTOs;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

using ServicePolicyEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicy;

using ScheduledServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ScheduledServices;

using LaborChartEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.LaborChart;

using CustomizedServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.CustomizedServices;

using MembershipServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices;

using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using MembershipCardsEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Auto Accounts Repository (read-only)
//
// THE ONLY PLACE that knows which pages create accounts.
// Every source column holding a created group / sub group /
// ledger code is registered ONCE below, under Inventory or
// Financial. A new auto-creating page (e.g. Membership Policies)
// is one more line here; the three account list pages follow
// without a change.
//
// Source rows are read INCLUDING soft-deleted ones: an account
// created by a page stays an auto account even after that
// record is deleted (codes are never reused).
//
// Each column is read with its own query (no SelectMany over an
// array), so EF can always translate it.
//===============================================================

public class AutoAccountsRepository : IAutoAccountsRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AutoAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Code Source : one column of one table
    //===========================================================

    private delegate IQueryable<string?> CodeSource(
        AppDbContext db);


    //===========================================================
    // INVENTORY (Product Settings)
    //===========================================================

    private static readonly CodeSource[] InventoryGroupSources =
    {
        db => db.Set<ProductCategoryEntity>().AsNoTracking().Select(x => x.InventoryGroupCode),
        db => db.Set<ProductCategoryEntity>().AsNoTracking().Select(x => x.WipGroupCode),
        db => db.Set<ProductCategoryEntity>().AsNoTracking().Select(x => x.CogsGroupCode)
    };

    private static readonly CodeSource[] InventorySubGroupSources =
    {
        db => db.Set<ProductSubCategoryEntity>().AsNoTracking().Select(x => x.InventorySubGroupCode),
        db => db.Set<ProductSubCategoryEntity>().AsNoTracking().Select(x => x.WipSubGroupCode),
        db => db.Set<ProductSubCategoryEntity>().AsNoTracking().Select(x => x.CogsSubGroupCode)
    };

    private static readonly CodeSource[] InventoryLedgerSources =
    {
        // Motor Bikes
        db => db.Set<MotorBikesEntity>().AsNoTracking().Select(x => x.InventoryLedgerCode),
        db => db.Set<MotorBikesEntity>().AsNoTracking().Select(x => x.WipLedgerCode),
        db => db.Set<MotorBikesEntity>().AsNoTracking().Select(x => x.CogsLedgerCode),

        // Spare Parts
        db => db.Set<SparePartsEntity>().AsNoTracking().Select(x => x.InventoryLedgerCode),
        db => db.Set<SparePartsEntity>().AsNoTracking().Select(x => x.WipLedgerCode),
        db => db.Set<SparePartsEntity>().AsNoTracking().Select(x => x.CogsLedgerCode),

        // Accessories
        db => db.Set<AccessoriesEntity>().AsNoTracking().Select(x => x.InventoryLedgerCode),
        db => db.Set<AccessoriesEntity>().AsNoTracking().Select(x => x.WipLedgerCode),
        db => db.Set<AccessoriesEntity>().AsNoTracking().Select(x => x.CogsLedgerCode)
    };


    //===========================================================
    // FINANCIAL (Service Settings, later Membership, …)
    //===========================================================

    private static readonly CodeSource[] FinancialGroupSources =
    {
        // Service Category : income group
        db => db.Set<ServiceCategoryEntity>().AsNoTracking().Select(x => x.IncomeGroupCode)
    };

    private static readonly CodeSource[] FinancialSubGroupSources =
    {
        // Service Sub Category : income sub group
        db => db.Set<ServiceSubCategoryEntity>().AsNoTracking().Select(x => x.IncomeSubGroupCode)
    };

    private static readonly CodeSource[] FinancialLedgerSources =
    {
        // Service Policy : associated ledger (brand claim receivable)
        db => db.Set<ServicePolicyEntity>().AsNoTracking().Select(x => x.AssociatedLedgerCode),

        // Scheduled Services : income ledger
        db => db.Set<ScheduledServicesEntity>().AsNoTracking().Select(x => x.IncomeLedgerCode),

        // Labor Chart : income ledger
        db => db.Set<LaborChartEntity>().AsNoTracking().Select(x => x.IncomeLedgerCode),

        // Customized Services : income ledger
        db => db.Set<CustomizedServicesEntity>().AsNoTracking().Select(x => x.IncomeLedgerCode),

        // Membership Services : income (billed) and expense (discount),
        // created by Membership Cards
        db => db.Set<MembershipServicesEntity>().AsNoTracking().Select(x => x.IncomeLedgerCode),
        db => db.Set<MembershipServicesEntity>().AsNoTracking().Select(x => x.ExpenseLedgerCode),

        // Customer Profiles : receivable ledger (SUB-002-002-005)
        db => db.Set<CustomerProfilesEntity>().AsNoTracking().Select(x => x.ReceivableLedgerCode),

        // Supplier Profiles : payable ledger (SUB-003-002-001)
        db => db.Set<SupplierProfilesEntity>().AsNoTracking().Select(x => x.PayableLedgerCode),


        // Membership Cards : fee income (SUB-009-001-001) and
        // discount (SUB-004-002-002). Their complimentary service
        // ledgers are on the Membership Services rows above.
        db => db.Set<MembershipCardsEntity>().AsNoTracking().Select(x => x.FeeLedgerCode),

        db => db.Set<MembershipCardsEntity>().AsNoTracking().Select(x => x.DiscountLedgerCode),


        // Brand Management : Offer Adjustment Account (SUB-002-002-008)
        // and EMI Claim Receivable (SUB-002-002-009)
        db => db.Set<BrandManagementEntity>().AsNoTracking().Select(x => x.OfferAdjustmentLedgerCode),

        db => db.Set<BrandManagementEntity>().AsNoTracking().Select(x => x.EmiClaimLedgerCode)
    };


    //===========================================================
    // Read Codes (distinct, trimmed, upper case, sorted)
    //===========================================================

    private async Task<List<string>>
        ReadAsync
        (
            IEnumerable<CodeSource> sources
        )
    {
        HashSet<string> codes =
            new HashSet<string>(
                StringComparer.OrdinalIgnoreCase);

        foreach
        (
            CodeSource source
            in sources
        )
        {
            List<string?> values =
                await source(_context)
                    .Where(x => x != null && x != "")
                    .Distinct()
                    .ToListAsync();

            foreach
            (
                string? value
                in values
            )
            {
                if
                (
                    !string.IsNullOrWhiteSpace(value)
                )
                {
                    codes.Add(
                        value.Trim().ToUpperInvariant());
                }
            }
        }

        return codes
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    //===========================================================
    // Get Codes
    //
    // A code found under both origins (should never happen)
    // stays Inventory only.
    //===========================================================

    public async Task<AutoAccountCodesDto>
        GetCodesAsync()
    {
        AutoAccountCodesDto dto =
            new AutoAccountCodesDto
            {
                InventoryGroupCodes =
                    await ReadAsync(InventoryGroupSources),

                InventorySubGroupCodes =
                    await ReadAsync(InventorySubGroupSources),

                InventoryLedgerCodes =
                    await ReadAsync(InventoryLedgerSources),

                FinancialGroupCodes =
                    await ReadAsync(FinancialGroupSources),

                FinancialSubGroupCodes =
                    await ReadAsync(FinancialSubGroupSources),

                FinancialLedgerCodes =
                    await ReadAsync(FinancialLedgerSources)
            };

        dto.FinancialGroupCodes =
            dto.FinancialGroupCodes
                .Except(dto.InventoryGroupCodes, StringComparer.OrdinalIgnoreCase)
                .ToList();

        dto.FinancialSubGroupCodes =
            dto.FinancialSubGroupCodes
                .Except(dto.InventorySubGroupCodes, StringComparer.OrdinalIgnoreCase)
                .ToList();

        dto.FinancialLedgerCodes =
            dto.FinancialLedgerCodes
                .Except(dto.InventoryLedgerCodes, StringComparer.OrdinalIgnoreCase)
                .ToList();

        return dto;
    }
}