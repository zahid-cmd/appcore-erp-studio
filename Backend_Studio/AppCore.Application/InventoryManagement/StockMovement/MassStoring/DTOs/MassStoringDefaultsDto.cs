//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing : defaults of the form
//===============================================================

public class MassStoringDefaultsDto
{
    // SP / AC
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    // Preview : MST-SP-0004 (taken on the first save)
    public string NextNo { get; set; } = string.Empty;

    public long CurrentBranchId { get; set; }

    public string CurrentBranchName { get; set; } = string.Empty;

    // The login branch's warehouse running the line (its default
    // first); 0 = none
    public long DefaultWarehouseId { get; set; }

    // Only warehouses whose branch runs the type's business line
    // today (Business Configuration)
    public List<MassStoringWarehouseOptionDto> Warehouses { get; set; } = new();

    public List<MassStoringBrandOptionDto> Brands { get; set; } = new();

    public List<MassStoringCategoryOptionDto> Categories { get; set; } = new();
}


public class MassStoringWarehouseOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    // Always true in this list (kept like Product Transfer's)
    public bool CanReceiveType { get; set; }
}


public class MassStoringBrandOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class MassStoringCategoryOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public long BrandId { get; set; }

    public string BrandName { get; set; } = string.Empty;
}
