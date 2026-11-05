//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Model Onboarding (Settings › Product Settings)
//
// One save creates, in one transaction:
//   a Bike Model, its Product Sub Category ("Motor Bikes -
//   <Brand> - <Model>") and one Motor Bike per picked colour.
// No table of its own : the rows live on their own pages.
//===============================================================

public class ModelOnboardingRequestDto
{
    public long BrandManagementId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BikeType { get; set; } = string.Empty;

    // One set of stock levels for every colour
    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public int MaxStockLevel { get; set; }

    public List<long> ColorManagementIds { get; set; } = new();

    public string Remarks { get; set; } = string.Empty;
}


public class ModelOnboardingResultDto
{
    public long BikeModelId { get; set; }

    public string ModelCode { get; set; } = string.Empty;

    public long ProductSubCategoryId { get; set; }

    public string SubCategoryCode { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public List<ModelOnboardingBikeDto> Bikes { get; set; } = new();
}


public class ModelOnboardingBikeDto
{
    public long ColorManagementId { get; set; }

    // Used by the page to upload the optional colour image
    public Guid PublicId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;
}


//===============================================================
// Page defaults
//===============================================================

public class ModelOnboardingDefaultsDto
{
    // Brands that have an active Motor Bikes category
    public List<ModelOnboardingBrandDto> Brands { get; set; } = new();

    public List<string> BikeTypes { get; set; } = new();

    public List<ModelOnboardingColorDto> Colors { get; set; } = new();

    // Preview only (the real code is given on save)
    public string NextModelCode { get; set; } = string.Empty;

    // Starting values : the last saved bike model / motor bike
    public string LastBikeType { get; set; } = string.Empty;

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public int MaxStockLevel { get; set; }
}


public class ModelOnboardingBrandDto
{
    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public long ProductCategoryId { get; set; }

    public string CategoryCode { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    // Preview of the next sub category code of this category
    public string NextSubCategoryCode { get; set; } = string.Empty;

    // Model names already used by this brand (duplicate warning)
    public List<string> ExistingModels { get; set; } = new();
}


public class ModelOnboardingColorDto
{
    public long ColorManagementId { get; set; }

    public string ColorName { get; set; } = string.Empty;
}
