//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations : Parts Outsourcing on a job card (hand-written,
// 2026-11-17; NEVER run Code Sync)
//===============================================================

// One part bought outside for a job card
public class OutsourcedPartDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public string PurchaseDate { get; set; } = string.Empty;

    // SparePart / Accessory / Other (typed)
    public string ItemKind { get; set; } = string.Empty;

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public long? SupplierId { get; set; }

    // The supplier's name, or the typed vendor
    public string VendorName { get; set; } = string.Empty;

    public string BillNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal CostRate { get; set; }

    public decimal CostAmount { get; set; }

    public decimal? Mrp { get; set; }

    public decimal SellRate { get; set; }

    public decimal SellAmount { get; set; }

    // Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}


public class OutsourcedSupplierDto
{
    public long SupplierId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


// The outsourced parts of a job card and what the form needs
public class OutsourcedPartsDto
{
    public string JobCardNo { get; set; } = string.Empty;

    // The job card is still open for parts
    public bool CanAdd { get; set; }

    // The page action Sell Above MRP
    public bool CanAboveMrp { get; set; }

    // Today (the date a new entry starts with)
    public string Today { get; set; } = string.Empty;

    public List<OutsourcedSupplierDto> Suppliers { get; set; } = new();

    public List<OutsourcedPartDto> Lines { get; set; } = new();

    // The posted ones
    public decimal CostTotal { get; set; }

    public decimal SellTotal { get; set; }
}


public class SaveOutsourcedPartDto
{
    public string? PurchaseDate { get; set; }

    public string? ItemKind { get; set; }

    public long? ItemId { get; set; }

    // A typed part
    public string? ItemCode { get; set; }

    public string? ItemName { get; set; }

    public long? SupplierId { get; set; }

    // A typed vendor
    public string? VendorName { get; set; }

    public string? BillNo { get; set; }

    public decimal Quantity { get; set; }

    public decimal CostRate { get; set; }

    public decimal SellRate { get; set; }

    public string? Note { get; set; }
}


public class CancelOutsourcedPartDto
{
    public string? Reason { get; set; }
}


public interface IWorkshopOutsourcedPartsRepository
{
    Task<OutsourcedPartsDto> GetAsync(Guid jobCardPublicId, bool canAboveMrp);

    // Saved and posted at once (Dr Workshop WIP, Cr the vendor)
    Task<OutsourcedPartsDto> AddAsync(Guid jobCardPublicId, SaveOutsourcedPartDto dto, bool canAboveMrp, long userId);

    // The journal is reversed; not after the job card is invoiced
    Task<OutsourcedPartsDto> CancelAsync(Guid jobCardPublicId, Guid publicId, CancelOutsourcedPartDto dto, bool canAboveMrp, long userId);
}
