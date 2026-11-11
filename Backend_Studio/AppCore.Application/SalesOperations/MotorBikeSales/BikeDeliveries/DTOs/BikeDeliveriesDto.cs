//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries (hand-written page, 2026-11-10)
//
// List : the sold bikes of posted Sales Invoices - MB waiting for
// delivery (Pending) and the delivered ones (Delivered / Undone).
//===============================================================

public class BikeDeliveryRowDto
{
    // Pending : "L<lineId>"; delivered : the delivery's PublicId
    public string Key { get; set; } = string.Empty;

    // Pending / Delivered / Undone
    public string Status { get; set; } = string.Empty;

    public long SalesInvoiceLineId { get; set; }

    public Guid? InvoicePublicId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public bool IsElectric { get; set; }

    // Pending : days since the invoice; delivered : days it waited
    public int DaysWaiting { get; set; }

    public decimal DueAmount { get; set; }

    public string PaymentTerm { get; set; } = string.Empty;

    public Guid? DeliveryPublicId { get; set; }

    public string DeliveryNo { get; set; } = string.Empty;

    public string DeliveryDate { get; set; } = string.Empty;

    public bool HasPdi { get; set; }
}


public class BikeDeliveryListDto
{
    public List<BikeDeliveryRowDto> Rows { get; set; } = new();

    public int Pending { get; set; }

    public int Delivered { get; set; }

    public int Undone { get; set; }
}


// Free accessories that go with the bike (Bike Accessory Schemes
// valid on the invoice date covering the model)
public class BikeDeliveryAccessoryDto
{
    public string SchemeCode { get; set; } = string.Empty;

    public string SchemeName { get; set; } = string.Empty;

    // Additional / Promotional
    public string SchemeKind { get; set; } = string.Empty;

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public int Quantity { get; set; }
}


public class BikeDeliveryWarrantyPartDto
{
    public string PartName { get; set; } = string.Empty;

    public string ExpiryDate { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Notes { get; set; } = string.Empty;
}


public class BikeDeliveryWarrantyDto
{
    public string Code { get; set; } = string.Empty;

    public string PolicyCode { get; set; } = string.Empty;

    public string PolicyName { get; set; } = string.Empty;

    public string StartDate { get; set; } = string.Empty;

    public string ExpiryDate { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Status { get; set; } = string.Empty;

    public List<BikeDeliveryWarrantyPartDto> Parts { get; set; } = new();
}


// The bike + its sale : the top of the form and of the prints
public class BikeDeliveryBikeDto
{
    public long SalesInvoiceLineId { get; set; }

    public long SalesInvoiceId { get; set; }

    public Guid? InvoicePublicId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string CustomerAddress { get; set; } = string.Empty;

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public int? ManufactureYear { get; set; }

    public bool IsElectric { get; set; }

    public string ImagePath { get; set; } = string.Empty;

    public decimal InvoiceTotal { get; set; }

    public decimal DueAmount { get; set; }

    public string PaymentTerm { get; set; } = string.Empty;

    public string SalesPersonName { get; set; } = string.Empty;
}


// A new delivery : the bike, its model's PDI template, its
// accessories
public class BikeDeliverySheetDto
{
    public BikeDeliveryBikeDto Bike { get; set; } = new();

    // null = the model has no active PDI template
    public PdiTemplateDto? Template { get; set; }

    public List<BikeDeliveryAccessoryDto> Accessories { get; set; } = new();

    public BikeDeliveryDefaultsDto Defaults { get; set; } = new();
}


public class BikeDeliveryAnswerDto
{
    public int SectionOrder { get; set; }

    public string SectionTitle { get; set; } = string.Empty;

    public string SectionTitleBn { get; set; } = string.Empty;

    public bool HasComments { get; set; }

    public int ItemOrder { get; set; }

    public string ItemText { get; set; } = string.Empty;

    public string ItemTextBn { get; set; } = string.Empty;

    public string ItemType { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public bool IsRequired { get; set; }

    public string Answer { get; set; } = string.Empty;

    public string Remark { get; set; } = string.Empty;

    public string TechnicianComment { get; set; } = string.Empty;

    public string QcComment { get; set; } = string.Empty;
}


// A saved delivery (view + prints)
public class BikeDeliveryDto
{
    public long BikeDeliveryId { get; set; }

    public Guid PublicId { get; set; }

    public string DeliveryNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string DeliveryDate { get; set; } = string.Empty;

    public string ReceivedBy { get; set; } = string.Empty;

    public string ReceiverName { get; set; } = string.Empty;

    public string ReceiverPhone { get; set; } = string.Empty;

    public int OdometerKm { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public string PdiTemplateCode { get; set; } = string.Empty;

    public string PdiTemplateName { get; set; } = string.Empty;

    public string SheetTitle { get; set; } = string.Empty;

    public string SheetTitleBn { get; set; } = string.Empty;

    public string FooterNote { get; set; } = string.Empty;

    public string FooterNoteBn { get; set; } = string.Empty;

    public string PdiDate { get; set; } = string.Empty;

    public string TechnicianName { get; set; } = string.Empty;

    public string ProblemsFound { get; set; } = string.Empty;

    public string PdiRemarks { get; set; } = string.Empty;

    public string UndoReason { get; set; } = string.Empty;

    public string UndoneDate { get; set; } = string.Empty;

    public string CreatedDate { get; set; } = string.Empty;

    public BikeDeliveryBikeDto Bike { get; set; } = new();

    public List<BikeDeliveryAnswerDto> Answers { get; set; } = new();

    public List<BikeDeliveryAccessoryDto> Accessories { get; set; } = new();

    // null = no warranty policy for the bike on the delivery date
    public BikeDeliveryWarrantyDto? Warranty { get; set; }

    public bool CanUndo { get; set; }
}
