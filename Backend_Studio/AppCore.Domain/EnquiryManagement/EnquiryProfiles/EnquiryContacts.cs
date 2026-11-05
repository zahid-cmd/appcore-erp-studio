//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Contacts : the enquirer list
//
// The person who contacted us, one row per mobile (unique among
// live rows). No ledger, no NID, no page of its own : kept from
// the enquiry forms (Sales / Service Enquiries). Saving an
// enquiry adds a new mobile or refreshes the contact's details.
//
// Table made by SalesEnquiries_Tables.sql.
//===============================================================

public class EnquiryContacts
{
    public long EnquiryContactId { get; set; }

    // 11 digits, starts 01
    public string Mobile { get; set; } = string.Empty;

    public string ContactName { get; set; } = string.Empty;

    public string AltPhone { get; set; } = string.Empty;

    // Locations (General Settings)
    public long? LocationId { get; set; }

    public string Address { get; set; } = string.Empty;


    //===========================================================
    // Soft Delete / Audit
    //===========================================================

    public bool IsDeleted { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
