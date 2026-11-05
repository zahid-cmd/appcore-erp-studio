//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Management Defaults DTO
//
// Next rack code and name for a warehouse ('' when none is
// chosen yet), its active zones and the categories a rack can
// be assigned to.
//===============================================================

public class RackManagementDefaultsDto
{
    // "R-001"
    public string Code { get; set; } = string.Empty;

    // "<Warehouse Code>-R-001"
    public string FullCode { get; set; } = string.Empty;


    // "Rack A" : the lowest letter not used by a live rack of the
    // warehouse (a deleted rack's letter is reused)
    public string Name { get; set; } = string.Empty;


    //===========================================================
    // Zones of the warehouse (active, priority order). A zone is
    // required when there is at least one.
    //===========================================================

    public bool ZoneRequired { get; set; }

    public List<RackZoneDto> Zones { get; set; } = new();


    //===========================================================
    // Assignable categories : live + active, Category Type
    // Spare Parts / Lubricants / Accessories
    //===========================================================

    public List<RackCategoryOptionDto> Categories { get; set; } = new();


    //===========================================================
    // Limits
    //===========================================================

    public int MaxShelves { get; set; }

    public int MaxBinsPerShelf { get; set; }
}


//===============================================================
// Category option (with its live sub categories)
//===============================================================

public class RackCategoryOptionDto
{
    public long ProductCategoryId { get; set; }

    public string CategoryCode { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string CategoryType { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public List<RackSubCategoryDto> SubCategories { get; set; } = new();
}
