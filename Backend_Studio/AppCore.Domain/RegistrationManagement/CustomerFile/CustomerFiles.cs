//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.RegistrationManagement.CustomerFile;


//===============================================================
// Customer Files (hand-written page, NO Code Synchronization;
// tables made by CustomerFiles_Tables.sql). One record per
// chassis : the landing station of every customer after a sale.
//===============================================================

public class CustomerFiles
{
    public long CustomerFileId { get; set; }

    public Guid PublicId { get; set; }

    // Sales Invoice No + "/<line>"; opening files CF-OPEN-0001
    public string CustomerFileNo { get; set; } = string.Empty;

    // Invoice / Opening
    public string Source { get; set; } = string.Empty;

    public DateOnly FileDate { get; set; }

    public long BranchId { get; set; }

    public long? SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public DateOnly? SalesInvoiceDate { get; set; }

    public string SalesmanName { get; set; } = string.Empty;

    // The bike (model + colour)
    public long MotorBikeId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    // Fuel / Electric (the model's specification)
    public string VehiclePower { get; set; } = string.Empty;

    // Customer Profiles
    public long OriginalCustomerId { get; set; }

    public long CurrentCustomerId { get; set; }

    // Dealer / Customer
    public string RegistrationBy { get; set; } = string.Empty;

    public long? RegistrationTypeId { get; set; }

    public string RegistrationFileNo { get; set; } = string.Empty;

    public int TransferCount { get; set; }

    public DateOnly? FileReadyDate { get; set; }

    public DateOnly? CollectedDate { get; set; }

    // Open / ReadyForDelivery / Delivered / Cancelled
    public string Status { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Name transfers before registration (history lines of a file)
//===============================================================

public class CustomerFileNameTransfers
{
    public long NameTransferId { get; set; }

    public Guid PublicId { get; set; }

    // NTF-000001
    public string TransferNo { get; set; } = string.Empty;

    public long CustomerFileId { get; set; }

    public DateOnly TransferDate { get; set; }

    public long FromCustomerId { get; set; }

    public long ToCustomerId { get; set; }

    public long? NameTransferRuleId { get; set; }

    public decimal FeeAmount { get; set; }

    // "NTD-001,NTD-003"
    public string DocumentCodes { get; set; } = string.Empty;

    // FeePending (waits for its fee; the file is not changed yet) /
    // Completed (the new owner holds the file)
    public string Status { get; set; } = "Completed";

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Fees of a file : a name transfer fee or a custody charge,
// collected on the Fees Collection tab (Receipt Voucher through
// the Payment Desk). Table made by CustomerFileFees_Tables.sql.
//===============================================================

public class CustomerFileFees
{
    public long CustomerFileFeeId { get; set; }

    public Guid PublicId { get; set; }

    // CFF-000001
    public string FeeNo { get; set; } = string.Empty;

    public long CustomerFileId { get; set; }

    // NameTransfer / Custody
    public string FeeType { get; set; } = string.Empty;

    public long? NameTransferId { get; set; }

    public DateOnly FeeDate { get; set; }

    // The customer who pays (Customer Profiles)
    public long CustomerId { get; set; }

    public decimal Amount { get; set; }

    // Custody : the collected date the charge was worked out for
    public DateOnly? CustodyUpTo { get; set; }

    // Pending / Due / Paid / Cancelled
    public string Status { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // Due : the Journal Voucher that booked it
    public long? DueVoucherId { get; set; }

    public string DueVoucherNo { get; set; } = string.Empty;

    // Paid : the Receipt Voucher that collected it
    public long? ReceiptVoucherId { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public DateOnly? PaidDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
