//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Sales Returns - MB / SP / AC : DTOs
//
// One return = one posted invoice. The page first finds the
// invoice (SalesReturnInvoiceItemDto), loads it with what can
// still be returned (SalesReturnInvoiceDto), then saves the
// quantities (SaveSalesReturnDto).
//===============================================================

// Switches of the page (Post on Approval, Return Window)
public class SalesReturnSwitchesDto
{
    public bool PostOnApproval { get; set; }

    // null = any time
    public int? ReturnWindowDays { get; set; }

    public string PostOnApprovalCode { get; set; } = string.Empty;

    public string ReturnWindowCode { get; set; } = string.Empty;

    // The user's login branch (the invoices of this branch)
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Today { get; set; } = string.Empty;
}


// A posted invoice found for a return
public class SalesReturnInvoiceItemDto
{
    public long SalesInvoiceId { get; set; }

    public Guid PublicId { get; set; }

    public string InvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    // MB : the chassis; SP / AC : the first items
    public string ItemsText { get; set; } = string.Empty;

    public decimal InvoiceTotal { get; set; }

    public decimal SoldQuantity { get; set; }

    public decimal ReturnedQuantity { get; set; }

    public decimal ReturnableQuantity { get; set; }

    // Days since the invoice; OutsideWindow = past the Return Window
    public int AgeDays { get; set; }

    public bool OutsideWindow { get; set; }
}


// One invoice line with what can still be returned
public class SalesReturnInvoiceLineDto
{
    public long SalesInvoiceLineId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long? MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public decimal SoldQuantity { get; set; }

    // Posted returns
    public decimal ReturnedQuantity { get; set; }

    // On other draft / approved returns
    public decimal PendingQuantity { get; set; }

    public decimal ReturnableQuantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal LineTotal { get; set; }

    // LineTotal / SoldQuantity (the page's preview)
    public decimal NetPerUnit { get; set; }

    public decimal VatInside { get; set; }

    // MB : the registration fee refunded with the chassis
    public decimal RegistrationRefund { get; set; }

    // MB : why the chassis cannot be returned ('' = it can)
    public string Blocked { get; set; } = string.Empty;
}


public class SalesReturnInvoiceDto
{
    public long SalesInvoiceId { get; set; }

    public Guid PublicId { get; set; }

    public string InvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string CustomerAddress { get; set; } = string.Empty;

    public string SalesPersonName { get; set; } = string.Empty;

    public string PaymentTerm { get; set; } = string.Empty;

    public decimal InvoiceTotal { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal DueAmount { get; set; }

    public int AgeDays { get; set; }

    // '' = can be returned from; else the reason it cannot
    public string Blocked { get; set; } = string.Empty;

    public List<SalesReturnInvoiceLineDto> Lines { get; set; } = new();
}


// Save : the invoice and the quantities
public class SaveSalesReturnLineDto
{
    public long SalesInvoiceLineId { get; set; }

    public decimal Quantity { get; set; }

    public string Reason { get; set; } = string.Empty;
}


public class SaveSalesReturnDto
{
    // Create : the invoice (public id); Update keeps its invoice
    public Guid InvoicePublicId { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public List<SaveSalesReturnLineDto> Lines { get; set; } = new();
}


public class CancelSalesReturnDto
{
    public string Reason { get; set; } = string.Empty;
}


public class SalesReturnSavedDto
{
    public long SalesReturnId { get; set; }

    public Guid PublicId { get; set; }

    public string ReturnNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public decimal ReturnTotal { get; set; }

    public List<string> Warnings { get; set; } = new();
}


public class SalesReturnListItemDto
{
    public long SalesReturnId { get; set; }

    public Guid PublicId { get; set; }

    public string ReturnNo { get; set; } = string.Empty;

    public string ReturnDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string SalesInvoiceDate { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string ItemsText { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal ReturnTotal { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}


public class SalesReturnLineDto
{
    public long SalesReturnLineId { get; set; }

    public int LineNo { get; set; }

    public long SalesInvoiceLineId { get; set; }

    public int InvoiceLineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long? MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public decimal SoldQuantity { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal LineTotal { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatInside { get; set; }

    public decimal BaseVat { get; set; }

    public decimal RegistrationRefund { get; set; }

    public decimal CostAmount { get; set; }

    public string Reason { get; set; } = string.Empty;
}


public class SalesReturnDto
{
    public long SalesReturnId { get; set; }

    public Guid PublicId { get; set; }

    public string ProductType { get; set; } = string.Empty;

    public string ReturnNo { get; set; } = string.Empty;

    public string ReturnDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public long SalesInvoiceId { get; set; }

    public Guid InvoicePublicId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string SalesInvoiceDate { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string CustomerAddress { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal ItemsAmount { get; set; }

    public decimal RegistrationRefund { get; set; }

    public decimal ReturnTotal { get; set; }

    public decimal TotalVatInside { get; set; }

    public decimal TotalBaseVat { get; set; }

    public decimal CostAmount { get; set; }

    public string Status { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public string ApprovedByName { get; set; } = string.Empty;

    public string PostedByName { get; set; } = string.Empty;

    public DateTime? PostedDate { get; set; }

    public List<SalesReturnLineDto> Lines { get; set; } = new();
}
