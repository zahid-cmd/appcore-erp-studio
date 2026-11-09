//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.CkdDocuments;


//===============================================================
// CKD Documents Status (hand-written page, no Code Sync)
//
// Inventory Management > Inventory Status > CKD Documents Status.
// CKD documents = the distributor's import document set of a
// chassis (needed for BRTA registration and the customer file).
// Status per chassis : Yes (in hand / on the portal) / No.
//===============================================================

public static class CkdStatuses
{
    public const string Yes = "Yes";

    public const string No = "No";
}


// Unit = a bike record (MotorBikeUnits); File = an opening customer
// file whose chassis has no bike record (sold before the system)
public static class CkdRowKinds
{
    public const string Unit = "Unit";

    public const string File = "File";
}


// Activity history of a row
public static class CkdHistory
{
    public const string Module = "Inventory Management";

    public const string UnitEntity = "CkdDocuments";

    public const string FileEntity = "CkdDocumentsFile";
}


public class CkdDocumentRowDto
{
    // Unit / File
    public string Kind { get; set; } = string.Empty;

    // MotorBikeUnitId (Unit) or CustomerFileId (File)
    public long Id { get; set; }

    // File rows : the customer file's PublicId
    public Guid? PublicId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // Purchase / Opening Stock / Opening File
    public string Source { get; set; } = string.Empty;

    // Purchase No / Opening Stock No / Customer File No
    public string SourceNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    // InStock / Sold / Returned / Transferred / Delivered ...
    public string StockStatus { get; set; } = string.Empty;

    public string StockInDate { get; set; } = string.Empty;

    public string CustomerFileNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    // Yes / No
    public string CkdStatus { get; set; } = CkdStatuses.No;

    public string CkdCheckedDate { get; set; } = string.Empty;

    public string CkdCheckedByName { get; set; } = string.Empty;

    public string CkdRemarks { get; set; } = string.Empty;

    // Year of manufacture (BRTA Form-17); null = not known
    public int? ManufactureYear { get; set; }
}


public class CkdDocumentsPageDto
{
    public List<CkdDocumentRowDto> Rows { get; set; } = new();

    public string Today { get; set; } = string.Empty;
}


// Change the status of one chassis. Yes -> No needs a reason in
// Remarks (e.g. lost by the customer after delivery : GD no.)
public class SetCkdStatusDto
{
    public string CkdStatus { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Year of manufacture : null = unchanged
    public int? ManufactureYear { get; set; }
}
