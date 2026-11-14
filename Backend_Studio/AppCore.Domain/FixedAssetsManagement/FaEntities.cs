//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.FixedAssetsManagement;


//===============================================================
// Fixed Assets Management (FixedAssets_Engine.sql; hand-written
// pages, no Code Sync).
//
// FaCategories         FAC-0001 : an ASSET GROUP (Asset Groups
//                      page). Making one makes its two ledgers :
//                      "PPE - <name>" (the cost) and "ACD - <name>"
//                      (accumulated depreciation). Its depreciation
//                      (method, rate / life, residual, the expense
//                      ledger) is declared on Depreciation of Fixed
//                      Assets.
// FaLocations          FAL-0001 : where an asset is kept
// FaConfiguration      one row : switches and numbering
// FaAssets             the asset cards
// FaAcquisitions       FAQ-0001 : buying assets (Draft -> Posted :
// FaAcquisitionLines   a Journal Voucher and the cards)
// FaDepreciationRuns   FDR-0001 : a month of a branch
// FaDepreciationLines  (one Journal Voucher)
// FaDisposals          FAD-0001 : sale / scrap / write-off / lost
// FaVerifications      FAV-0001 : the physical count
// FaVerificationLines
//===============================================================

public class FaCategories
{
    public long FaCategoryId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    // '' (not declared yet) / None (never depreciated, e.g. land) /
    // StraightLine / ReducingBalance
    public string Method { get; set; } = string.Empty;

    // % a year
    public decimal RatePercent { get; set; }

    // Straight line : the useful life (0 = use the rate)
    public int LifeYears { get; set; }

    public decimal ResidualPercent { get; set; }

    public string CostLedgerCode { get; set; } = string.Empty;

    public string AccumLedgerCode { get; set; } = string.Empty;

    public string ExpenseLedgerCode { get; set; } = string.Empty;

    // '' = the Posting Setup ledger
    public string GainLedgerCode { get; set; } = string.Empty;

    public string LossLedgerCode { get; set; } = string.Empty;

    public decimal CapitalThreshold { get; set; }

    public bool AllowGroupCard { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FaLocations
{
    public long FaLocationId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FaConfiguration
{
    public long FaConfigurationId { get; set; }

    public bool RequireLocation { get; set; }

    public bool RequireCustodian { get; set; }

    // A card may have its own method / rate / life (until its
    // first depreciation run)
    public bool AllowAssetRule { get; set; } = true;

    // A run may be made for a month that has not ended
    public bool AllowRunningMonth { get; set; }

    public string AssetNoPrefix { get; set; } = "FA";

    public int AssetNoDigits { get; set; } = 5;

    // The account sub groups the ledgers of an asset group are made
    // under ('' : found by name, "Property, Plant & Equipment" and
    // "Accumulated Depreciation")
    public string PpeSubGroupCode { get; set; } = string.Empty;

    public string AcdSubGroupCode { get; set; } = string.Empty;

    // The account sub group whose ledgers an acquisition / an
    // improvement is payable to (Liability For Capital Assets), by
    // its code
    public string PayableSubGroupCode { get; set; } = "SUB-003-002-005";

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FaAssets
{
    public long FaAssetId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string AssetNo { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long FaCategoryId { get; set; }

    public string Description { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public long? FaLocationId { get; set; }

    public long? CustodianEmployeeId { get; set; }

    public string SupplierName { get; set; } = string.Empty;

    public string PurchaseRef { get; set; } = string.Empty;

    public DateOnly PurchaseDate { get; set; }

    // Depreciation starts in the month of this date
    public DateOnly UseDate { get; set; }

    public decimal Quantity { get; set; } = 1;

    public decimal Cost { get; set; }

    public decimal ImprovementCost { get; set; }

    public decimal ResidualValue { get; set; }

    public string Method { get; set; } = "StraightLine";

    public decimal RatePercent { get; set; }

    public int LifeYears { get; set; }

    // An opening asset : the depreciation before the module
    public decimal OpeningAccumulated { get; set; }

    // Everything to date (the opening and the runs)
    public decimal AccumulatedDepreciation { get; set; }

    // yyyymm of the last month depreciated (0 = none yet)
    public int LastRunPeriod { get; set; }

    // In Use / Idle / Under Repair / Disposed / Written Off / Lost
    public string Status { get; set; } = "In Use";

    // Acquisition / Opening
    public string Source { get; set; } = "Opening";

    public long? FaAcquisitionId { get; set; }

    // An opening asset : the Journal Voucher that puts it in the
    // ledgers (Dr its PPE ledger / Cr its ACD ledger and the opening
    // ledger of Posting Setup)
    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public DateOnly? DisposedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FaAcquisitions
{
    public long FaAcquisitionId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public DateOnly AcquisitionDate { get; set; }

    public long BranchId { get; set; }

    public string SupplierName { get; set; } = string.Empty;

    public string RefNo { get; set; } = string.Empty;

    public string CreditLedgerCode { get; set; } = string.Empty;

    // Supplier / General Ledger
    public string CreditLedgerType { get; set; } = "General Ledger";

    public decimal TotalAmount { get; set; }

    // Draft / Posted
    public string Status { get; set; } = "Draft";

    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FaAcquisitionLines
{
    public long FaAcquisitionLineId { get; set; }

    public long FaAcquisitionId { get; set; }

    public long FaCategoryId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SerialNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal UnitCost { get; set; }

    public decimal Amount { get; set; }

    // Each (one card an item) / Group (one card with the quantity)
    public string CardMode { get; set; } = "Each";

    public long? FaLocationId { get; set; }

    public long? CustodianEmployeeId { get; set; }

    public DateOnly UseDate { get; set; }
}

public class FaDepreciationRuns
{
    public long FaDepreciationRunId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // yyyymm
    public int Period { get; set; }

    public DateOnly RunDate { get; set; }

    public int AssetCount { get; set; }

    public decimal TotalAmount { get; set; }

    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // An undone run
    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

public class FaDepreciationLines
{
    public long FaDepreciationLineId { get; set; }

    public long FaDepreciationRunId { get; set; }

    public long FaAssetId { get; set; }

    public long FaCategoryId { get; set; }

    public int Period { get; set; }

    public decimal Cost { get; set; }

    public decimal OpeningAccumulated { get; set; }

    public decimal Charge { get; set; }

    // The asset's LastRunPeriod before the run
    public int PrevRunPeriod { get; set; }
}

public class FaDisposals
{
    public long FaDisposalId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public DateOnly DisposalDate { get; set; }

    public long FaAssetId { get; set; }

    public long BranchId { get; set; }

    // Sale / Scrap / Write Off / Lost
    public string Kind { get; set; } = "Sale";

    public string BuyerName { get; set; } = string.Empty;

    public decimal SalePrice { get; set; }

    public string DebitLedgerCode { get; set; } = string.Empty;

    // Customer / General Ledger
    public string DebitLedgerType { get; set; } = "General Ledger";

    public decimal Cost { get; set; }

    public decimal Accumulated { get; set; }

    public decimal BookValue { get; set; }

    // Price less book value (a loss is negative)
    public decimal GainLoss { get; set; }

    public string PrevStatus { get; set; } = "In Use";

    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

public class FaVerifications
{
    public long FaVerificationId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public DateOnly VerificationDate { get; set; }

    public long BranchId { get; set; }

    public long? FaLocationId { get; set; }

    // Draft / Closed
    public string Status { get; set; } = "Draft";

    public string ExtraItems { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FaVerificationLines
{
    public long FaVerificationLineId { get; set; }

    public long FaVerificationId { get; set; }

    public long FaAssetId { get; set; }

    // Pending / Found / Missing
    public string Result { get; set; } = "Pending";

    public string Note { get; set; } = string.Empty;
}
