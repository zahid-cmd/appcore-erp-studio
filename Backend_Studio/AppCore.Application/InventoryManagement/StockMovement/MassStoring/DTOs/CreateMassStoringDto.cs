//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing : save a draft (only the changed rows). The server
// reads each product's current place again and checks every line.
//===============================================================

public class CreateMassStoringDto
{
    // SP / AC (fixed after the first save)
    public string Type { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string StoringDate { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public List<CreateMassStoringLineDto> Lines { get; set; } = new();
}


//===============================================================
// One product and its new place
//   ToRackId null / 0 : Unplaced (the product's location in the
//   warehouse is cleared)
//===============================================================

public class CreateMassStoringLineDto
{
    public long ProductId { get; set; }

    public long? ToRackId { get; set; }

    public int? ToShelfNo { get; set; }

    // Bin on that shelf (0 / null with a rack and shelf = bin 1)
    public int? ToBinNo { get; set; }

    public string Notes { get; set; } = string.Empty;
}


//===============================================================
// Cancel : { Reason } (at least 5 characters)
//===============================================================

public class CancelMassStoringDto
{
    public string Reason { get; set; } = string.Empty;
}
