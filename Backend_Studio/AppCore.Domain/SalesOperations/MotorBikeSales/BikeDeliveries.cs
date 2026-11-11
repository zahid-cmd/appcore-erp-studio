//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries (Sales Operations > Motor Bike Sales, hand-
// written page : NEVER run Submenu / Code Sync for it). Tables
// made by BikeDeliveries_Pdi_Engine.sql (the Code Sync baseline
// table is replaced).
//
// One row = one delivered bike (one Sales Invoice - MB line).
// Save is final; an admin may Undo it with a reason (Status
// Undone, the line back to Pending, its warranty record Void).
// The PDI sheet as filled is copied into BikeDeliveryAnswers.
//===============================================================

public class BikeDeliveries
{
    public long BikeDeliveryId { get; set; }

    public Guid PublicId { get; set; }

    public string DeliveryNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public DateOnly SalesInvoiceDate { get; set; }

    public long SalesInvoiceLineId { get; set; }

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public long? BikeModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public bool IsElectric { get; set; }

    public DateOnly DeliveryDate { get; set; }

    // Customer / Nominee
    public string ReceivedBy { get; set; } = "Customer";

    public string ReceiverName { get; set; } = string.Empty;

    public string ReceiverPhone { get; set; } = string.Empty;

    public int OdometerKm { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // PDI (no template = delivered without the PDI sheet)
    public long? PdiTemplateId { get; set; }

    public string PdiTemplateCode { get; set; } = string.Empty;

    public string PdiTemplateName { get; set; } = string.Empty;

    public DateOnly? PdiDate { get; set; }

    public string TechnicianName { get; set; } = string.Empty;

    public string ProblemsFound { get; set; } = string.Empty;

    public string PdiRemarks { get; set; } = string.Empty;

    // Delivered / Undone
    public string Status { get; set; } = "Delivered";

    public long? UndoneBy { get; set; }

    public DateTime? UndoneDate { get; set; }

    public string UndoReason { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// One PDI item as filled (the template text is copied, so a later
// template edit never changes a saved sheet)
//===============================================================

public class BikeDeliveryAnswers
{
    public long BikeDeliveryAnswerId { get; set; }

    public long BikeDeliveryId { get; set; }

    public int SectionOrder { get; set; }

    public string SectionTitle { get; set; } = string.Empty;

    public string SectionTitleBn { get; set; } = string.Empty;

    public bool HasComments { get; set; }

    public int ItemOrder { get; set; }

    public string ItemText { get; set; } = string.Empty;

    public string ItemTextBn { get; set; } = string.Empty;

    public string ItemType { get; set; } = "Check";

    public string Unit { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;

    // Check : OK / Not OK / N/A ; Reading : the number ; Text
    public string Answer { get; set; } = string.Empty;

    // Required for a Not OK answer
    public string Remark { get; set; } = string.Empty;

    public string TechnicianComment { get; set; } = string.Empty;

    public string QcComment { get; set; } = string.Empty;
}
