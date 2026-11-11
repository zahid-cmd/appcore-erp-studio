//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries : Undo a saved delivery (admin, with a reason)
//===============================================================

public class UndoBikeDeliveryDto
{
    public string Reason { get; set; } = string.Empty;
}
