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

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
