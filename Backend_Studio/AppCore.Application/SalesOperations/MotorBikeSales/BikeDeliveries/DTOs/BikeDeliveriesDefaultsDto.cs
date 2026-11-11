//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries : page switches and the user's rights
//===============================================================

public class BikeDeliveryDefaultsDto
{
    // CFG-MOD-008-0081 : ON = the PDI sheet is optional
    public bool DeliveryWithoutPdi { get; set; }

    // CFG-MOD-008-0011 (works only with DeliveryWithoutPdi ON)
    public bool DeliveryOnSale { get; set; }

    public bool CanDeliver { get; set; }

    public bool CanUndo { get; set; }

    // yyyy-MM-dd (the server's day)
    public string Today { get; set; } = string.Empty;
}
