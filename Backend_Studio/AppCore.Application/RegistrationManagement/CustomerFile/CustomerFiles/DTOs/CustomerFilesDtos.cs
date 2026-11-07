//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.CustomerFile;


//===============================================================
// Customer Files : fixed lists
//===============================================================

public static class CustomerFileStatuses
{
    public const string Open = "Open";

    public const string ReadyForDelivery = "ReadyForDelivery";

    public const string Delivered = "Delivered";

    public const string Cancelled = "Cancelled";

    public static readonly string[] All =
    {
        Open,
        ReadyForDelivery,
        Delivered,
        Cancelled
    };
}


public static class CustomerFileSources
{
    public const string Invoice = "Invoice";

    public const string Opening = "Opening";
}


//===============================================================
// A file (list row and View)
//===============================================================

public class CustomerFileDto
{
    public long CustomerFileId { get; set; }

    public Guid PublicId { get; set; }

    public string CustomerFileNo { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;

    public string FileDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string SalesInvoiceDate { get; set; } = string.Empty;

    public string SalesmanName { get; set; } = string.Empty;

    public long MotorBikeId { get; set; }

    public string BikeName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string VehiclePower { get; set; } = string.Empty;

    public long OriginalCustomerId { get; set; }

    public string OriginalCustomerName { get; set; } = string.Empty;

    public long CurrentCustomerId { get; set; }

    public string CurrentCustomerName { get; set; } = string.Empty;

    public string CurrentCustomerPhone { get; set; } = string.Empty;

    public string CurrentCustomerNid { get; set; } = string.Empty;

    public string RegistrationBy { get; set; } = string.Empty;

    public string RegistrationFileNo { get; set; } = string.Empty;

    public int TransferCount { get; set; }

    public string FileReadyDate { get; set; } = string.Empty;

    public string CollectedDate { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}


public class CustomerFileTransferDto
{
    public long NameTransferId { get; set; }

    public Guid PublicId { get; set; }

    public string TransferNo { get; set; } = string.Empty;

    public long CustomerFileId { get; set; }

    public Guid CustomerFilePublicId { get; set; }

    public string CustomerFileNo { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string TransferDate { get; set; } = string.Empty;

    public long FromCustomerId { get; set; }

    public string FromCustomerName { get; set; } = string.Empty;

    public long ToCustomerId { get; set; }

    public string ToCustomerName { get; set; } = string.Empty;

    public decimal FeeAmount { get; set; }

    public string DocumentCodes { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Only the latest transfer of a file can be cancelled
    public bool IsLatest { get; set; }
}


//===============================================================
// Everything the page shows (one call)
//===============================================================

public class CustomerFilesPageDto
{
    public List<CustomerFileDto> Files { get; set; } = new();

    public List<CustomerFileTransferDto> Transfers { get; set; } = new();

    public string Today { get; set; } = string.Empty;
}


//===============================================================
// Lookups for the forms
//===============================================================

public class CustomerFileLookupItem
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Bikes : Fuel / Electric; customers : phone
    public string Extra { get; set; } = string.Empty;
}


public class CustomerFilesDefaultsDto
{
    // CF-OPEN-0001
    public string NextOpeningNo { get; set; } = string.Empty;

    public string NextTransferNo { get; set; } = string.Empty;

    // Motor Bikes (model + colour) with their power
    public List<CustomerFileLookupItem> Bikes { get; set; } = new();

    // Live customers (Inbound first)
    public List<CustomerFileLookupItem> Customers { get; set; } = new();

    // Name Transfer Documents (active)
    public List<CustomerFileLookupItem> TransferDocuments { get; set; } = new();
}


// Name transfer policy in force on a date (for a file)
public class NameTransferQuoteDto
{
    public bool Allowed { get; set; }

    public string Message { get; set; } = string.Empty;

    public int TransfersAllowed { get; set; }

    public int TransfersMade { get; set; }

    public decimal FeePerTransfer { get; set; }

    public string PolicyCode { get; set; } = string.Empty;
}


//===============================================================
// Save bodies
//===============================================================

// Opening file (bikes sold before the system)
public class SaveOpeningFileDto
{
    public string FileDate { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string SalesInvoiceDate { get; set; } = string.Empty;

    public string SalesmanName { get; set; } = string.Empty;

    public long MotorBikeId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string RegistrationBy { get; set; } = "Dealer";

    public string Remarks { get; set; } = string.Empty;
}


// Status : Open / ReadyForDelivery (ready date) / Delivered (collected date)
public class SetCustomerFileStatusDto
{
    public string Status { get; set; } = string.Empty;

    public string Date { get; set; } = string.Empty;
}


public class SaveNameTransferDto
{
    public Guid CustomerFilePublicId { get; set; }

    public string TransferDate { get; set; } = string.Empty;

    public long ToCustomerId { get; set; }

    public List<string> DocumentCodes { get; set; } = new();

    public string Remarks { get; set; } = string.Empty;
}
