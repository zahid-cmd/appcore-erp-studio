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

    // Draft / Running / Succeeded / Failed / Rolled back
    public string DeployStatus { get; set; } = string.Empty;

    public string Step { get; set; } = string.Empty;

    public int Percent { get; set; }

    public Guid? ServerPublicId { get; set; }

    public string ReleaseNotes { get; set; } = string.Empty;

    // 1.4.2 ('' = before versions / not deployed yet)
    public string Version { get; set; } = string.Empty;

    // Fix / Feature / Major
    public string ChangeType { get; set; } = "Feature";

    public string WhatsNew { get; set; } = string.Empty;

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


//===============================================================
// New deployment : what would go into the next release
//===============================================================

public class DeploymentDraftDefaultsDto
{
    public string NextRelease { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;

    public string CommitHash { get; set; } = string.Empty;

    public string CommitMessage { get; set; } = string.Empty;

    public int Ahead { get; set; }

    public int Behind { get; set; }

    public int LocalChanges { get; set; }

    // the last release that went live on this server
    public string LastRelease { get; set; } = string.Empty;

    public string LastCommit { get; set; } = string.Empty;

    // commit messages since LastCommit (one per line)
    public string ReleaseNotes { get; set; } = string.Empty;

    public int NewCommits { get; set; }

    // Version : the last one on the server and the three choices
    public string LastVersion { get; set; } = string.Empty;

    public string NextFix { get; set; } = string.Empty;

    public string NextFeature { get; set; } = string.Empty;

    public string NextMajor { get; set; } = string.Empty;

    // Analysis of the changes since the last deployment
    public DeploymentAnalysisDto Analysis { get; set; } = new();

    public List<string> Problems { get; set; } = new();
}


//===============================================================
// Analysis : what changed since the last deployment
//===============================================================

public class DeploymentAnalysisDto
{
    // commit messages since the last deployed commit
    public List<string> Commits { get; set; } = new();

    // pages / parts of the ERP whose files changed
    public List<DeploymentChangeAreaDto> Areas { get; set; } = new();

    // SQL scripts changed : run them on the database
    public List<string> DatabaseScripts { get; set; } = new();

    public int FilesChanged { get; set; }

    // draft for "What's new" (one line each; edit before deploy)
    public string WhatsNewDraft { get; set; } = string.Empty;
}

public class DeploymentChangeAreaDto
{
    // "Settings - Website Configuration"
    public string Name { get; set; } = string.Empty;

    // Screen (user facing) / Server
    public string Side { get; set; } = string.Empty;

    public int Files { get; set; }
}


//===============================================================
// Version history (every signed-in user)
//===============================================================

public class AppVersionDto
{
    public string Version { get; set; } = string.Empty;

    public string Release { get; set; } = string.Empty;

    public string ChangeType { get; set; } = string.Empty;

    public DateTime? Date { get; set; }

    public List<string> WhatsNew { get; set; } = new();
}
