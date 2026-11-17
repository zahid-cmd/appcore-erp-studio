//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations, service billing : what the pages send and get
// (Service Invoices, Service Returns, Free Service Claims). Days are
// yyyy-MM-dd.
//===============================================================

public class ServiceInvoiceLineDto
{
    public long LineId { get; set; }

    // Service / Part / Outside
    public string LineType { get; set; } = string.Empty;

    public string ItemKind { get; set; } = string.Empty;

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public bool IsFree { get; set; }

    // A free scheduled service : what the brand pays back
    public decimal ClaimAmount { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatAmount { get; set; }

    // What the customer pays for the line
    public decimal Total { get; set; }

    // A part : its FIFO cost. Outside work : the vendor's charge
    public decimal Cost { get; set; }

    // Outside work : the vendor
    public string Note { get; set; } = string.Empty;
}


public class ServiceInvoicePaymentDto
{
    // Cash / Bank / MFS
    public string Mode { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // MFS : the transaction id
    public string TransactionRef { get; set; } = string.Empty;
}


// The list gets the head only, one invoice gets its lines too. A
// priced invoice that is not saved has no InvoiceNo.
public class ServiceInvoiceDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string InvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public Guid JobCardPublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    public string JobCardStatus { get; set; } = string.Empty;

    public string JobType { get; set; } = string.Empty;

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    public decimal LabourTotal { get; set; }

    public decimal PartsTotal { get; set; }

    public decimal OutsideTotal { get; set; }

    public decimal VatTotal { get; set; }

    public decimal Discount { get; set; }

    public decimal GrandTotal { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal DueAmount { get; set; }

    public decimal PartsCost { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    // Posted / Returned
    public string Status { get; set; } = string.Empty;

    public bool IsDelivered { get; set; }

    public DateTime? DeliveredAt { get; set; }

    public string ReturnNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // What the user should know before posting (not errors)
    public List<string> Warnings { get; set; } = new();

    public bool CanDeliver { get; set; }

    public bool CanReturn { get; set; }

    public List<ServiceInvoiceLineDto> Lines { get; set; } = new();

    public List<ServiceInvoicePaymentDto> Payments { get; set; } = new();
}


public class SaveServiceInvoiceDto
{
    public Guid JobCardPublicId { get; set; }

    public string InvoiceDate { get; set; } = string.Empty;

    public decimal Discount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // The bike is handed over now
    public bool Deliver { get; set; }

    // Outside work : ItemName (the work), Note (the vendor), Cost
    // (the vendor's charge), Amount (billed to the customer)
    public List<ServiceInvoiceLineDto> OutsideLines { get; set; } = new();

    public List<ServiceInvoicePaymentDto> Payments { get; set; } = new();
}


public class ServiceInvoiceLookupsDto
{
    public string Today { get; set; } = string.Empty;

    // Job cards that are Work Done or Ready and have no invoice
    public List<PartsOptionDto> JobCards { get; set; } = new();

    // The switch (Workshop Configuration) and the page action of the
    // user : both are needed to leave a due
    public bool AllowCredit { get; set; }

    public bool CanCredit { get; set; }
}


public class ServiceReturnDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string ReturnNo { get; set; } = string.Empty;

    public string ReturnDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public Guid InvoicePublicId { get; set; }

    public string InvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public string JobCardNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Reason { get; set; } = string.Empty;

    public bool ReceiptCancelled { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public bool PartsReturned { get; set; }

    // What could not be done after the return was saved (the parts)
    public string Message { get; set; } = string.Empty;
}


public class PostServiceReturnDto
{
    public Guid InvoicePublicId { get; set; }

    public string ReturnDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    // The collection is handed back : its Receipt Voucher is cancelled
    public bool CancelReceipt { get; set; }

    // The parts of the job go back to the store
    public bool ReturnParts { get; set; }
}


//===============================================================
// Free Service Claims
//===============================================================

// A free service of an invoice, with what the brand pays back
public class FreeServiceClaimLineDto
{
    public long LineId { get; set; }

    public string InvoiceNo { get; set; } = string.Empty;

    public string InvoiceDate { get; set; } = string.Empty;

    public string JobCardNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string ServiceName { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}


public class FreeServiceClaimDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string ClaimNo { get; set; } = string.Empty;

    public string ClaimDate { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public int ServiceCount { get; set; }

    public decimal TotalAmount { get; set; }

    // Open / Settled / Cancelled
    public string Status { get; set; } = string.Empty;

    public string SettledDate { get; set; } = string.Empty;

    public string SettledLedgerCode { get; set; } = string.Empty;

    public string SettledLedgerName { get; set; } = string.Empty;

    public string SettlementNo { get; set; } = string.Empty;

    public string SettlementRef { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<FreeServiceClaimLineDto> Lines { get; set; } = new();
}


// A brand with free services nobody claimed yet
public class FreeServiceBrandDto
{
    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public int ServiceCount { get; set; }

    public decimal Amount { get; set; }
}


public class FreeServiceClaimLookupsDto
{
    public string Today { get; set; } = string.Empty;

    public string NextClaimNo { get; set; } = string.Empty;

    public List<FreeServiceBrandDto> Brands { get; set; } = new();
}


public class SaveFreeServiceClaimDto
{
    public long BrandManagementId { get; set; }

    public string ClaimDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // The invoice lines that go on the claim
    public List<long> LineIds { get; set; } = new();
}


public class SettleFreeServiceClaimDto
{
    public string SettledDate { get; set; } = string.Empty;

    // Where the brand's money went : a bank / cash ledger, or the
    // brand's supplier account (adjustment against purchase dues)
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string Reference { get; set; } = string.Empty;
}
