//===============================================================
// Deployment Center DTOs
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// One deployment / rollback (list + detail; Log only in detail)
//===============================================================

public class DeploymentCenterDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    // R-0001
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long ServerManagementId { get; set; }

    public string ServerName { get; set; } = string.Empty;

    // Deploy / Rollback
    public string Kind { get; set; } = string.Empty;

    // Running / Succeeded / Failed / Rolled back
    public string DeployStatus { get; set; } = string.Empty;

    public string Step { get; set; } = string.Empty;

    public int Percent { get; set; }

    public string Branch { get; set; } = string.Empty;

    public string CommitHash { get; set; } = string.Empty;

    public string CommitMessage { get; set; } = string.Empty;

    public string BackupFile { get; set; } = string.Empty;

    public string PreviousRelease { get; set; } = string.Empty;

    public decimal PackageMb { get; set; }

    public DateTime? StartedDate { get; set; }

    public DateTime? FinishedDate { get; set; }

    public int DurationSeconds { get; set; }

    public string PerformedByName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // detail only
    public string? Log { get; set; }
}


//===============================================================
// Live progress (polled by the page while a job runs)
//===============================================================

public class DeploymentProgressDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Kind { get; set; } = string.Empty;

    public string DeployStatus { get; set; } = string.Empty;

    public string Step { get; set; } = string.Empty;

    public int Percent { get; set; }

    public bool Finished { get; set; }

    public int ElapsedSeconds { get; set; }

    // last lines of the log
    public List<string> Log { get; set; } = new();
}


//===============================================================
// Pre-flight (what would be deployed)
//===============================================================

public class DeploymentPreflightDto
{
    public bool Ready { get; set; }

    public string RepositoryPath { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;

    public string CommitHash { get; set; } = string.Empty;

    public string CommitMessage { get; set; } = string.Empty;

    public int Ahead { get; set; }

    public int Behind { get; set; }

    public int LocalChanges { get; set; }

    public string NextRelease { get; set; } = string.Empty;

    // a deployment is running now (its public id)
    public Guid? RunningPublicId { get; set; }

    public List<string> Problems { get; set; } = new();
}


//===============================================================
// A release folder on a server (from the agent)
//===============================================================

public class ServerReleaseDto
{
    public string Release { get; set; } = string.Empty;

    public string Commit { get; set; } = string.Empty;

    public string DeployedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public bool IsCurrent { get; set; }
}
