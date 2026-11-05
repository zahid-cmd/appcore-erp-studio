//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Parts & Accessories Onboarding (Settings › Product Settings)
//
// Many Spare Parts (or Accessories) into ONE Product Sub
// Category in one save, read from an Excel / CSV file or from
// cells pasted from Excel. All or nothing.
// No table of its own : the rows live on the Spare Parts /
// Accessories pages (codes, ledgers, history as made by hand).
//===============================================================

public static class PartsOnboardingTypes
{
    // Spare Parts page (Category Types "Spare Parts", "Lubricants")
    public const string SpareParts = "SpareParts";

    // Accessories page (Category Type "Accessories")
    public const string Accessories = "Accessories";
}


//===============================================================
// Page defaults
//===============================================================

public class PartsOnboardingDefaultsDto
{
    public List<string> Units { get; set; } = new();

    // SuperFast / Fast / Regular / Periodic / Slow
    public List<string> MovementClasses { get; set; } = new();

    // Active categories of both product types, with their active
    // sub categories
    public List<PartsOnboardingCategoryDto> Categories { get; set; } = new();

    // Starting stock levels : the last saved item of each type
    // (2 / 1 / 3 when none)
    public PartsOnboardingLevelsDto SpareParts { get; set; } = new();

    public PartsOnboardingLevelsDto Accessories { get; set; } = new();
}


public class PartsOnboardingLevelsDto
{
    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public int MaxStockLevel { get; set; }

    public string Unit { get; set; } = "Pcs";

    public string MovementClass { get; set; } = "Slow";
}


public class PartsOnboardingCategoryDto
{
    public long ProductCategoryId { get; set; }

    public string CategoryCode { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string CategoryType { get; set; } = string.Empty;

    // PartsOnboardingTypes.SpareParts / Accessories
    public string ProductType { get; set; } = string.Empty;

    public List<PartsOnboardingSubCategoryDto> SubCategories { get; set; } = new();
}


public class PartsOnboardingSubCategoryDto
{
    public long ProductSubCategoryId { get; set; }

    public string SubCategoryCode { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    // Items already in it (not deleted)
    public int ItemCount { get; set; }
}


//===============================================================
// Existing items of a sub category (template reference sheet)
//===============================================================

public class PartsOnboardingExistingDto
{
    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public int MaxStockLevel { get; set; }

    public string MovementClass { get; set; } = string.Empty;
}


//===============================================================
// Analyze / Onboard request
//
// Blank cells are filled with the page defaults by the page;
// the levels come as text so a wrong cell is reported, not lost.
//===============================================================

public class PartsOnboardingRequestDto
{
    public string ProductType { get; set; } = string.Empty;

    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    public List<PartsOnboardingRowDto> Rows { get; set; } = new();
}


public class PartsOnboardingRowDto
{
    // Row number in the file / paste (for messages)
    public int Row { get; set; }

    public string PartNumber { get; set; } = string.Empty;

    // Part Name (Spare Parts) or Accessory Name (Accessories)
    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string ReorderLevel { get; set; } = string.Empty;

    public string RedLevel { get; set; } = string.Empty;

    public string MaxStockLevel { get; set; } = string.Empty;

    public string MovementClass { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}


//===============================================================
// Analyze result : one check per row, in the order sent
//===============================================================

public static class PartsOnboardingStatus
{
    public const string Ready = "Ready";

    // A cell is wrong (required, unit, levels, length …)
    public const string Invalid = "Invalid";

    // Same part number as an earlier row of the file
    public const string Duplicate = "Duplicate";

    // Part number already in (or linked to) this sub category
    public const string Exists = "Exists";

    // Part number saved under another model of the brand : linked
    // to this sub category instead of made again
    public const string Link = "Link";
}


public class PartsOnboardingAnalysisDto
{
    public List<PartsOnboardingCheckDto> Rows { get; set; } = new();

    public int ReadyCount { get; set; }

    public int LinkCount { get; set; }

    // A problem with the sub category itself ('' when none) :
    // then no row is Ready
    public string Message { get; set; } = string.Empty;
}


public class PartsOnboardingCheckDto
{
    public int Row { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    // Ready rows : the code it will most likely get (preview)
    public string ProductCode { get; set; } = string.Empty;

    // The values as they will be saved (tidied)
    public string PartNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string MovementClass { get; set; } = string.Empty;
}


//===============================================================
// Onboard result
//===============================================================

public class PartsOnboardingResultDto
{
    public string ProductType { get; set; } = string.Empty;

    public string SubCategoryCode { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public List<PartsOnboardingItemDto> Items { get; set; } = new();

    // Saved under another model, now linked to this sub category
    public List<PartsOnboardingItemDto> Linked { get; set; } = new();
}


public class PartsOnboardingItemDto
{
    public int Row { get; set; }

    public Guid PublicId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
