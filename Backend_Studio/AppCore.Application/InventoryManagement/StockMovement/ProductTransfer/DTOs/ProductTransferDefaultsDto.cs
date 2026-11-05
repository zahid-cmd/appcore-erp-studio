//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer : defaults of the form
//===============================================================

public class ProductTransferDefaultsDto
{
    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    // Preview : TRF-SP-0012 (taken on the first save)
    public string NextNo { get; set; } = string.Empty;

    // The branch of the login (Receive is for the To branch only)
    public long CurrentBranchId { get; set; }

    public string CurrentBranchName { get; set; } = string.Empty;

    public List<ProductTransferWarehouseOptionDto> Warehouses { get; set; } = new();

    public List<ProductTransferBrandOptionDto> Brands { get; set; } = new();
}


//===============================================================
// A warehouse (General Settings › Warehouses) with its branch
//===============================================================

public class ProductTransferWarehouseOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // No "central" flag exists on Warehouses yet : always false
    public bool IsCentral { get; set; }

    // The branch's default warehouse
    public bool IsDefault { get; set; }

    // The branch runs this product type's business line today
    // (Business Configuration); only such a warehouse can be the
    // To warehouse
    public bool CanReceiveType { get; set; }

    // Stock of this product type is still on hand here. A branch
    // whose business line was revoked may still send it out, so
    // such a warehouse stays in the From list (marked no access)
    public bool HoldsTypeStock { get; set; }
}


//===============================================================
// A brand of the type's products (filter)
//===============================================================

public class ProductTransferBrandOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}
