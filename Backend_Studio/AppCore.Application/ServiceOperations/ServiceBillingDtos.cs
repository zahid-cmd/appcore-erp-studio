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

    // The place of the line on the bill (1, 2, ...)
    public int LineNo { get; set; }

    // Service / Part / Outside
    public string LineType { get; set; } = string.Empty;

    public string ItemKind { get; set; } = string.Empty;

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    // The share of the line in the item discount : the percent
    // ("10%", '' when only an amount was given) and its amount. VAT
    // is counted on Amount - Discount
    public string DiscountText { get; set; } = string.Empty;

    public decimal Discount { get; set; }

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

    // A part bought outside for the job (Parts Outsourcing) : set when
    // the job is priced, shown apart from the parts of the store
    public bool IsOutsourced { get; set; }
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

    // The discount of the bill as a whole (the round off)
    public decimal Discount { get; set; }

    // The discounts of the lines, together
    public decimal LineDiscount { get; set; }

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

    // Job Closing (owner 2026-11-19) : the job is closed from the
    // work - the bill goes to the receivable of the customer, no
    // money is taken (Billing collects it). Set by the API only,
    // never by a page.
    public bool Closing { get; set; }

    // Outside work : ItemName (the work), Note (the vendor), Cost
    // (the vendor's charge), Amount (billed to the customer)
    public List<ServiceInvoiceLineDto> OutsideLines { get; set; } = new();

    public List<ServiceInvoicePaymentDto> Payments { get; set; } = new();

    // The item discount (owner 2026-11-19) : a percent that every
    // charged line takes, and an amount that the charged lines
    // absorb by their value. Both land on the lines; VAT is counted
    // after them. (Discount, above, is the round off : no line
    // carries it.)
    public decimal ItemDiscountPercent { get; set; }

    public decimal ItemDiscountAmount { get; set; }

    // Job Closing : what became of each complaint and observation
    public List<ClosingFindingDto> Findings { get; set; } = new();
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



//===============================================================
// Job Closing (owner 2026-11-19) : stage 4 of a job card. The work
// is over : the job is priced (service charges, the parts issued
// less returned, outside works, VAT, discount), the sale goes to the
// receivable of the customer and the job gets its bill number. No
// money here : the Billing stage collects it.
//===============================================================

// A job that can be closed
public class ClosingJobDto
{
    public Guid PublicId { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string JobCardNo { get; set; } = string.Empty;

    public string JobDate { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string JobType { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    public string SerialToken { get; set; } = string.Empty;

    // Parts allocated to the job and not issued : they are left
    // out of the bill
    public int UnissuedParts { get; set; }

    public decimal UnissuedQuantity { get; set; }
}

public class ClosingLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    public List<ClosingJobDto> Jobs { get; set; } = new();
}


//===============================================================
// Job Closing : the whole job before it is closed (owner
// 2026-11-19) - the parts (allocated, issued, returned, on the job,
// remaining), the issues and the returns, and what became of each
// complaint and observation. The job card itself rides along.
//===============================================================

// A complaint of the customer or an observation of the opening desk
public class ClosingFindingDto
{
    // Complaint / Observation
    public string Kind { get; set; } = string.Empty;

    public long Id { get; set; }

    public string Text { get; set; } = string.Empty;

    // An observation : its note of the opening
    public string Note { get; set; } = string.Empty;

    // '' (not marked) / Solved / Needs Further Work / Not Done
    public string Result { get; set; } = string.Empty;

    public string ResultNote { get; set; } = string.Empty;
}

public class ClosingPartDto
{
    public string ItemKind { get; set; } = string.Empty;

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Allocated { get; set; }

    public decimal Issued { get; set; }

    public decimal Returned { get; set; }

    // Issued less returned : what is billed
    public decimal OnJob { get; set; }

    // Allocated and not on the job : left out of the bill
    public decimal Remaining { get; set; }

    public decimal Rate { get; set; }
}

// A line of a parts issue or of a parts return of the job
public class ClosingMoveDto
{
    public string DocNo { get; set; } = string.Empty;

    // An issue : its slip. A return : the issue it came from
    public string RefNo { get; set; } = string.Empty;

    public string Date { get; set; } = string.Empty;

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // An issue line : how much of it came back
    public decimal Returned { get; set; }

    public decimal Cost { get; set; }
}

// Job Closing, tab Outsourcing : an outside work done by a vendor or
// a part bought outside for the job (posted entries only)
public class ClosingOutsourcedDto
{
    // Work / Part
    public string Kind { get; set; } = string.Empty;

    public string DocNo { get; set; } = string.Empty;

    public string Date { get; set; } = string.Empty;

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public string VendorName { get; set; } = string.Empty;

    public string BillNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // what the vendor charges
    public decimal Cost { get; set; }

    // what the customer pays
    public decimal Amount { get; set; }
}

public class ClosingDetailDto
{
    public JobCardDto? Card { get; set; }

    public List<ClosingPartDto> Parts { get; set; } = new();

    public List<ClosingMoveDto> Issues { get; set; } = new();

    public List<ClosingMoveDto> Returns { get; set; } = new();

    public List<ClosingOutsourcedDto> Outsourced { get; set; } = new();

    public List<ClosingFindingDto> Findings { get; set; } = new();
}
