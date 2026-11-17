//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.WarrantyManagement.SalesWarranty;


//===============================================================
// Sales Warranty Records (read-only, hand-written page, 2026-11-16;
// NEVER run Code Sync). The records are made when a bike is
// delivered (Bike Deliveries); this page only shows them. Days are
// yyyy-MM-dd.
//===============================================================

public class SalesWarrantyPartDto
{
    public string PartName { get; set; } = string.Empty;

    public string ExpiryDate { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Notes { get; set; } = string.Empty;

    // Covered / Expired
    public string State { get; set; } = string.Empty;
}


public class SalesWarrantyRecordDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string PolicyCode { get; set; } = string.Empty;

    public string PolicyName { get; set; } = string.Empty;

    public string StartDate { get; set; } = string.Empty;

    // '' : no end date
    public string ExpiryDate { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    // As saved : Active / Expired / Void / Claimed
    public string Status { get; set; } = string.Empty;

    // Against today : In Warranty / Expiring / Expired / Void / Claimed
    public string State { get; set; } = string.Empty;

    // Days to the end date (null : no end date; below 0 : over)
    public int? DaysLeft { get; set; }

    public string VoidReason { get; set; } = string.Empty;

    // One record only
    public List<SalesWarrantyPartDto> Parts { get; set; } = new();
}


public interface ISalesWarrantyRecordsRepository
{
    // The heads only
    Task<List<SalesWarrantyRecordDto>> GetAllAsync();

    Task<SalesWarrantyRecordDto> GetAsync(Guid publicId);
}
