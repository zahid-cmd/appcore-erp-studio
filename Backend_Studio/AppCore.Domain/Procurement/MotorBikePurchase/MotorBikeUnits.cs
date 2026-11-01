//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.MotorBikePurchase;


//===============================================================
// Motor bike units : one row per bike (chassis), table
// MotorBikeUnits. Entered on Purchases - MB (Products Received on
// Purchase ON) or on Product Receiving.
//===============================================================

public class MotorBikeUnits
{
    public long MotorBikeUnitId { get; set; }
    public long ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ChassisNo { get; set; } = string.Empty;
    public string EngineNo { get; set; } = string.Empty;
    public string KeyNo { get; set; } = string.Empty;
    public string BatteryNo { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public long PurchaseId { get; set; }
    public long PurchaseLineId { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public string SupplierCode { get; set; } = string.Empty;
    public decimal UnitCost { get; set; }
    // Pending / InStock / Sold / Returned / Transferred
    public string Status { get; set; } = "Pending";
    public DateOnly? StockInDate { get; set; }

    // Product Receiving that brought the bike on hand (null : the
    // purchase itself, "Products Received on Purchase" ON)
    public long? ReceivingId { get; set; }

    // Warehouse the bike is in (null : in transit / not known)
    public long? WarehouseId { get; set; }

    // Opening Stock that brought the bike in (PurchaseId 0 then)
    public long? OpeningStockId { get; set; }
    public bool IsDeleted { get; set; }
    public long? DeletedBy { get; set; }
    public DateTime? DeletedDate { get; set; }
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public long? ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
