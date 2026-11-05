//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Defaults : the next number and every dropdown
// of the form in one call
//===============================================================

public class SalesEnquiriesDefaultsDto
{
    // Preview only (the real number is taken on save)
    public string NextEnquiryNo { get; set; } = string.Empty;

    // Enquiry Setup lists (active rows; the record's own
    // inactive choice is added by the form when editing)
    public List<EnquiryOptionDto> Sources { get; set; } = new();

    public List<EnquiryOptionDto> Statuses { get; set; } = new();

    public List<EnquiryOptionDto> InterestLevels { get; set; } = new();

    public List<EnquiryOptionDto> FollowUpMethods { get; set; } = new();

    public List<EnquiryOptionDto> LostReasons { get; set; } = new();

    // Bike models (sub categories of active Motor Bikes categories)
    public List<EnquiryModelOptionDto> Models { get; set; } = new();

    // Active User Profiles
    public List<EnquiryOptionDto> Executives { get; set; } = new();

    // Active Locations
    public List<EnquiryOptionDto> Locations { get; set; } = new();

    // Switches (System Configurations, Sales Enquiries page)
    public bool PurchaseDateRequired { get; set; } = true;

    public bool AutoInterest { get; set; } = true;

    public bool CallNoteRequired { get; set; } = true;
}


//===============================================================
// One dropdown option
//===============================================================

public class EnquiryOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Enquiry Status / Interest Level
    public string ColorCode { get; set; } = string.Empty;

    // Enquiry Status : Open / Won / Lost
    public string Stage { get; set; } = string.Empty;

    // Interest Level : days to purchase (To null = and more)
    public int? DaysFrom { get; set; }

    public int? DaysTo { get; set; }

    public bool IsDefault { get; set; }

    // System row (New / Won / Lost) : New is where an enquiry starts
    public bool IsSystem { get; set; }
}


//===============================================================
// One bike model (no colour)
//===============================================================

public class EnquiryModelOptionDto
{
    // Product Sub Category
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    // Brand Management id (service items / parts by brand)
    public long? BrandManagementId { get; set; }
}


//===============================================================
// Enquirer lookup by mobile
//===============================================================

public class EnquirerLookupDto
{
    public string Mobile { get; set; } = string.Empty;

    // Known enquirer (null = new mobile)
    public long? EnquiryContactId { get; set; }

    public string ContactName { get; set; } = string.Empty;

    public string AltPhone { get; set; } = string.Empty;

    public long? LocationId { get; set; }

    public string Address { get; set; } = string.Empty;

    // A Customer Profile with this mobile (Phone 1 or 2)
    public long? CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    // Earlier enquiries of this mobile (newest first)
    public List<EnquirerHistoryDto> Enquiries { get; set; } = new();
}


public class EnquirerHistoryDto
{
    // Sales (Service later)
    public string EnquiryType { get; set; } = string.Empty;

    public long EnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public DateOnly EnquiryDate { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string StatusName { get; set; } = string.Empty;

    public string StatusStage { get; set; } = string.Empty;
}
