//===============================================================
// Fixed Assets Management : models (the DTOs of the API, in
// PascalCase). Dates : yyyy-MM-dd. A period : yyyymm (202611).
//===============================================================

export interface FaLookup
{
    Id: number;
    Code: string;
    Name: string;
    // Locations, employees : the branch
    BranchId: number;
}

export interface FaLedger
{
    LedgerCode: string;
    LedgerName: string;
    // General Ledger / Supplier / Customer
    LedgerType: string;
}

//---------------------------------------------------------------
// Setup
//---------------------------------------------------------------

export interface FaCategory
{
    FaCategoryId: number;
    PublicId: string;
    Code: string;
    Name: string;
    GroupName: string;
    // '' (not declared yet) / None / StraightLine / ReducingBalance
    Method: string;
    // % a year
    RatePercent: number;
    // Straight line : the useful life (0 = use the rate)
    LifeYears: number;
    ResidualPercent: number;
    // Made with the asset group : "PPE - <name>" / "ACD - <name>"
    CostLedgerCode: string;
    CostLedgerName: string;
    AccumLedgerCode: string;
    AccumLedgerName: string;
    // Picked on Depreciation of Fixed Assets
    ExpenseLedgerCode: string;
    ExpenseLedgerName: string;
    // Its depreciation is declared, and the rule in words
    IsDeclared: boolean;
    RuleText: string;
    // '' = the Posting Setup ledger
    GainLedgerCode: string;
    LossLedgerCode: string;
    // An item below it is an expense (0 = no limit)
    CapitalThreshold: number;
    AllowGroupCard: boolean;
    Remarks: string;
    IsActive: boolean;
    AssetCount: number;
}

export interface FaLocation
{
    FaLocationId: number;
    PublicId: string;
    Code: string;
    Name: string;
    BranchId: number;
    BranchName: string;
    Remarks: string;
    IsActive: boolean;
    AssetCount: number;
}

export interface FaConfiguration
{
    RequireLocation: boolean;
    RequireCustodian: boolean;
    // A card may have its own method / rate / life
    AllowAssetRule: boolean;
    // A run may be made for a month that has not ended
    AllowRunningMonth: boolean;
    AssetNoPrefix: string;
    AssetNoDigits: number;
}

// What every page of the module needs
export interface FaLookups
{
    Today: string;
    Branches: FaLookup[];
    // Active categories, with their rules
    Categories: FaCategory[];
    // Active locations (BranchId : their branch)
    Locations: FaLookup[];
    // Active employees : the custodian
    Employees: FaLookup[];
    // Ledgers a document can use (never cash / bank)
    Ledgers: FaLedger[];
    Configuration: FaConfiguration;
    // The account sub groups the ledgers of an asset group are made
    // under, "<code>  <name>" ('' : not found)
    PpeSubGroup: string;
    AcdSubGroup: string;
    // "Payable To" : the ledgers under the account sub group
    // Liability For Capital Assets (found by its code), and that
    // sub group as "<code>  <name>"
    PayableLedgers: FaLedger[];
    PayableSubGroup: string;
    // The code the next new record gets (shown on the add form)
    NextGroupCode: string;
    NextLocationCode: string;
    NextAcquisitionCode: string;
    // Posting Setup defaults ('' : not chosen yet)
    PayableLedgerCode: string;
    ReceivableLedgerCode: string;
}

//---------------------------------------------------------------
// Asset cards
//---------------------------------------------------------------

export interface FaAssetEvent
{
    Date: string;
    // Acquired / Opening / Depreciation / Disposal
    Kind: string;
    Code: string;
    Text: string;
    Amount: number;
}

export interface FaAsset
{
    FaAssetId: number;
    PublicId: string;
    AssetNo: string;
    Name: string;
    FaCategoryId: number;
    CategoryName: string;
    Description: string;
    Brand: string;
    Model: string;
    SerialNo: string;
    BranchId: number;
    BranchName: string;
    // 0 = none
    FaLocationId: number;
    LocationName: string;
    CustodianEmployeeId: number;
    CustodianName: string;
    SupplierName: string;
    PurchaseRef: string;
    PurchaseDate: string;
    UseDate: string;
    Quantity: number;
    Cost: number;
    ImprovementCost: number;
    // Cost + ImprovementCost
    TotalCost: number;
    ResidualValue: number;
    Method: string;
    RatePercent: number;
    LifeYears: number;
    // An opening asset : its Journal Voucher ('' : none)
    JournalVoucherNo: string;
    OpeningAccumulated: number;
    AccumulatedDepreciation: number;
    BookValue: number;
    // The charge of the next month (0 : fully depreciated)
    MonthlyCharge: number;
    LastRunPeriod: number;
    LastRunText: string;
    // In Use / Idle / Under Repair / Disposed / Written Off / Lost
    Status: string;
    // Acquisition / Opening
    Source: string;
    AcquisitionCode: string;
    DisposedDate: string;
    Remarks: string;
    // cost, dates, opening depreciation may still be changed
    CanEditMoney: boolean;
    // method, rate, life may still be changed
    CanEditRule: boolean;
    // One card only
    History: FaAssetEvent[];
}

// An opening asset (create) or the changes of a card (update)
export interface SaveFaAsset
{
    Name: string;
    FaCategoryId: number;
    Description: string;
    Brand: string;
    Model: string;
    SerialNo: string;
    BranchId: number;
    FaLocationId: number;
    CustodianEmployeeId: number;
    SupplierName: string;
    PurchaseRef: string;
    PurchaseDate: string;
    UseDate: string;
    Quantity: number;
    Cost: number;
    ResidualValue: number;
    Method: string;
    RatePercent: number;
    LifeYears: number;
    // Opening : the depreciation to date and the last month it
    // covers (yyyymm; 0 with none)
    OpeningAccumulated: number;
    DepreciatedUpTo: number;
    // In Use / Idle / Under Repair
    Status: string;
    Remarks: string;
}

//---------------------------------------------------------------
// Acquisitions
//---------------------------------------------------------------

export interface FaAcquisitionLine
{
    FaCategoryId: number;
    CategoryName: string;
    Name: string;
    Brand: string;
    Model: string;
    SerialNo: string;
    Quantity: number;
    UnitCost: number;
    Amount: number;
    // Each (one card an item) / Group (one card with the quantity)
    CardMode: string;
    FaLocationId: number;
    LocationName: string;
    CustodianEmployeeId: number;
    CustodianName: string;
    UseDate: string;
}

export interface FaAcquisition
{
    PublicId: string;
    Code: string;
    AcquisitionDate: string;
    BranchId: number;
    BranchName: string;
    SupplierName: string;
    RefNo: string;
    // The ledger credited : a supplier or a payable ledger
    // ('' on save : the Posting Setup payable ledger)
    CreditLedgerCode: string;
    CreditLedgerType: string;
    CreditLedgerName: string;
    TotalAmount: number;
    // Draft / Posted
    Status: string;
    JournalVoucherNo: string;
    Remarks: string;
    ItemCount: number;
    // The asset cards it made (posted)
    AssetNos: string[];
    // One acquisition only
    Lines: FaAcquisitionLine[];
}

//---------------------------------------------------------------
// Depreciation
//---------------------------------------------------------------

export interface FaRunLine
{
    FaAssetId: number;
    AssetNo: string;
    Name: string;
    CategoryName: string;
    Cost: number;
    OpeningAccumulated: number;
    Charge: number;
    ClosingAccumulated: number;
    BookValue: number;
    Note: string;
}

export interface FaRun
{
    PublicId: string;
    // '' : a preview, not posted
    Code: string;
    BranchId: number;
    BranchName: string;
    Period: number;
    PeriodText: string;
    RunDate: string;
    AssetCount: number;
    TotalAmount: number;
    JournalVoucherNo: string;
    Remarks: string;
    // The last run of its branch : it can be undone
    IsLast: boolean;
    // One run / a preview only
    Lines: FaRunLine[];
}

// A branch on the Depreciation Runs page
export interface FaRunBranch
{
    BranchId: number;
    BranchName: string;
    AssetCount: number;
    // yyyymm (0 : no run yet)
    LastPeriod: number;
    LastPeriodText: string;
    // The month the next run is for (0 : nothing to run)
    NextPeriod: number;
    NextPeriodText: string;
}

export interface FaScheduleRow
{
    Period: number;
    PeriodText: string;
    Opening: number;
    Charge: number;
    Closing: number;
    BookValue: number;
    // true : a posted run; false : still to come
    Posted: boolean;
}

export interface FaSchedule
{
    Asset: FaAsset;
    Rows: FaScheduleRow[];
    MonthsLeft: number;
    EndsText: string;
}

//---------------------------------------------------------------
// Movements and disposal
//---------------------------------------------------------------

export interface FaDisposal
{
    PublicId: string;
    Code: string;
    DisposalDate: string;
    FaAssetId: number;
    AssetNo: string;
    AssetName: string;
    CategoryName: string;
    BranchName: string;
    // Sale / Scrap / Write Off / Lost
    Kind: string;
    BuyerName: string;
    SalePrice: number;
    // The ledger debited with the price : a customer or a
    // receivable ledger ('' on save : the Posting Setup ledger)
    DebitLedgerCode: string;
    DebitLedgerType: string;
    DebitLedgerName: string;
    Cost: number;
    Accumulated: number;
    BookValue: number;
    // Price less book value (a loss is negative)
    GainLoss: number;
    JournalVoucherNo: string;
    Remarks: string;
}

//---------------------------------------------------------------
// Reports
//---------------------------------------------------------------

export interface FaScheduleReportRow
{
    GroupName: string;
    CategoryName: string;
    CostOpening: number;
    Additions: number;
    Disposals: number;
    CostClosing: number;
    DepOpening: number;
    Charge: number;
    DepOnDisposals: number;
    DepClosing: number;
    NbvOpening: number;
    NbvClosing: number;
}

export interface FaScheduleReport
{
    FromDate: string;
    ToDate: string;
    // '' : all branches
    BranchName: string;
    Rows: FaScheduleReportRow[];
    Total: FaScheduleReportRow;
}

export interface FaVerificationLine
{
    FaAssetId: number;
    AssetNo: string;
    Name: string;
    CategoryName: string;
    LocationName: string;
    CustodianName: string;
    // Pending / Found / Missing
    Result: string;
    Note: string;
}

export interface FaVerification
{
    PublicId: string;
    Code: string;
    VerificationDate: string;
    BranchId: number;
    BranchName: string;
    // 0 : every location of the branch
    FaLocationId: number;
    LocationName: string;
    // Draft / Closed
    Status: string;
    ExtraItems: string;
    Remarks: string;
    AssetCount: number;
    FoundCount: number;
    MissingCount: number;
    PendingCount: number;
    // One verification only
    Lines: FaVerificationLine[];
}

//---------------------------------------------------------------
// Small helpers every page uses
//---------------------------------------------------------------

export const FA_EMPTY_GUID =
    '00000000-0000-0000-0000-000000000000';

export const FA_METHODS =
[
    { label:'Straight line', value:'StraightLine' },
    { label:'Reducing balance', value:'ReducingBalance' }
];

// With "No depreciation" (land ...) : Depreciation of Fixed Assets
export const FA_METHODS_ALL =
[
    { label:'Straight line', value:'StraightLine' },
    { label:'Reducing balance', value:'ReducingBalance' },
    { label:'No depreciation', value:'None' }
];

export const FA_LIVE_STATUSES =
    ['In Use', 'Idle', 'Under Repair'];

// 1,234.50
export function faMoney(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// 1,234.5 (no forced decimals)
export function faNumber(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:3 });
}

// 2026-11-14 -> 14 Nov 2026
export function faDay(value: string): string
{
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    if (!m)
    {
        return '';
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${m[3]} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

// 202611 -> Nov 2026
export function faPeriodText(period: number): string
{
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = period % 100;

    return period > 0 && month >= 1 && month <= 12 ? `${months[month - 1]} ${Math.floor(period / 100)}` : '';
}

// "Straight line over 5 year(s)" / "Reducing balance 20 %"
export function faRuleText(method: string, ratePercent: number, lifeYears: number): string
{
    return method === 'None' ? 'No depreciation'
        : method === 'ReducingBalance' ? `Reducing balance ${faNumber(ratePercent)} %`
        : method !== 'StraightLine' ? 'Not declared'
        : lifeYears > 0 ? `Straight line over ${lifeYears} year(s)`
        : `Straight line ${faNumber(ratePercent)} %`;
}

// The colour of a status dot on a list
export function faStatusColor(status: string): string
{
    switch (status)
    {
        case 'In Use':
        case 'Posted':
        case 'Closed':
        case 'Active':
            return '#047857';

        case 'Idle':
        case 'Draft':
        case 'Under Repair':
            return '#b45309';

        default:
            return '#b4232c';
    }
}
