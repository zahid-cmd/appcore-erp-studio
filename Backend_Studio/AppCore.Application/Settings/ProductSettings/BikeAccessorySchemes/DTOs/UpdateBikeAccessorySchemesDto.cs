//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Bike Accessory Schemes DTO (the id comes from the
// link's Public Id)
//===============================================================

public class UpdateBikeAccessorySchemesDto
    : CreateBikeAccessorySchemesDto
{
    public long BikeAccessorySchemeId { get; set; }
}
