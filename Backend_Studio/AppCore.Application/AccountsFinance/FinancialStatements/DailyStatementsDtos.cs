//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Daily statements (Accounts & Finance › Financial Statements)
//
//   Daily Collection Statement : every voucher of the period that
//   brought money into a Cash / Bank / MFS / POS / EMI ledger
//   (POS / EMI on the sale day), and the refunds paid back to
//   customers.
//   Invoice-wise Daily Profit & Loss : every posted sales invoice
//   and sales return of Motor Bikes / Spare Parts & Lubricants /
//   Accessories, its figures read from its own journal.
//===============================================================

//===============================================================
// Daily Collection
//===============================================================

public class DailyCollectionRowDto
{
    // yyyy-MM-dd (voucher date)
    public string Date { get; set; } = string.Empty;

    // HH:mm (posting time, Bangladesh time)
    public string Time { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    // RV / SIMB / ... (the voucher's type)
    public string VoucherType { get; set; } = string.Empty;

    // The source document (the voucher's reference, else the
    // voucher itself) and its kind : "Sales Invoice - MB", ...
    public string DocumentNo { get; set; } = string.Empty;

    public string DocumentType { get; set; } = string.Empty;

    // mb / sp / ac / service / customer (no invoice) / other
    public string Line { get; set; } = "other";

    public string Customer { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    // Cash / Bank / MFS / POS / EMI ledgers the money went to
    public string Accounts { get; set; } = string.Empty;

    // Money in by mode (negative on a refund)
    public decimal Cash { get; set; }

    public decimal Bank { get; set; }

    public decimal Mfs { get; set; }

    public decimal Pos { get; set; }

    public decimal Emi { get; set; }

    public decimal Total { get; set; }

    // Money paid back to a customer (sales return, refund)
    public bool IsRefund { get; set; }

    // The user who saved (posted) the voucher
    public long CollectedById { get; set; }

    public string CollectedBy { get; set; } = string.Empty;
}


public class DailyCollectionUserDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class DailyCollectionDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public string Message { get; set; } = string.Empty;

    // Users who collected in the period (filter list)
    public List<DailyCollectionUserDto> Users { get; set; } = new();

    public List<DailyCollectionRowDto> Rows { get; set; } = new();
}


//===============================================================
// Invoice-wise Daily Profit & Loss
//===============================================================

public class InvoiceProfitLineDto
{
    public int LineNo { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // MB : chassis / engine / colour
    public string ChassisNo { get; set; } = string.Empty;

    public string Detail { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal Gross { get; set; }

    public decimal Discount { get; set; }

    // After discount, without the VAT inside the price
    public decimal Net { get; set; }

    public decimal UnitCost { get; set; }

    public decimal Cost { get; set; }

    public decimal Profit { get; set; }
}


public class InvoiceProfitRowDto
{
    // mb / sp / ac
    public string Line { get; set; } = string.Empty;

    // invoice / return
    public string Kind { get; set; } = "invoice";

    // yyyy-MM-dd (voucher date)
    public string Date { get; set; } = string.Empty;

    public string DocumentNo { get; set; } = string.Empty;

    // Return : the invoice it came from
    public string InvoiceNo { get; set; } = string.Empty;

    public string Customer { get; set; } = string.Empty;

    public string SalesPerson { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // MB : the chassis numbers
    public string Chassis { get; set; } = string.Empty;

    // From the journal (income positive; a return is negative) :
    //   Sales      sales-class ledgers, Cr - Dr (without VAT)
    //   Discount   expense ledgers on it, Dr - Cr (discounts,
    //              price reduction)
    //   Other      other-income ledgers on it, Cr - Dr (price
    //              increase, commission)
    //   NetSales   Sales - Discount + Other
    //   Cost       cost of goods sold, Dr - Cr (FIFO)
    //   Profit     NetSales - Cost
    public decimal Sales { get; set; }

    public decimal Discount { get; set; }

    public decimal Other { get; set; }

    public decimal NetSales { get; set; }

    public decimal Cost { get; set; }

    public decimal Profit { get; set; }

    // Other vouchers under this invoice's number added to it
    // (free accessories' promotional expense, registration
    // reversal ...)
    public int LinkedVouchers { get; set; }

    public List<InvoiceProfitLineDto> Lines { get; set; } = new();
}


public class InvoiceProfitDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public string Message { get; set; } = string.Empty;

    // The Profit & Loss of the same period by business line
    // (mb / sp / ac) : the page compares the invoices with it
    public List<InvoiceProfitCheckDto> Checks { get; set; } = new();

    public List<InvoiceProfitRowDto> Rows { get; set; } = new();
}


public class InvoiceProfitCheckDto
{
    // mb / sp / ac
    public string Line { get; set; } = string.Empty;

    // Sales classes, Cr - Dr
    public decimal Sales { get; set; }

    // Cost of goods sold, Dr - Cr
    public decimal Cost { get; set; }
}
