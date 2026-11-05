//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Defaults : the next number and every
// dropdown of the form in one call (parts come from GET parts)
//===============================================================

public class ServiceEnquiriesDefaultsDto
{
    // Preview only (the real number is taken on save)
    public string NextEnquiryNo { get; set; } = string.Empty;

    public List<EnquiryOptionDto> Sources { get; set; } = new();

    public List<EnquiryOptionDto> Statuses { get; set; } = new();

    public List<EnquiryOptionDto> FollowUpMethods { get; set; } = new();

    public List<EnquiryOptionDto> LostReasons { get; set; } = new();

    // Bike models with their brand id
    public List<EnquiryModelOptionDto> Models { get; set; } = new();

    public List<EnquiryOptionDto> Executives { get; set; } = new();

    public List<EnquiryOptionDto> Locations { get; set; } = new();

    // Switch : a call needs a note (Service Enquiries page)
    public bool CallNoteRequired { get; set; } = true;

    // Service Settings items (active) : scheduled (configured),
    // labor chart, customized, membership
    public List<ServiceItemOptionDto> ServiceItems { get; set; } = new();
}


//===============================================================
// One service item (Service Settings)
//===============================================================

public class ServiceItemOptionDto
{
    // Scheduled / LaborChart / Customized / Membership
    public string Kind { get; set; } = string.Empty;

    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Brand items (Scheduled / Labor Chart) : the brand; dealer
    // items (Customized / Membership) : null = any brand
    public long? BrandManagementId { get; set; }

    // Customer charge (free scheduled service = 0)
    public decimal Rate { get; set; }

    // Free scheduled service
    public bool IsFree { get; set; }

    // Labor chart : "Engine · 100–125cc"; scheduled : "Free ·
    // due 30 days"
    public string Info { get; set; } = string.Empty;
}


//===============================================================
// One part (Spare Parts / Accessories catalogue)
//===============================================================

public class PartOptionDto
{
    // SparePart / Accessory
    public string Kind { get; set; } = string.Empty;

    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    // Newest MRP; null = no price yet
    public decimal? Price { get; set; }

    // Stock on hand (all branches)
    public decimal OnHand { get; set; }
}
