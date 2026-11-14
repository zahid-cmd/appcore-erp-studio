//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.FixedAssetsManagement;


//===============================================================
// Fixed Assets Management : DTOs (hand-written pages).
// Dates : yyyy-MM-dd. A period : yyyymm (202611).
//===============================================================

public class FaLookupDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Locations : the branch
    public long BranchId { get; set; }
}

public class FaLedgerDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // General Ledger / Supplier / Customer
    public string LedgerType { get; set; } = string.Empty;
}

public class FaReasonDto
{
    public string Reason { get; set; } = string.Empty;
}


//---------------------------------------------------------------
// Setup
//---------------------------------------------------------------

public class FaCategoryDto
{
    public long FaCategoryId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    // '' (not declared yet) / None / StraightLine / ReducingBalance
    public string Method { get; set; } = string.Empty;

    public decimal RatePercent { get; set; }

    public int LifeYears { get; set; }

    public decimal ResidualPercent { get; set; }

    // Made with the asset group : "PPE - <name>" / "ACD - <name>"
    public string CostLedgerCode { get; set; } = string.Empty;

    public string CostLedgerName { get; set; } = string.Empty;

    public string AccumLedgerCode { get; set; } = string.Empty;

    public string AccumLedgerName { get; set; } = string.Empty;

    public string ExpenseLedgerCode { get; set; } = string.Empty;

    public string ExpenseLedgerName { get; set; } = string.Empty;

    // Read only : its depreciation is declared (Depreciation of
    // Fixed Assets), and the rule in words
    public bool IsDeclared { get; set; }

    public string RuleText { get; set; } = string.Empty;

    public string GainLedgerCode { get; set; } = string.Empty;

    public string LossLedgerCode { get; set; } = string.Empty;

    public decimal CapitalThreshold { get; set; }

    public bool AllowGroupCard { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // Read only : the asset cards of the category
    public int AssetCount { get; set; }
}

public class FaLocationDto
{
    public long FaLocationId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public int AssetCount { get; set; }
}

public class FaConfigurationDto
{
    public bool RequireLocation { get; set; }

    public bool RequireCustodian { get; set; }

    public bool AllowAssetRule { get; set; } = true;

    public bool AllowRunningMonth { get; set; }

    public string AssetNoPrefix { get; set; } = "FA";

    public int AssetNoDigits { get; set; } = 5;
}

// What every page of the module needs
public class FaLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    public List<FaLookupDto> Branches { get; set; } = new();

    // Active categories, with their rules
    public List<FaCategoryDto> Categories { get; set; } = new();

    // Active locations
    public List<FaLookupDto> Locations { get; set; } = new();

    // Active employees (the custodian)
    public List<FaLookupDto> Employees { get; set; } = new();

    // Ledgers a document can use (never a cash / bank ledger)
    public List<FaLedgerDto> Ledgers { get; set; } = new();

    public FaConfigurationDto Configuration { get; set; } = new();

    // The account sub groups the ledgers of an asset group are made
    // under, "<code>  <name>" ('' : not found)
    public string PpeSubGroup { get; set; } = string.Empty;

    public string AcdSubGroup { get; set; } = string.Empty;

    // "Payable To" of an acquisition / an improvement : the ledgers
    // under the account sub group Liability For Capital Assets
    // (found by its code), and that sub group as "<code>  <name>"
    public List<FaLedgerDto> PayableLedgers { get; set; } = new();

    public string PayableSubGroup { get; set; } = string.Empty;

    // The code the next new record gets (shown on the add form)
    public string NextGroupCode { get; set; } = string.Empty;

    public string NextLocationCode { get; set; } = string.Empty;

    public string NextAcquisitionCode { get; set; } = string.Empty;

    // Posting Setup : ASSET-PURCHASE-PAYABLE / ASSET-SALE-RECEIVABLE
    // ('' : not chosen yet)
    public string PayableLedgerCode { get; set; } = string.Empty;

    public string ReceivableLedgerCode { get; set; } = string.Empty;
}


//---------------------------------------------------------------
// Asset cards
//---------------------------------------------------------------

public class FaAssetEventDto
{
    public string Date { get; set; } = string.Empty;

    // Acquired / Opening / Depreciation / Transfer / Improvement /
    // Maintenance / Disposal
    public string Kind { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}

public class FaAssetDto
{
    public long FaAssetId { get; set; }

    public Guid PublicId { get; set; }

    public string AssetNo { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long FaCategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // 0 = none
    public long FaLocationId { get; set; }

    public string LocationName { get; set; } = string.Empty;

    public long CustodianEmployeeId { get; set; }

    public string CustodianName { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string PurchaseRef { get; set; } = string.Empty;

    public string PurchaseDate { get; set; } = string.Empty;

    public string UseDate { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Cost { get; set; }

    public decimal ImprovementCost { get; set; }

    // Cost + ImprovementCost
    public decimal TotalCost { get; set; }

    public decimal ResidualValue { get; set; }

    public string Method { get; set; } = "StraightLine";

    public decimal RatePercent { get; set; }

    public int LifeYears { get; set; }

    // An opening asset : the Journal Voucher that put it in the
    // ledgers ('' : none)
    public string JournalVoucherNo { get; set; } = string.Empty;

    public decimal OpeningAccumulated { get; set; }

    public decimal AccumulatedDepreciation { get; set; }

    // TotalCost - AccumulatedDepreciation
    public decimal BookValue { get; set; }

    // The charge of the next month (0 : fully depreciated)
    public decimal MonthlyCharge { get; set; }

    // yyyymm (0 = none) and "Nov 2026"
    public int LastRunPeriod { get; set; }

    public string LastRunText { get; set; } = string.Empty;

    public string Status { get; set; } = "In Use";

    // Acquisition / Opening
    public string Source { get; set; } = "Opening";

    public string AcquisitionCode { get; set; } = string.Empty;

    public string DisposedDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Read only : what may still be changed
    // (cost, dates, opening depreciation : an opening card with no
    // run after it and no movement)
    public bool CanEditMoney { get; set; }

    // (method, rate, life : before the first run of the card)
    public bool CanEditRule { get; set; }

    // One card only : everything that happened to it
    public List<FaAssetEventDto> History { get; set; } = new();
}

// An opening asset (create), or the changes of a card (update)
public class SaveFaAssetDto
{
    public string Name { get; set; } = string.Empty;

    public long FaCategoryId { get; set; }

    public string Description { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public long FaLocationId { get; set; }

    public long CustodianEmployeeId { get; set; }

    public string SupplierName { get; set; } = string.Empty;

    public string PurchaseRef { get; set; } = string.Empty;

    public string PurchaseDate { get; set; } = string.Empty;

    public string UseDate { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Cost { get; set; }

    public decimal ResidualValue { get; set; }

    public string Method { get; set; } = "StraightLine";

    public decimal RatePercent { get; set; }

    public int LifeYears { get; set; }

    // Opening assets : the depreciation to date, and the last month
    // it covers (yyyymm; 0 with no depreciation yet)
    public decimal OpeningAccumulated { get; set; }

    public int DepreciatedUpTo { get; set; }

    // In Use / Idle / Under Repair
    public string Status { get; set; } = "In Use";

    public string Remarks { get; set; } = string.Empty;
}


//---------------------------------------------------------------
// Acquisitions
//---------------------------------------------------------------

public class FaAcquisitionLineDto
{
    public long FaCategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal UnitCost { get; set; }

    public decimal Amount { get; set; }

    // Each / Group
    public string CardMode { get; set; } = "Each";

    public long FaLocationId { get; set; }

    public string LocationName { get; set; } = string.Empty;

    public long CustodianEmployeeId { get; set; }

    public string CustodianName { get; set; } = string.Empty;

    public string UseDate { get; set; } = string.Empty;
}

public class FaAcquisitionDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string AcquisitionDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string RefNo { get; set; } = string.Empty;

    public string CreditLedgerCode { get; set; } = string.Empty;

    public string CreditLedgerType { get; set; } = "General Ledger";

    public string CreditLedgerName { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    // Draft / Posted
    public string Status { get; set; } = "Draft";

    public string JournalVoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public int ItemCount { get; set; }

    // The asset cards it made (posted)
    public List<string> AssetNos { get; set; } = new();

    public List<FaAcquisitionLineDto> Lines { get; set; } = new();
}


//---------------------------------------------------------------
// Depreciation
//---------------------------------------------------------------

public class FaRunLineDto
{
    public long FaAssetId { get; set; }

    public string AssetNo { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public decimal Cost { get; set; }

    public decimal OpeningAccumulated { get; set; }

    public decimal Charge { get; set; }

    public decimal ClosingAccumulated { get; set; }

    public decimal BookValue { get; set; }

    // "Fully depreciated this month" ...
    public string Note { get; set; } = string.Empty;
}

public class FaRunDto
{
    public Guid PublicId { get; set; }

    // '' : a preview, not posted
    public string Code { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public int Period { get; set; }

    public string PeriodText { get; set; } = string.Empty;

    public string RunDate { get; set; } = string.Empty;

    public int AssetCount { get; set; }

    public decimal TotalAmount { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // The last run of its branch : it can be undone
    public bool IsLast { get; set; }

    public List<FaRunLineDto> Lines { get; set; } = new();
}

// A branch on the Depreciation Runs page
public class FaRunBranchDto
{
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Assets in use
    public int AssetCount { get; set; }

    // yyyymm (0 : no run yet)
    public int LastPeriod { get; set; }

    public string LastPeriodText { get; set; } = string.Empty;

    // The month the next run is for (0 : nothing to run)
    public int NextPeriod { get; set; }

    public string NextPeriodText { get; set; } = string.Empty;
}

public class PostFaRunDto
{
    public long BranchId { get; set; }

    public int Period { get; set; }

    public string Remarks { get; set; } = string.Empty;
}

public class FaScheduleRowDto
{
    public int Period { get; set; }

    public string PeriodText { get; set; } = string.Empty;

    public decimal Opening { get; set; }

    public decimal Charge { get; set; }

    public decimal Closing { get; set; }

    public decimal BookValue { get; set; }

    // true : a posted run; false : what is still to come
    public bool Posted { get; set; }
}

public class FaScheduleDto
{
    public FaAssetDto Asset { get; set; } = new();

    public List<FaScheduleRowDto> Rows { get; set; } = new();

    // Months still to depreciate, and the month it ends
    public int MonthsLeft { get; set; }

    public string EndsText { get; set; } = string.Empty;
}


//---------------------------------------------------------------
// Disposal
//---------------------------------------------------------------

public class FaDisposalDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string DisposalDate { get; set; } = string.Empty;

    public long FaAssetId { get; set; }

    public string AssetNo { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    // Sale / Scrap / Write Off / Lost
    public string Kind { get; set; } = "Sale";

    public string BuyerName { get; set; } = string.Empty;

    public decimal SalePrice { get; set; }

    public string DebitLedgerCode { get; set; } = string.Empty;

    public string DebitLedgerType { get; set; } = "General Ledger";

    public string DebitLedgerName { get; set; } = string.Empty;

    public decimal Cost { get; set; }

    public decimal Accumulated { get; set; }

    public decimal BookValue { get; set; }

    // Price less book value (a loss is negative)
    public decimal GainLoss { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}


//---------------------------------------------------------------
// Reports
//---------------------------------------------------------------

// A category of the Fixed Asset Schedule
public class FaScheduleReportRowDto
{
    public string GroupName { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public decimal CostOpening { get; set; }

    public decimal Additions { get; set; }

    public decimal Disposals { get; set; }

    public decimal CostClosing { get; set; }

    public decimal DepOpening { get; set; }

    public decimal Charge { get; set; }

    public decimal DepOnDisposals { get; set; }

    public decimal DepClosing { get; set; }

    public decimal NbvOpening { get; set; }

    public decimal NbvClosing { get; set; }
}

public class FaScheduleReportDto
{
    public string FromDate { get; set; } = string.Empty;

    public string ToDate { get; set; } = string.Empty;

    // '' : all branches
    public string BranchName { get; set; } = string.Empty;

    public List<FaScheduleReportRowDto> Rows { get; set; } = new();

    public FaScheduleReportRowDto Total { get; set; } = new();
}

public class FaVerificationLineDto
{
    public long FaAssetId { get; set; }

    public string AssetNo { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string LocationName { get; set; } = string.Empty;

    public string CustodianName { get; set; } = string.Empty;

    // Pending / Found / Missing
    public string Result { get; set; } = "Pending";

    public string Note { get; set; } = string.Empty;
}

public class FaVerificationDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string VerificationDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // 0 : every location of the branch
    public long FaLocationId { get; set; }

    public string LocationName { get; set; } = string.Empty;

    // Draft / Closed
    public string Status { get; set; } = "Draft";

    public string ExtraItems { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public int AssetCount { get; set; }

    public int FoundCount { get; set; }

    public int MissingCount { get; set; }

    public int PendingCount { get; set; }

    public List<FaVerificationLineDto> Lines { get; set; } = new();
}
