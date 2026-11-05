//===============================================================
// Public Website : Enquire form DTOs
//---------------------------------------------------------------
// The website's "Enquire Now" form. Codes only (no ids) go out
// and come back : locations, showrooms (branches) and the bike
// model (ModelCode of PublicBikeModelDto).
//===============================================================

namespace AppCore.Application.Public.Website;


public class PublicEnquiryOptionsDto
{
    // Active locations (areas)
    public List<PublicOptionDto> Locations { get; set; } = new();

    // Active branches (Type = the wing, e.g. Sales Center)
    public List<PublicOptionDto> Branches { get; set; } = new();
}


public class PublicOptionDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;
}


public class PublicEnquiryRequestDto
{
    public string Mobile { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string LocationCode { get; set; } = string.Empty;

    // Sub category code of a Motor Bikes category
    public string ModelCode { get; set; } = string.Empty;

    // Optional
    public string Colour { get; set; } = string.Empty;

    public DateOnly? ExpectedPurchaseDate { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    // Cash (default) / EMI. EmiNote : the calculator's choice,
    // e.g. "20% down · 12 months"
    public string PaymentMode { get; set; } = string.Empty;

    public string EmiNote { get; set; } = string.Empty;

    // Test ride request : date (today … 60 days), slot Morning /
    // Afternoon / Evening, and whether they hold a driving licence
    public bool IsTestRide { get; set; }

    public DateOnly? RideDate { get; set; }

    public string RideSlot { get; set; } = string.Empty;

    // "HH:mm" : a free time from test-ride-slots (when the shop has
    // a Test Ride time slot); '' = none picked
    public string RideStart { get; set; } = string.Empty;

    public bool? HasLicence { get; set; }

    // Spam checks : a hidden field people never fill, and the
    // time the form was open (ms)
    public string Website { get; set; } = string.Empty;

    public int FilledMs { get; set; }
}


public class PublicEnquiryResultDto
{
    // ENQ-SAL-… (new, or the open one that got the note)
    public string EnquiryNo { get; set; } = string.Empty;

    // true = the mobile already had an open enquiry
    public bool IsExisting { get; set; }

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Book a service / Ask for a part (website)
//===============================================================

public class PublicServiceEnquiryRequestDto
{
    // Service / Parts
    public string EnquiryType { get; set; } = "Service";

    public string Mobile { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string LocationCode { get; set; } = string.Empty;

    public string BranchCode { get; set; } = string.Empty;

    // Bike : model code (required for Service), registration, km
    public string ModelCode { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    // Service : Free Service / Paid Service / Repair / Other
    public string ServiceNeed { get; set; } = string.Empty;

    public string Complaint { get; set; } = string.Empty;

    public DateOnly? PreferredDate { get; set; }

    // Morning / Afternoon / Evening
    public string PreferredSlot { get; set; } = string.Empty;

    public bool PickupDrop { get; set; }

    // "HH:mm" : a free slot of the date (service-slots); '' = no slot
    public string SlotStart { get; set; } = string.Empty;

    // Parts : what they need (name or part number) and how many
    public List<PublicPartRequestDto> Parts { get; set; } = new();

    // Spam checks
    public string Website { get; set; } = string.Empty;

    public int FilledMs { get; set; }
}


public class PublicPartRequestDto
{
    // Part number or name, as typed
    public string Name { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;
}


//===============================================================
// Book a service : the free slots of a day (website)
//===============================================================

public class PublicServiceSlotDto
{
    // "HH:mm"
    public string Start { get; set; } = string.Empty;

    public string End { get; set; } = string.Empty;

    // 10:30 AM
    public string Label { get; set; } = string.Empty;

    // Places left
    public int Free { get; set; }
}


//===============================================================
// Test ride : the free times of a day (website). Configured =
// the shop has a default Test Ride time slot; otherwise the form
// keeps Morning / Afternoon / Evening.
//===============================================================

public class PublicRideSlotsDto
{
    public bool Configured { get; set; }

    public List<PublicServiceSlotDto> Slots { get; set; } = new();
}
