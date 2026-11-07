//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Motor Bike Specifications DTO (the id comes from the
// link's Public Id)
//===============================================================

public class UpdateMotorBikeSpecificationsDto
    : CreateMotorBikeSpecificationsDto
{
    public long MotorBikeSpecificationId { get; set; }
}
