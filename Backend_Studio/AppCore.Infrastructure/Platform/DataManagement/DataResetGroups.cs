//===============================================================
// Data Reset : the groups of tables that can be cleared
//
// Only tables listed here (by name, any upper / lower case) or
// matching a group pattern can ever be cleared. Everything else
// (users, roles, navigation, switches, company, branches, wings,
// warehouses, financial years, chart of accounts, posting setup
// ...) is protected; the locked Settings pages are listed (with
// the reason) but can never be ticked.
//
// Sections :
//   Operations : transactions, logs (as before)
//   Settings   : the Settings module's pages. A Settings table can
//                own chart entries (its ledgers, account groups,
//                sub groups); they go with it. Rows still used by
//                a kept table block the reset (no database foreign
//                keys, so the links are listed here : ids / codes /
//                ledger codes).
//===============================================================

using System.Text.RegularExpressions;

namespace AppCore.Infrastructure.Platform.DataManagement;


internal sealed class DataResetGroup
{
    public string Key { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string Icon { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    // Table names in lower case
    public string[] Tables { get; init; } = Array.Empty<string>();

    // Optional pattern on the lower-case table name
    public Regex? Pattern { get; init; }

    public bool IsSpecial { get; init; }

    // Operations / Settings
    public string Section { get; init; } = DataResetGroups.SectionOperations;

    // Settings : the Settings sub module (Client Settings ...)
    public string Area { get; init; } = string.Empty;

    // Settings : shared reference data, kept by "Template clean"
    public bool KeepInTemplate { get; init; }

    // Settings : "Test data only" (rows with Remarks 'TEST DATA')
    public bool SupportsTestData { get; init; }

    // Settings : the tables that own rows / chart entries
    public DataResetKey[] Keys { get; init; } = Array.Empty<DataResetKey>();

    public bool Matches
    (
        string tableName
    )
    {
        string lower =
            tableName.ToLowerInvariant();

        return
            Tables.Contains(lower)
            ||
            (Pattern != null && Pattern.IsMatch(lower));
    }
}


//===============================================================
// A Settings table : how its rows are found elsewhere, and what
// it owns in the chart of accounts
//===============================================================

internal sealed class DataResetKey
{
    // Real table name (exact)
    public string Table { get; init; } = string.Empty;

    public string IdColumn { get; init; } = string.Empty;

    public string CodeColumn { get; init; } = string.Empty;

    // Columns (lower case) in OTHER tables holding this table's id
    public string[] IdRefs { get; init; } = Array.Empty<string>();

    // Columns (lower case) in OTHER tables holding this table's code
    public string[] CodeRefs { get; init; } = Array.Empty<string>();

    // The code is itself an account (bank / cash / MFS ...) : any
    // ledger-code column of a kept table holding it blocks
    public bool CodeIsLedger { get; init; }

    // Columns of this table holding its own General Ledger codes
    public string[] LedgerColumns { get; init; } = Array.Empty<string>();

    // General Ledgers it made (Remarks LIKE ...)
    public string[] LedgerRemarks { get; init; } = Array.Empty<string>();

    // Account Groups / Sub Groups it made (Remarks LIKE ...)
    public string[] GroupRemarks { get; init; } = Array.Empty<string>();

    public string[] SubGroupRemarks { get; init; } = Array.Empty<string>();

    // Optional links in kept tables : emptied instead of blocking
    // (table, column holding this table's code)
    public (string Table, string Column)[] Unlinks { get; init; } = Array.Empty<(string, string)>();

    // Pure link rows in kept (even locked) tables : deleted instead
    // of blocking (table, column holding this table's id). Only the
    // link rows of the cleared ids go; the rest of the table stays.
    public (string Table, string Column)[] DropLinks { get; init; } = Array.Empty<(string, string)>();
}


internal sealed class DataResetLocked
{
    public string Name { get; init; } = string.Empty;

    public string Reason { get; init; } = string.Empty;
}


internal static class DataResetGroups
{
    public const string SectionOperations = "Operations";

    public const string SectionSettings = "Settings";

    public const string TestDataMarker = "TEST DATA";

    public const string WalkInKey = "walk-in";

    // Settings pages that are never cleared (shown greyed)
    public static readonly IReadOnlyList<DataResetLocked> Locked =
        new List<DataResetLocked>
        {
            new() { Name = "Company", Reason = "Every document and the login need it; set by onboarding." },
            new() { Name = "Branches", Reason = "Login, user branch assignment and every document need them." },
            new() { Name = "Wings & Business Lines", Reason = "Branches and users are built on them." },
            new() { Name = "Warehouses", Reason = "Made with the branches; stock lives in them." },
            new() { Name = "Financial Years", Reason = "Every voucher and document date needs one." },
            new() { Name = "System Configurations", Reason = "The switches; rebuilt by scripts, not cleared." },
            new() { Name = "Business Configuration", Reason = "How the business works; part of the template." },
            new() { Name = "Website Configuration", Reason = "The public website; set by onboarding." },
            new() { Name = "Chart of Accounts", Reason = "Account classes, groups, sub groups and manual ledgers : the structure every posting needs." },
            new() { Name = "Posting Setup", Reason = "Which ledgers each document posts to." }
        };

    // Ledger-code columns : a kept column with one of these names
    // (lower case, ends with) holding a ledger of the reset blocks
    public static readonly string[] LedgerUseSuffixes =
    {
        "ledgercode", "accountcode"
    };

    // Group / sub group code columns (ends with)
    public static readonly string[] GroupUseSuffixes =
    {
        "groupcode"
    };

    // Product tables : their own ledgers go with them
    public static readonly Dictionary<string, string> ProductLedgerRemarks =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["spareparts"]  = "System generated from Spare Part %",
            ["accessories"] = "System generated from Accessory %",
            ["motorbikes"]  = "System generated from Motor Bike %"
        };

    public static readonly string[] ProductLedgerColumns =
    {
        "InventoryLedgerCode",
        "WipLedgerCode",
        "CogsLedgerCode",
        "SalesLedgerCode"
    };

    // Columns holding a product id (kept tables must not hold any
    // when product tables are cleared)
    public static readonly string[] ProductIdColumns =
    {
        "sparepartid", "sparepartsid", "accessoryid", "accessoriesid",
        "motorbikeid", "motorbikesid", "productid"
    };

    public static readonly IReadOnlyList<DataResetGroup> All =
        new List<DataResetGroup>
        {
            new()
            {
                Key = "products",
                Name = "Products (Spare Parts, Accessories, Motor Bikes)",
                Icon = "fa-solid fa-boxes-stacked",
                Description = "Spare parts / lubricants, accessories, motor bikes, their saved locations, the models they also fit and each product's own ledgers (inventory, WIP, COGS, sales). New products start again at 00001.",
                Section = SectionSettings,
                Area = "Product Settings",
                Tables = new[]
                {
                    "spareparts", "accessories", "motorbikes",
                    "sparepartlocations", "accessorylocations",
                    // "Fits Models" links (2026-11-06)
                    "sparepartfitments", "accessoryfitments"
                }
            },
            new()
            {
                Key = "opening-receiving",
                Name = "Opening Stock & Receiving",
                Icon = "fa-solid fa-dolly",
                Description = "Opening stock, product receiving (SP / AC / MB) and motor bike units (chassis).",
                Tables = new[]
                {
                    "openingstock", "openingstocklines",
                    "sparepartslubricantsreceiving", "sparepartslubricantsreceivinglines",
                    "accessoriesreceiving", "accessoriesreceivinglines",
                    "motorbikereceiving", "motorbikereceivinglines",
                    "motorbikeunits"
                }
            },
            new()
            {
                Key = "procurement",
                Name = "Procurement",
                Icon = "fa-solid fa-cart-flatbed",
                Description = "Purchase orders, purchases, purchase returns and adjustments of the three types, with their lines.",
                Pattern = new Regex("^(purchaseorders|purchases|purchasereturns|purchaseadjustments)(sp|ac|mb)", RegexOptions.CultureInvariant)
            },
            new()
            {
                Key = "sales",
                Name = "Sales",
                Icon = "fa-solid fa-file-invoice-dollar",
                Description = "Sales invoices (lines, payments), returns, quotations and bookings of the three types.",
                Pattern = new Regex("^(salesinvoices|salesreturns|salesquotations|bookings)(sp|ac|mb)", RegexOptions.CultureInvariant)
            },
            new()
            {
                Key = "stock-engine",
                Name = "Stock Engine",
                Icon = "fa-solid fa-layer-group",
                Description = "Stock batches, stock movements, allocations, VAT register and the product price index.",
                Tables = new[]
                {
                    "stockbatches", "stockmovements", "stockallocations",
                    "vatregister", "productpriceindex"
                }
            },
            new()
            {
                Key = "stock-movement",
                Name = "Stock Movement",
                Icon = "fa-solid fa-truck-ramp-box",
                Description = "Product transfers and mass storing.",
                Tables = new[]
                {
                    "producttransfers", "producttransferlines",
                    "producttransferbatches", "producttransferunits",
                    "massstorings", "massstoringlines"
                }
            },
            new()
            {
                Key = "pricing",
                Name = "Pricing & Labels",
                Icon = "fa-solid fa-tags",
                Description = "Product pricing, price adjustments and barcode print runs.",
                Tables = new[]
                {
                    "productpricing", "productpricinglines",
                    "priceadjustments", "priceadjustmentlines", "priceadjustmentproducts",
                    "priceadjustmentreleases", "priceadjustmentsuppliers",
                    "barcodeprintruns", "barcodeprintrunlines"
                }
            },
            new()
            {
                Key = "vouchers",
                Name = "Vouchers",
                Icon = "fa-solid fa-receipt",
                Description = "Receipt, payment, journal and fund transfer vouchers.",
                Tables = new[]
                {
                    "receiptvoucher", "receiptvoucherlines", "receiptvoucherpayments",
                    "paymentvoucher", "paymentvoucherlines", "paymentvoucherpayments",
                    "journalvoucher", "journalvoucherlines",
                    "fundtransfer", "fundtransferlines"
                }
            },
            new()
            {
                Key = "reconciliation",
                Name = "Reconciliation",
                Icon = "fa-solid fa-scale-balanced",
                Description = "Check, MFS, POS and EMI reconciliations with their vouchers, history, auto settlement runs and deposit slips.",
                Tables = new[]
                {
                    "checkreconciliations", "checkreconciliationvouchers",
                    "checkreconciliationvoucherlines", "checkreconciliationhistory",
                    "checkdepositslips",
                    "mfsreconciliations", "mfsreconciliationvouchers",
                    "mfsreconciliationvoucherlines", "mfsreconciliationhistory",
                    "mfsautosettlementruns",
                    "posreconciliations", "posreconciliationvouchers",
                    "posreconciliationvoucherlines", "posreconciliationhistory",
                    "posautosettlementruns",
                    "emireconciliations"
                }
            },
            new()
            {
                Key = "accounting",
                Name = "Accounting Entries",
                Icon = "fa-solid fa-book",
                Description = "Every voucher entry (all ledger balances go to zero) and the voucher sequences (numbers restart at 00001).",
                Tables = new[]
                {
                    "voucherentries", "vouchersequences"
                }
            },
            new()
            {
                Key = "enquiries",
                Name = "Enquiries & Follow-ups",
                Icon = "fa-solid fa-headset",
                Description = "Sales and service enquiries, enquiry contacts, follow-ups, service appointments, test rides, service vehicles and schedules.",
                Tables = new[]
                {
                    "salesenquiries", "serviceenquiries", "serviceenquirylines",
                    "enquirycontacts", "salesfollowups", "servicefollowups",
                    "serviceappointments", "salestestrides",
                    "servicevehicles", "servicevehicleschedules"
                }
            },
            new()
            {
                Key = "membership",
                Name = "Membership Operations",
                Icon = "fa-solid fa-id-card",
                Description = "Membership fees collected, membership status and service windows (cards and policies stay).",
                Tables = new[]
                {
                    "membershipfeescollection", "membershipfeescollections",
                    "membershipstatus", "membershipstatuses",
                    "membershipservicewindows"
                }
            },
            new()
            {
                Key = "logs",
                Name = "Logs",
                Icon = "fa-solid fa-clock-rotate-left",
                Description = "Activity history, posting setup history and switch change requests.",
                Tables = new[]
                {
                    "activityhistory", "activityhistories",
                    "postingsetuphistory", "postingsetuphistories",
                    "systemconfigurationrequests"
                }
            },
            new()
            {
                Key = WalkInKey,
                Name = "Walk-in Customers",
                Icon = "fa-solid fa-person-walking",
                Description = "Customers tagged Walk-in, and their own receivable ledger when no other customer uses it.",
                IsSpecial = true
            },

            //===================================================
            // SETTINGS : Client Settings
            //===================================================

            new()
            {
                Key = "customers",
                Name = "Customer Profiles",
                Icon = "fa-solid fa-id-card",
                Description = "Customers (Inbound and Outside) and their own receivable ledgers. Codes start again at CIB-000001 / COS-000001.",
                Section = SectionSettings,
                Area = "Client Settings",
                SupportsTestData = true,
                Tables = new[] { "customerprofiles" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "CustomerProfiles",
                        IdColumn = "CustomerId",
                        CodeColumn = "CustomerCode",
                        IdRefs = new[] { "customerid", "customerprofileid", "customerprofilesid" },
                        CodeRefs = new[] { "customercode" },
                        LedgerColumns = new[] { "ReceivableLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Customer Profiles %" }
                    }
                }
            },
            new()
            {
                Key = "suppliers",
                Name = "Supplier Profiles",
                Icon = "fa-solid fa-truck-field",
                Description = "Suppliers and their own payable ledgers. A brand's motor bike supplier link is emptied. Codes start again at SUP-000001.",
                Section = SectionSettings,
                Area = "Client Settings",
                SupportsTestData = true,
                Tables = new[] { "supplierprofiles" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "SupplierProfiles",
                        IdColumn = "SupplierId",
                        CodeColumn = "SupplierCode",
                        IdRefs = new[] { "supplierid", "supplierprofileid", "supplierprofilesid" },
                        CodeRefs = new[] { "suppliercode" },
                        LedgerColumns = new[] { "PayableLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Supplier Profiles %" },
                        Unlinks = new[] { ("BrandManagements", "MotorBikesSupplierCode") }
                    }
                }
            },

            //===================================================
            // SETTINGS : Product Settings
            //===================================================

            new()
            {
                Key = "brands",
                Name = "Brands",
                Icon = "fa-solid fa-copyright",
                Description = "Brands and their offer adjustment / EMI claim ledgers.",
                Section = SectionSettings,
                Area = "Product Settings",
                KeepInTemplate = true,
                Tables = new[] { "brandmanagements" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "BrandManagements",
                        IdColumn = "BrandManagementId",
                        CodeColumn = "BrandCode",
                        IdRefs = new[] { "brandmanagementid", "brandid" },
                        CodeRefs = new[] { "brandcode" },
                        LedgerColumns = new[] { "OfferAdjustmentLedgerCode", "EmiClaimLedgerCode" },

                        // Website Configuration is locked : only its
                        // brand link rows go with the brands
                        DropLinks = new[]
                        {
                            ("WebsiteBrands", "BrandManagementId"),
                            ("WebsiteBranchBrands", "BrandManagementId")
                        }
                    }
                }
            },
            new()
            {
                Key = "colors",
                Name = "Colors",
                Icon = "fa-solid fa-palette",
                Description = "Colour list of the motor bikes.",
                Section = SectionSettings,
                Area = "Product Settings",
                KeepInTemplate = true,
                Tables = new[] { "colormanagements" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "ColorManagements",
                        IdColumn = "ColorManagementId",
                        CodeColumn = "ColorCode",
                        IdRefs = new[] { "colormanagementid", "colorid" },
                        CodeRefs = new[] { "colorcode" }
                    }
                }
            },
            new()
            {
                Key = "bike-models",
                Name = "Bike Models",
                Icon = "fa-solid fa-motorcycle",
                Description = "Bike models of the brands (model name, bike type, website details). Product sub categories point at them, so clear Product Categories with them. New models start again at BMD-0001.",
                Section = SectionSettings,
                Area = "Product Settings",
                KeepInTemplate = true,
                Tables = new[] { "bikemodels" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "BikeModels",
                        IdColumn = "BikeModelId",
                        CodeColumn = "ModelCode",
                        IdRefs = new[] { "bikemodelid" }
                    }
                }
            },
            new()
            {
                Key = "product-categories",
                Name = "Product Categories",
                Icon = "fa-solid fa-sitemap",
                Description = "Product categories and sub categories with the account groups / sub groups they made (inventory, WIP, COGS, sales).",
                Section = SectionSettings,
                Area = "Product Settings",
                Tables = new[] { "productcategories", "productsubcategories" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "ProductCategories",
                        IdColumn = "ProductCategoryId",
                        CodeColumn = "CategoryCode",
                        IdRefs = new[] { "productcategoryid" },
                        GroupRemarks = new[] { "System generated from Product Category %" }
                    },
                    new DataResetKey
                    {
                        Table = "ProductSubCategories",
                        IdColumn = "ProductSubCategoryId",
                        CodeColumn = "SubCategoryCode",
                        IdRefs = new[] { "productsubcategoryid" },
                        SubGroupRemarks = new[] { "System generated from Product Sub Category %" }
                    }
                }
            },
            new()
            {
                Key = "racks",
                Name = "Racks & Zones",
                Icon = "fa-solid fa-warehouse",
                Description = "Rack zones, racks, their shelves and sub category links.",
                Section = SectionSettings,
                Area = "Product Settings",
                Tables = new[] { "rackmanagements", "rackshelves", "racksubcategories", "rackzones" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "RackManagements",
                        IdColumn = "RackManagementId",
                        CodeColumn = "RackCode",
                        IdRefs = new[] { "rackmanagementid", "rackid" }
                    },
                    new DataResetKey
                    {
                        Table = "RackZones",
                        IdColumn = "RackZoneId",
                        CodeColumn = "ZoneCode",
                        IdRefs = new[] { "rackzoneid" }
                    }
                }
            },

            //===================================================
            // SETTINGS : Service Settings
            //===================================================

            new()
            {
                Key = "service-categories",
                Name = "Service Categories",
                Icon = "fa-solid fa-screwdriver-wrench",
                Description = "Service categories and sub categories with the income groups / sub groups they made.",
                Section = SectionSettings,
                Area = "Service Settings",
                KeepInTemplate = true,
                Tables = new[] { "servicecategories", "servicesubcategories" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "ServiceCategories",
                        IdColumn = "ServiceCategoryId",
                        CodeColumn = "CategoryCode",
                        IdRefs = new[] { "servicecategoryid" },
                        GroupRemarks = new[] { "System generated from Service Category %" }
                    },
                    new DataResetKey
                    {
                        Table = "ServiceSubCategories",
                        IdColumn = "ServiceSubCategoryId",
                        CodeColumn = "SubCategoryCode",
                        IdRefs = new[] { "servicesubcategoryid" },
                        SubGroupRemarks = new[] { "System generated from Service Sub Category %" }
                    }
                }
            },
            new()
            {
                Key = "service-items",
                Name = "Service Items",
                Icon = "fa-solid fa-list-check",
                Description = "Customized services, labor chart and scheduled services with their income ledgers (membership services go with Membership Cards).",
                Section = SectionSettings,
                Area = "Service Settings",
                Tables = new[] { "customizedservices", "laborcharts", "scheduledservices" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "CustomizedServices",
                        IdColumn = "CustomizedServiceId",
                        CodeColumn = "ServiceCode",
                        IdRefs = new[] { "customizedserviceid" },
                        LedgerColumns = new[] { "IncomeLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Customized Services %" }
                    },
                    new DataResetKey
                    {
                        Table = "LaborCharts",
                        IdColumn = "LaborChartId",
                        CodeColumn = "LaborCode",
                        IdRefs = new[] { "laborchartid" },
                        CodeRefs = new[] { "laborcode" },
                        LedgerColumns = new[] { "IncomeLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Labor Chart %" }
                    },
                    new DataResetKey
                    {
                        Table = "ScheduledServices",
                        IdColumn = "ScheduledServiceId",
                        CodeColumn = "ServiceCode",
                        IdRefs = new[] { "scheduledserviceid" },
                        LedgerColumns = new[] { "IncomeLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Scheduled Service %" }
                    }
                }
            },
            new()
            {
                Key = "service-policies",
                Name = "Service Policies",
                Icon = "fa-solid fa-file-shield",
                Description = "Warranty / service policies, their schedules and associated ledgers.",
                Section = SectionSettings,
                Area = "Service Settings",
                Tables = new[] { "servicepolicies", "servicepolicyschedules" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "ServicePolicies",
                        IdColumn = "ServicePolicyId",
                        CodeColumn = "PolicyCode",
                        IdRefs = new[] { "servicepolicyid" },
                        CodeRefs = new[] { "policycode" },
                        LedgerColumns = new[] { "AssociatedLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Service Policy %" }
                    }
                }
            },

            //===================================================
            // SETTINGS : Membership Settings (a card makes its
            // policy, its complimentary Membership Services row
            // and four ledgers : they go together)
            //===================================================

            new()
            {
                Key = "membership-cards",
                Name = "Membership Cards",
                Icon = "fa-solid fa-id-card",
                Description = "Membership cards, their policies and complimentary services, with the fee / discount / income / expense ledgers.",
                Section = SectionSettings,
                Area = "Membership Settings",
                Tables = new[] { "membershipcards", "membershippolicies", "membershipservices" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "MembershipCards",
                        IdColumn = "MembershipCardId",
                        CodeColumn = "CardCode",
                        IdRefs = new[] { "membershipcardid" },
                        LedgerColumns = new[] { "FeeLedgerCode", "DiscountLedgerCode" },
                        LedgerRemarks = new[] { "System generated from Membership Cards %" }
                    },
                    new DataResetKey
                    {
                        Table = "MembershipPolicies",
                        IdColumn = "MembershipPolicyId",
                        CodeColumn = "PolicyCode",
                        IdRefs = new[] { "membershippolicyid" }
                    },
                    new DataResetKey
                    {
                        Table = "MembershipServices",
                        IdColumn = "MembershipServiceId",
                        CodeColumn = "ServiceCode",
                        IdRefs = new[] { "membershipserviceid" },
                        LedgerColumns = new[] { "IncomeLedgerCode", "ExpenseLedgerCode" }
                    }
                }
            },

            //===================================================
            // SETTINGS : Account Settings (each account is itself
            // a ledger : its code must not be used by a voucher)
            //===================================================

            new()
            {
                Key = "banks",
                Name = "Banks & Bank Accounts",
                Icon = "fa-solid fa-building-columns",
                Description = "Bank list and bank accounts.",
                Section = SectionSettings,
                Area = "Account Settings",
                Tables = new[] { "banksetup", "bankaccounts" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "BankSetup",
                        IdColumn = "BankSetupId",
                        CodeColumn = "BankCode",
                        IdRefs = new[] { "banksetupid" },
                        CodeRefs = new[] { "bankcode", "issuingbank" }
                    },
                    new DataResetKey
                    {
                        Table = "BankAccounts",
                        IdColumn = "BankAccountId",
                        CodeColumn = "BankAccountCode",
                        IdRefs = new[] { "bankaccountid" },
                        CodeRefs = new[] { "bankaccountcode", "linkedbankaccount" },
                        CodeIsLedger = true
                    }
                }
            },
            new()
            {
                Key = "cards",
                Name = "Cards & Card Charges",
                Icon = "fa-solid fa-credit-card",
                Description = "Card list and the card charge rates of the POS accounts.",
                Section = SectionSettings,
                Area = "Account Settings",
                Tables = new[] { "cardsetup", "cardcharges" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "CardSetup",
                        IdColumn = "CardSetupId",
                        CodeColumn = "CardCode",
                        IdRefs = new[] { "cardsetupid" },
                        CodeRefs = new[] { "cardcode" }
                    }
                }
            },
            new()
            {
                Key = "cash-accounts",
                Name = "Cash Accounts",
                Icon = "fa-solid fa-money-bill-wave",
                Description = "Cash accounts (cash in hand, petty cash ...).",
                Section = SectionSettings,
                Area = "Account Settings",
                Tables = new[] { "cashaccounts" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "CashAccounts",
                        IdColumn = "CashAccountId",
                        CodeColumn = "CashAccountCode",
                        IdRefs = new[] { "cashaccountid" },
                        CodeRefs = new[] { "cashaccountcode" },
                        CodeIsLedger = true
                    }
                }
            },
            new()
            {
                Key = "mfs-accounts",
                Name = "MFS Accounts",
                Icon = "fa-solid fa-mobile-screen-button",
                Description = "bKash / Nagad / Rocket wallets.",
                Section = SectionSettings,
                Area = "Account Settings",
                Tables = new[] { "mfsaccounts" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "MFSAccounts",
                        IdColumn = "MFSAccountId",
                        CodeColumn = "MFSAccountCode",
                        IdRefs = new[] { "mfsaccountid" },
                        CodeRefs = new[] { "mfsaccountcode" },
                        CodeIsLedger = true
                    }
                }
            },
            new()
            {
                Key = "pos-accounts",
                Name = "POS Accounts",
                Icon = "fa-solid fa-cash-register",
                Description = "Card machines (POS terminals).",
                Section = SectionSettings,
                Area = "Account Settings",
                Tables = new[] { "posaccounts" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "POSAccounts",
                        IdColumn = "POSAccountId",
                        CodeColumn = "POSAccountCode",
                        IdRefs = new[] { "posaccountid" },
                        CodeRefs = new[] { "posaccountcode" },
                        CodeIsLedger = true
                    }
                }
            },
            new()
            {
                Key = "emi-accounts",
                Name = "EMI Accounts & Schemes",
                Icon = "fa-solid fa-calendar-check",
                Description = "EMI accounts and the EMI reimbursement schemes.",
                Section = SectionSettings,
                Area = "Account Settings",
                Tables = new[] { "emiaccounts", "emireimbursementschemes" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "EmiAccounts",
                        IdColumn = "EmiAccountId",
                        CodeColumn = "EmiAccountCode",
                        IdRefs = new[] { "emiaccountid" },
                        CodeRefs = new[] { "emiaccountcode" },
                        CodeIsLedger = true
                    },
                    new DataResetKey
                    {
                        Table = "EmiReimbursementSchemes",
                        IdColumn = "EmiReimbursementSchemeId",
                        CodeColumn = "SchemeCode",
                        IdRefs = new[] { "emireimbursementschemeid" },
                        CodeRefs = new[] { "schemecode" }
                    }
                }
            },

            //===================================================
            // SETTINGS : General Settings
            //===================================================

            new()
            {
                Key = "locations",
                Name = "Locations",
                Icon = "fa-solid fa-location-dot",
                Description = "Areas / thanas with their district and post code (the shared Bangladesh list).",
                Section = SectionSettings,
                Area = "General Settings",
                KeepInTemplate = true,
                Tables = new[] { "locations" },
                Keys = new[]
                {
                    new DataResetKey
                    {
                        Table = "Locations",
                        IdColumn = "LocationId",
                        CodeColumn = "LocationCode",
                        IdRefs = new[] { "locationid" },
                        CodeRefs = new[] { "locationcode" }
                    }
                }
            }
        };

    public static DataResetGroup? ByKey
    (
        string key
    )
    {
        return All.FirstOrDefault(g => string.Equals(g.Key, key, StringComparison.OrdinalIgnoreCase));
    }

    // The Settings key of a table (null : not a Settings key table)
    public static DataResetKey? KeyOf
    (
        string tableName
    )
    {
        return All
            .SelectMany(g => g.Keys)
            .FirstOrDefault(k => string.Equals(k.Table, tableName, StringComparison.OrdinalIgnoreCase));
    }

    public static DataResetGroup? GroupOf
    (
        string tableName
    )
    {
        return All.FirstOrDefault
        (
            g =>
                !g.IsSpecial
                &&
                g.Matches(tableName)
        );
    }
}
