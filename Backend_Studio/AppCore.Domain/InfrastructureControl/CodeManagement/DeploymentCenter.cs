//===============================================================
// Deployment Center
//
// One deployment (or rollback) to a server of Server Management.
// Code = the release number (R-0001), the same folder name the
// Deploy Agent uses on the server.
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.CodeManagement;

public class DeploymentCenter
{
    public long Id { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // R-0001
    public string Code { get; set; } = string.Empty;

    // short title : commit message / "Rollback to R-0003"
    public string Name { get; set; } = string.Empty;

    //===========================================================
    // Target
    //===========================================================

    public long ServerManagementId { get; set; }

    public string ServerName { get; set; } = string.Empty;

    // Deploy / Rollback
    public string Kind { get; set; } = "Deploy";

    //===========================================================
    // Progress / Result
    //===========================================================

    // Draft / Running / Succeeded / Failed / Rolled back
    public string DeployStatus { get; set; } = "Running";

    public string Step { get; set; } = string.Empty;

    public int Percent { get; set; }

    public string AgentJobId { get; set; } = string.Empty;

    public string BackupFile { get; set; } = string.Empty;

    public string PreviousRelease { get; set; } = string.Empty;

    public decimal PackageMb { get; set; }

    public DateTime? StartedDate { get; set; }

    public DateTime? FinishedDate { get; set; }

    public int DurationSeconds { get; set; }

    public string Log { get; set; } = string.Empty;

    //===========================================================
    // Source (git)
    //===========================================================

    public string Branch { get; set; } = string.Empty;

    public string CommitHash { get; set; } = string.Empty;

    public string CommitMessage { get; set; } = string.Empty;

    // what is in the release (commit messages; editable)
    public string ReleaseNotes { get; set; } = string.Empty;


    //===========================================================
    // Version (2026-11-09)
    //===========================================================

    // 1.4.2 : given on Deploy ('' = before versions)
    public string Version { get; set; } = string.Empty;

    // Fix / Feature / Major
    public string ChangeType { get; set; } = "Feature";

    // lines users see after the update ('' = no pop-up)
    public string WhatsNew { get; set; } = string.Empty;

    //===========================================================
    // Audit
    //===========================================================

    public string PerformedByName { get; set; } = string.Empty;

    public bool Status { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
