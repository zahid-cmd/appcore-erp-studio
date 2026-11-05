//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Product Fit ("Fits models")
//
// Another sub category (model) of the same Product Category that
// a spare part / accessory also fits. The item itself lives in
// its home sub category (stock, price, ledgers).
//===============================================================

public class ProductFitDto
{
    public long ProductSubCategoryId { get; set; }

    public string SubCategoryCode { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    // The sub category's bike model ('' when none) : the short
    // name shown on chips and lists ("Y06")
    public string ModelName { get; set; } = string.Empty;
}
