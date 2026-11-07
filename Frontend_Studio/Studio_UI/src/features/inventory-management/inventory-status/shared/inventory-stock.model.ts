//===============================================================
// Inventory Status : models (Motor Bike Stock / Spare Parts &
// Lubricants Stock / Accessories Stock)
//
// The API answers in camelCase; the service maps every response
// to these PascalCase shapes.
//===============================================================

export type InventoryStockPageType =
    'MB' | 'SP' | 'AC';

// In Stock / Low Stock / Critical / In Transit / Out of Stock
export type InventoryStockStatus =
    string;

export interface InventoryStockRow
{
    ProductId:
        number;

    ProductCode:
        string;

    ProductName:
        string;

    PartNumber:
        string;

    ItemName:
        string;

    Unit:
        string;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
    ProductKind:
        string;

    CategoryName:
        string;

    SubCategoryName:
        string;

    BrandName:
        string;

    ColorName:
        string;

    ReorderLevel:
        number;

    RedLevel:
        number;

    MaxStockLevel:
        number;

    IsActive:
        boolean;

    InTransit:
        number;

    OnHand:
        number;

    Total:
        number;

    AverageCost:
        number;

    StockValue:
        number;

    BatchCount:
        number;

    LastMovementDate:
        string;

    Location:
        string;

    StockStatus:
        InventoryStockStatus;

    // Product image path ('' = none; Accessories have none)
    ImagePath?:
        string;

    // Cost incl. VAT (with "View Cost incl. VAT")
    AverageCostVat?:
        number;

    StockValueVat?:
        number;
}

export interface InventoryStockOption
{
    Id:
        number;

    Code:
        string;

    Name:
        string;
}

export interface InventoryStockWarehouse
{
    Id:
        number;

    BranchId:
        number;

    Code:
        string;

    Name:
        string;
}

export interface InventoryStockList
{
    PageType:
        string;

    CanViewCost:
        boolean;

    // "View Cost incl. VAT" on the page
    CanViewCostVat?:
        boolean;

    BranchId:
        number;

    WarehouseId:
        number;

    AsOf:
        string;

    Rows:
        InventoryStockRow[];

    Branches:
        InventoryStockOption[];

    Warehouses:
        InventoryStockWarehouse[];
}

export interface InventoryStockBatch
{
    StockBatchId:
        number;

    BatchNo:
        string;

    SourceType:
        string;

    SourceNo:
        string;

    SourceDate:
        string;

    SupplierCode:
        string;

    SupplierName:
        string;

    BranchName:
        string;

    Quantity:
        number;

    UnitCost:
        number;

    InTransit:
        number;

    OnHand:
        number;

    Value:
        number;

    AgeDays:
        number;
}

export interface InventoryStockMovement
{
    StockMovementId:
        number;

    DocumentDate:
        string;

    MovementType:
        string;

    DocumentType:
        string;

    DocumentNo:
        string;

    BatchNo:
        string;

    Bucket:
        string;

    BranchName:
        string;

    WarehouseName:
        string;

    QuantityIn:
        number;

    QuantityOut:
        number;

    Balance:
        number;

    UnitCost:
        number;

    Value:
        number;

    IsReversal:
        boolean;

    Narration:
        string;
}

export interface InventoryStockPlace
{
    BranchName:
        string;

    WarehouseName:
        string;

    Bucket:
        string;

    Quantity:
        number;

    Value:
        number;

    Location:
        string;
}

export interface InventoryBikeUnit
{
    MotorBikeUnitId:
        number;

    ProductId:
        number;

    ProductCode:
        string;

    ProductName:
        string;

    ChassisNo:
        string;

    EngineNo:
        string;

    KeyNo:
        string;

    BatteryNo:
        string;

    PurchaseNo:
        string;

    StockInDate:
        string;

    BranchName:
        string;

    Status:
        string;

    UnitCost:
        number;

    // Unit status Sold
    IsSold:
        boolean;

    // The model's colour
    ColorName:
        string;
}

export interface InventoryBikeList
{
    CanViewCost:
        boolean;

    // Edit Bike Numbers switch + Update on the page
    CanEditNumbers:
        boolean;

    // ... After Sale : sold bikes too
    CanEditSold:
        boolean;

    // Key & Battery Required : Key / Battery No in the editor
    KeyBatteryOn:
        boolean;

    Rows:
        InventoryBikeUnit[];
}

export interface InventoryStockCard
{
    CanViewCost:
        boolean;

    Product:
        InventoryStockRow;

    Batches:
        InventoryStockBatch[];

    Movements:
        InventoryStockMovement[];

    Places:
        InventoryStockPlace[];

    Bikes:
        InventoryBikeUnit[];
}


//===============================================================
// List filters (also handed to the print)
//===============================================================

// all / in-stock / low / out / transit
export type InventoryStockFilter =
    'all' | 'in-stock' | 'low' | 'out' | 'transit';

export interface InventoryStockCriteria
{
    // Spare Parts / Lubricants … ('' = every kind)
    kind:
        string;

    filter:
        InventoryStockFilter;

    // '' = every category
    category:
        string;

    search:
        string;
}


// The rows a filter keeps (list and print use the same rule)
export function filterStockRows
(
    rows:
        InventoryStockRow[],
    criteria:
        InventoryStockCriteria
):
    InventoryStockRow[]
{
    const text =
        (criteria.search ?? '').trim().toLowerCase();

    return rows.filter
    (
        row =>
        {
            if
            (
                criteria.kind
                &&
                row.ProductKind !== criteria.kind
            )
            {
                return false;
            }

            if
            (
                criteria.category
                &&
                row.CategoryName !== criteria.category
            )
            {
                return false;
            }

            if
            (
                !stockMatches(row, criteria.filter)
            )
            {
                return false;
            }

            if
            (
                !text
            )
            {
                return true;
            }

            return [
                row.ProductCode,
                row.ProductName,
                row.PartNumber,
                row.CategoryName,
                row.SubCategoryName,
                row.BrandName,
                row.ColorName,
                row.Location
            ]
            .some(value => String(value ?? '').toLowerCase().includes(text));
        }
    );
}


// One summary card's rule
export function stockMatches
(
    row:
        InventoryStockRow,
    filter:
        InventoryStockFilter
):
    boolean
{
    switch
    (
        filter
    )
    {
        // "All" hides products never stocked or emptied
        case 'all':
            return row.Total !== 0;

        case 'in-stock':
            return row.OnHand > 0;

        case 'low':
            return row.StockStatus === 'Low Stock'
                ||
                row.StockStatus === 'Critical';

        case 'out':
            return row.StockStatus === 'Out of Stock'
                &&
                row.IsActive;

        case 'transit':
            return row.InTransit > 0;

        default:
            return true;
    }
}


// Quantity : whole numbers without decimals
export function formatQuantity
(
    value:
        number
):
    string
{
    const number =
        Number(value) || 0;

    return number.toLocaleString(
        'en-US',
        {
            minimumFractionDigits:0,
            maximumFractionDigits:2
        }
    );
}


// yyyy-MM-dd → 31-Oct-2026 ('' stays '')
export function formatStockDate
(
    iso:
        string
):
    string
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    if
    (
        !match
    )
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${match[3]}-${months[Number(match[2]) - 1] ?? match[2]}-${match[1]}`;
}


//===============================================================
// Edit Bike Numbers (Technical Records)
//===============================================================

export type InventoryBikeNumberField =
    'ChassisNo' | 'EngineNo' | 'KeyNo' | 'BatteryNo';

export interface InventoryBikeNumbers
{
    MotorBikeUnitId:
        number;

    ChassisNo:
        string;

    EngineNo:
        string;

    KeyNo:
        string;

    BatteryNo:
        string;
}

// A number another bike already carries
export interface InventoryBikeNumberTaken
{
    Field:
        string;

    Value:
        string;

    Message:
        string;
}
