//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer : save a draft. The server works out the
// batches again (FIFO from the From warehouse) and never trusts
// the page's figures.
//===============================================================

public class CreateProductTransferDto
{
    // MB / SP / AC (fixed after the first save)
    public string Type { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string TransferDate { get; set; } = string.Empty;

    public long FromWarehouseId { get; set; }

    public long ToWarehouseId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public List<CreateProductTransferLineDto> Lines { get; set; } = new();
}


//===============================================================
// One product
//   SP / AC : Quantity (2 decimals at most), taken FIFO
//   MB      : UnitIds (the bikes, MotorBikeUnitId); the quantity
//             is their number
//===============================================================

public class CreateProductTransferLineDto
{
    public long ProductId { get; set; }

    public decimal Quantity { get; set; }

    // MB : the bikes chosen by chassis
    public List<long> UnitIds { get; set; } = new();

    // Accepted, not used : no "batch-wise" System Configuration
    // switch exists yet, so the batches are always taken FIFO
    public List<long>? BatchIds { get; set; }

    // SP / AC : the place in the To warehouse (optional)
    public long? ToRackId { get; set; }

    public int? ToShelfNo { get; set; }

    // Bin on that shelf (0 / null with a rack and shelf = bin 1)
    public int? ToBinNo { get; set; }

    // Save the place as the product's location in the To warehouse
    public bool SavePlace { get; set; }

    public string Notes { get; set; } = string.Empty;
}


//===============================================================
// Receive (destination branch) : { ReceiveDate }
//===============================================================

public class ReceiveProductTransferDto
{
    // yyyy-MM-dd ('' = today)
    public string ReceiveDate { get; set; } = string.Empty;
}


//===============================================================
// Cancel : { Reason } (at least 5 characters)
//===============================================================

public class CancelProductTransferDto
{
    public string Reason { get; set; } = string.Empty;
}
