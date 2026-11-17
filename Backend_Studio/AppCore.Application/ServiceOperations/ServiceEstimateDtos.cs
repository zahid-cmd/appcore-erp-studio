//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations, service estimates : what the page sends and
// gets. Days are yyyy-MM-dd; times are UTC date-times.
//
// An estimate is made for a customer and a bike (2026-11-16), not
// for a job card : a job card can be made from it afterwards.
//===============================================================

// A labour line (LineType Service) or a part line (LineType Part)
public class ServiceEstimateLineDto
{
    // Service : Scheduled / LaborChart / Customized / Membership /
    // Other. Part : SparePart / Accessory / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public bool IsFree { get; set; }

    public string Note { get; set; } = string.Empty;
}


// An estimate : the list gets the head only, one estimate gets its
// lines too
public class ServiceEstimateDto
{
    public long ServiceEstimateId { get; set; }

    public Guid PublicId { get; set; }

    public string EstimateNo { get; set; } = string.Empty;

    public int Version { get; set; } = 1;

    // yyyy-MM-dd
    public string EstimateDate { get; set; } = string.Empty;

    // yyyy-MM-dd ('' : none)
    public string ValidUntil { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // The customer and the bike
    //-----------------------------------------------------------

    // The customer of the customer profiles (null : typed only)
    public long? CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    // A bike the service center knows (null : typed)
    public long? ServiceVehicleId { get; set; }

    public long? ModelId { get; set; }

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    // What the customer asks for
    public string BasicRequirement { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // The job card made from it (none : not converted)
    //-----------------------------------------------------------

    public long? JobCardId { get; set; }

    public Guid? JobCardPublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    public string JobCardStatus { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // Status and money
    //-----------------------------------------------------------

    public string Status { get; set; } = "Draft";

    public DateTime StatusDate { get; set; }

    public string StatusNote { get; set; } = string.Empty;

    public decimal LabourTotal { get; set; }

    public decimal PartsTotal { get; set; }

    public decimal GrandTotal { get; set; }

    public string Remarks { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // The Estimate Charge (the service selected in Workshop
    // Configuration). Collected : a Receipt Voucher was posted. It
    // comes off the service invoice when the estimate became a job
    // card.
    //-----------------------------------------------------------

    public string ChargeName { get; set; } = string.Empty;

    // Before VAT on top (the rate of the service)
    public decimal ChargeAmount { get; set; }

    public decimal ChargeVatRate { get; set; }

    public decimal ChargeVatAmount { get; set; }

    // What the customer pays
    public decimal ChargeTotal { get; set; }

    public bool ChargeCollected { get; set; }

    // yyyy-MM-dd ('' : not collected)
    public string ChargeCollectedDate { get; set; } = string.Empty;

    public string ChargeReceiptVoucherNo { get; set; } = string.Empty;

    // The service invoice it came off ('' : none)
    public string ChargeInvoiceNo { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // What can be done
    //-----------------------------------------------------------

    // A Draft : its fields and lines can be changed
    public bool CanEdit { get; set; }

    // The statuses it can go to from here
    public List<string> NextStatuses { get; set; } = new();

    // Sent / Approved / Rejected : a new version can be made
    public bool CanRevise { get; set; }

    // The charge can be collected now
    public bool CanCollect { get; set; }

    // Printed only when the charge was collected or the estimate
    // became a job card (or no charge is set)
    public bool CanPrint { get; set; }

    // A job card can be made from it
    public bool CanConvert { get; set; }

    public List<ServiceEstimateLineDto> Services { get; set; } = new();

    public List<ServiceEstimateLineDto> Parts { get; set; } = new();

    // The problems of the bike, each with what was found
    public List<ServiceEstimateObservationDto> Observations { get; set; } = new();
}


public class SaveServiceEstimateDto
{
    // The service center (a new estimate; kept afterwards)
    public long BranchId { get; set; }

    // yyyy-MM-dd
    public string EstimateDate { get; set; } = string.Empty;

    // yyyy-MM-dd ('' : none)
    public string ValidUntil { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    // A found bike; null : the bike is typed
    public long? ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    public string BasicRequirement { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<ServiceEstimateLineDto> Services { get; set; } = new();

    public List<ServiceEstimateLineDto> Parts { get; set; } = new();

    // The problems of the bike, each with what was found
    public List<ServiceEstimateObservationDto> Observations { get; set; } = new();
}


public class ServiceEstimateStatusChangeDto
{
    public string Status { get; set; } = string.Empty;

    // Needed for Rejected
    public string Note { get; set; } = string.Empty;
}


// The Estimate Charge is collected : Cash / Bank / MFS lines that
// add up to the charge
public class CollectEstimateChargeDto
{
    // yyyy-MM-dd
    public string CollectDate { get; set; } = string.Empty;

    public List<ServiceInvoicePaymentDto> Payments { get; set; } = new();
}


// The Estimate Charge as Workshop Configuration has it today
public class EstimateChargeDto
{
    // false : no service is selected (estimates are free)
    public bool IsSet { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatAmount { get; set; }

    public decimal Total { get; set; }
}


// Every list of the estimate form in one call
public class ServiceEstimateLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    // Today + the days an estimate stays valid
    public string ValidUntil { get; set; } = string.Empty;

    // Given when the service center is chosen (see next-no)
    public string NextEstimateNo { get; set; } = string.Empty;

    public List<WsLookupDto> Branches { get; set; } = new();

    // Models with their brand (a bike that is typed)
    public List<EnquiryModelOptionDto> Models { get; set; } = new();

    public List<ServiceItemOptionDto> ServiceItems { get; set; } = new();

    public EstimateChargeDto Charge { get; set; } = new();
}
