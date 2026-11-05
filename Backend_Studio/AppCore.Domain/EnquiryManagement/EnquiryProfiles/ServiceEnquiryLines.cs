//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiry Lines
//
// What the enquiry asks for, a snapshot at the time :
//   LineType Service : ItemKind Scheduled / LaborChart /
//                      Customized / Membership / Other
//   LineType Part    : ItemKind SparePart / Accessory / Other
// ItemId points into the item's own table (none for Other).
// Rows are replaced as a whole when the enquiry is saved.
//===============================================================

public class ServiceEnquiryLines
{
    public long ServiceEnquiryLineId { get; set; }

    public long ServiceEnquiryId { get; set; }

    public int LineNo { get; set; }

    // Service / Part
    public string LineType { get; set; } = "Service";

    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    // Customer rate (free scheduled service = 0)
    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public string Note { get; set; } = string.Empty;
}
