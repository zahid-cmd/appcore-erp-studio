//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning
//===============================================================

public class PageCloning
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long Id { get; set; }


    //===========================================================
    // Clone From
    //===========================================================

    public long CloneFromId { get; set; }

    public string CloneFromCode { get; set; } = string.Empty;

    public string CloneFromName { get; set; } = string.Empty;


    //===========================================================
    // Clone To
    //===========================================================

    public long CloneToId { get; set; }

    public string CloneToCode { get; set; } = string.Empty;

    public string CloneToName { get; set; } = string.Empty;


    //===========================================================
    // Clone Type
    //===========================================================

    public string CloningType { get; set; } = "Page";


    //===========================================================
    // Files
    //===========================================================

    public int NumberOfFiles { get; set; }


    //===========================================================
    // Operation
    //===========================================================

    public string Operation { get; set; } = "Clone";


    //===========================================================
    // Status
    //===========================================================

    public string Status { get; set; } = "Pending";


    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }


    //===========================================================
    // Last Cloning
    //===========================================================

    public long? LastClonedBy { get; set; }

    public DateTime? LastClonedDate { get; set; }

    public string LastCloningResult { get; set; } = string.Empty;


    //===========================================================
    // Active Status
    //===========================================================

    public bool IsActive { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public bool IsDeleted { get; set; }
}