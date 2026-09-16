//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;


//===============================================================
// SourceControlRepository
//===============================================================

public class SourceControlRepository
    : ISourceControlRepository
{
    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public SourceControlRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>>
        GetAllAsync()
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
            .AsNoTracking()
            .Where(
                x =>
                    !x.IsDeleted
            )
            .OrderBy(
                x =>
                    x.RepositoryName
            )
            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl?>
        GetByIdAsync
    (
        long sourceControlId
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x =>
                    x.SourceControlId == sourceControlId
                    &&
                    !x.IsDeleted
            );
    }



    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl entity
    )
    {
        const long userId =
            1;


        entity.IsActive =
            true;


        entity.IsDeleted =
            false;


        entity.DeletedBy =
            null;


        entity.DeletedDate =
            null;


        entity.CreatedBy =
            userId;


        entity.CreatedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            null;


        entity.ModifiedDate =
            null;


        await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
            .AddAsync(
                entity
            );


        await _context
            .SaveChangesAsync();


        await CreateActivityHistoryAsync(
            entity.SourceControlId,

            "Create",

            "SourceControl Created",

            $"SourceControl '{entity.RepositoryName}' was created."
        );


        return entity.SourceControlId;
    }



    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
                .FirstOrDefaultAsync(
                    x =>
                        x.SourceControlId == entity.SourceControlId
                        &&
                        !x.IsDeleted
                );


        if
        (
            existing is null
        )
        {
            throw new InvalidOperationException(
                "SourceControl record was not found."
            );
        }


        existing.RepositoryCode =
            entity.RepositoryCode;


        existing.RepositoryName =
            entity.RepositoryName;


        existing.GitRemoteUrl =
            entity.GitRemoteUrl;


        existing.DefaultBranch =
            entity.DefaultBranch;


        existing.RepositoryPath =
            entity.RepositoryPath;


        existing.Remarks =
            entity.Remarks;


        existing.IsActive =
            entity.IsActive;


        existing.ModifiedBy =
            userId;


        existing.ModifiedDate =
            DateTime.UtcNow;


        await CreateActivityHistoryAsync(
            existing.SourceControlId,

            "Update",

            "SourceControl Updated",

            $"SourceControl '{existing.RepositoryName}' was updated."
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
    (
        long sourceControlId
    )
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
                .FirstOrDefaultAsync(
                    x =>
                        x.SourceControlId == sourceControlId
                        &&
                        !x.IsDeleted
                );


        if
        (
            entity is null
        )
        {
            return;
        }


        entity.IsDeleted =
            true;


        entity.IsActive =
            false;


        entity.DeletedBy =
            userId;


        entity.DeletedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await CreateActivityHistoryAsync(
            entity.SourceControlId,

            "Delete",

            "SourceControl Deleted",

            $"SourceControl '{entity.RepositoryName}' was deleted."
        );
    }



    //===========================================================
    // Restore
    //===========================================================

    public async Task
        RestoreAsync()
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
                .Where(
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending(
                    x =>
                        x.DeletedDate
                )
                .FirstOrDefaultAsync();


        if
        (
            entity is null
        )
        {
            throw new InvalidOperationException(
                "No deleted SourceControl record was found to restore."
            );
        }


        entity.IsDeleted =
            false;


        entity.IsActive =
            true;


        entity.DeletedBy =
            null;


        entity.DeletedDate =
            null;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await CreateActivityHistoryAsync(
            entity.SourceControlId,

            "Restore",

            "SourceControl Restored",

            $"SourceControl '{entity.RepositoryName}' was restored."
        );
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "InfrastructureControl"

                    &&

                    x.EntityName ==
                    "SourceControl"
            )

            .OrderByDescending(
                x =>
                    x.PerformedDate
            )

            .Select(
                x =>
                    new ActivityHistoryDto
                    {
                        Id =
                            x.Id,

                        Module =
                            x.Module,

                        EntityName =
                            x.EntityName,

                        EntityId =
                            x.EntityId,

                        ActivityType =
                            x.ActivityType,

                        ActivityTitle =
                            x.ActivityTitle,

                        ActivityDescription =
                            x.ActivityDescription,

                        PerformedBy =
                            x.PerformedBy,

                        PerformedByName =
                            x.PerformedByName,

                        PerformedDate =
                            x.PerformedDate
                    }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
    (
        long sourceControlId
    )
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "InfrastructureControl"

                    &&

                    x.EntityName ==
                    "SourceControl"

                    &&

                    x.EntityId ==
                    sourceControlId
            )

            .OrderByDescending(
                x =>
                    x.PerformedDate
            )

            .Select(
                x =>
                    new ActivityHistoryDto
                    {
                        Id =
                            x.Id,

                        Module =
                            x.Module,

                        EntityName =
                            x.EntityName,

                        EntityId =
                            x.EntityId,

                        ActivityType =
                            x.ActivityType,

                        ActivityTitle =
                            x.ActivityTitle,

                        ActivityDescription =
                            x.ActivityDescription,

                        PerformedBy =
                            x.PerformedBy,

                        PerformedByName =
                            x.PerformedByName,

                        PerformedDate =
                            x.PerformedDate
                    }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get Git Status
    //===========================================================

    public async Task<GitStatusDto>
        GetStatusAsync
    (
        long sourceControlId
    )
    {
        var result =
            new GitStatusDto
            {
                RepositoryName =
                    string.Empty,

                Branch =
                    string.Empty,

                LastCommitHash =
                    string.Empty,

                LastCommitMessage =
                    string.Empty,

                IsClean =
                    false,

                ModifiedFiles =
                    []
            };


        try
        {
            var sourceControl =
                await GetSourceControlForGitAsync(
                    sourceControlId
                );


            if
            (
                sourceControl is null
            )
            {
                result.ModifiedFiles.Add(
                    "Source Control repository was not found."
                );

                return result;
            }


            result.RepositoryName =
                sourceControl.RepositoryName;


            var validation =
                ValidateRepository(
                    sourceControl
                );


            if
            (
                !validation.Success
            )
            {
                result.ModifiedFiles.Add(
                    validation.Message
                );

                return result;
            }


            var branchResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "branch",

                    "--show-current"
                );


            if
            (
                !branchResult.Success
            )
            {
                result.ModifiedFiles.Add(
                    branchResult.Error
                );

                return result;
            }


            result.Branch =
                branchResult.Output.Trim();


            var hashResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "rev-parse",

                    "HEAD"
                );


            if
            (
                hashResult.Success
            )
            {
                result.LastCommitHash =
                    hashResult.Output.Trim();
            }


            var messageResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "log",

                    "-1",

                    "--pretty=%B"
                );


            if
            (
                messageResult.Success
            )
            {
                result.LastCommitMessage =
                    messageResult.Output.Trim();
            }


            var statusResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "status",

                    "--short"
                );


            if
            (
                !statusResult.Success
            )
            {
                result.ModifiedFiles.Add(
                    statusResult.Error
                );

                return result;
            }


            result.ModifiedFiles =
                ParseGitStatus(
                    statusResult.Output
                );


            result.IsClean =
                result.ModifiedFiles.Count == 0;


            return result;
        }
        catch
        (
            Exception exception
        )
        {
            result.IsClean =
                false;

            result.ModifiedFiles =
                [
                    exception.Message
                ];

            return result;
        }
    }



    //===========================================================
    // Pull Latest
    //===========================================================

    public async Task<GitOperationResultDto>
        PullAsync
    (
        long sourceControlId
    )
    {
        try
        {
            var sourceControl =
                await GetSourceControlForGitAsync(
                    sourceControlId
                );


            if
            (
                sourceControl is null
            )
            {
                return GitFailure(
                    "Repository Not Found",
                    "Source Control repository was not found."
                );
            }


            var validation =
                ValidateRepository(
                    sourceControl
                );


            if
            (
                !validation.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PULL",

                    "Pull Failed",

                    validation.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Pull Failed",
                    validation.Message
                );
            }


            var localRepositoryResult =
                await EnsureLocalRepositoryAsync(
                    sourceControl
                );


            if
            (
                !localRepositoryResult.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PULL",

                    "Pull Failed",

                    localRepositoryResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Pull Failed",
                    localRepositoryResult.Message
                );
            }


            var remoteResult =
                await EnsureRemoteAsync(
                    sourceControl
                );


            if
            (
                !remoteResult.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PULL",

                    "Pull Failed",

                    remoteResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Pull Failed",
                    remoteResult.Message
                );
            }


            var branchResult =
                await EnsureCurrentBranchAsync(
                    sourceControl
                );


            if
            (
                !branchResult.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PULL",

                    "Pull Failed",

                    branchResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Pull Failed",
                    branchResult.Message
                );
            }


            var pullResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "pull",

                    "--ff-only",

                    "origin",

                    sourceControl.DefaultBranch
                );


            if
            (
                !pullResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Pull failed.",

                        pullResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PULL",

                    "Pull Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Pull Failed",
                    message,

                    pullResult.Output
                );
            }


            var output =
                NormalizeGitOutput(
                    pullResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "PULL",

                "Pull Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "Latest changes downloaded from the remote repository."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Latest repository changes downloaded successfully.",

                Output =
                    output
            };
        }
        catch
        (
            Exception exception
        )
        {
            await TryCreateGitHistoryAsync(
                sourceControlId,

                "PULL",

                "Pull Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Pull Failed",
                exception.Message
            );
        }
    }



    //===========================================================
    // Commit Changes
    //===========================================================

    public async Task<GitOperationResultDto>
        CommitAsync
    (
        long sourceControlId,

        GitCommitDto dto
    )
    {
        try
        {
            if
            (
                dto is null
                ||
                string.IsNullOrWhiteSpace(
                    dto.Message
                )
            )
            {
                return GitFailure(
                    "Commit Failed",
                    "Commit message is required."
                );
            }


            var sourceControl =
                await GetSourceControlForGitAsync(
                    sourceControlId
                );


            if
            (
                sourceControl is null
            )
            {
                return GitFailure(
                    "Commit Failed",
                    "Source Control repository was not found."
                );
            }


            var validation =
                ValidateRepository(
                    sourceControl
                );


            if
            (
                !validation.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Failed",

                    validation.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Commit Failed",
                    validation.Message
                );
            }


            var branchResult =
                await EnsureCurrentBranchAsync(
                    sourceControl
                );


            if
            (
                !branchResult.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Failed",

                    branchResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Commit Failed",
                    branchResult.Message
                );
            }


            var addResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "add",

                    "--all"
                );


            if
            (
                !addResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to stage repository changes.",

                        addResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Commit Failed",
                    message,

                    addResult.Output
                );
            }


            var stagedResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "diff",

                    "--cached",

                    "--quiet"
                );


            if
            (
                stagedResult.ExitCode == 0
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Skipped",

                    "No repository changes were available to commit.",

                    "SUCCESS"
                );


                return new GitOperationResultDto
                {
                    Success =
                        true,

                    Message =
                        "No repository changes were available to commit.",

                    Output =
                        "Working tree is already clean."
                };
            }


            if
            (
                stagedResult.ExitCode != 1
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to inspect staged repository changes.",

                        stagedResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Commit Failed",
                    message,

                    stagedResult.Output
                );
            }


            var commitMessage =
                dto.Message.Trim();


            var commitResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "commit",

                    "-m",

                    commitMessage
                );


            if
            (
                !commitResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Git commit operation failed.",

                        commitResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Commit Failed",
                    message,

                    commitResult.Output
                );
            }


            var hashResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "rev-parse",

                    "HEAD"
                );


            var commitHash =
                hashResult.Success
                    ? hashResult.Output.Trim()
                    : null;


            var output =
                NormalizeGitOutput(
                    commitResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "COMMIT",

                "Commit Created",

                commitMessage,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Repository changes committed successfully.",

                Output =
                    string.IsNullOrWhiteSpace(
                        commitHash
                    )
                    ? output
                    : $"{output}{Environment.NewLine}Commit: {commitHash}"
            };
        }
        catch
        (
            Exception exception
        )
        {
            await TryCreateGitHistoryAsync(
                sourceControlId,

                "COMMIT",

                "Commit Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Commit Failed",
                exception.Message
            );
        }
    }



    //===========================================================
    // Push Changes
    //===========================================================

    public async Task<GitOperationResultDto>
        PushAsync
    (
        long sourceControlId
    )
    {
        try
        {
            var sourceControl =
                await GetSourceControlForGitAsync(
                    sourceControlId
                );


            if
            (
                sourceControl is null
            )
            {
                return GitFailure(
                    "Push Failed",
                    "Source Control repository was not found."
                );
            }


            var validation =
                ValidateRepository(
                    sourceControl
                );


            if
            (
                !validation.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Failed",

                    validation.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Push Failed",
                    validation.Message
                );
            }


            var remoteResult =
                await EnsureRemoteAsync(
                    sourceControl
                );


            if
            (
                !remoteResult.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Failed",

                    remoteResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Push Failed",
                    remoteResult.Message
                );
            }


            var branchResult =
                await EnsureCurrentBranchAsync(
                    sourceControl
                );


            if
            (
                !branchResult.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Failed",

                    branchResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Push Failed",
                    branchResult.Message
                );
            }


            var pushResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "push",

                    "origin",

                    sourceControl.DefaultBranch
                );


            if
            (
                !pushResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Push failed.",

                        pushResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Push Failed",
                    message,

                    pushResult.Output
                );
            }


            var output =
                NormalizeGitOutput(
                    pushResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "PUSH",

                "Push Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "Repository changes were published to the remote repository."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Repository changes published successfully.",

                Output =
                    output
            };
        }
        catch
        (
            Exception exception
        )
        {
            await TryCreateGitHistoryAsync(
                sourceControlId,

                "PUSH",

                "Push Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Push Failed",
                exception.Message
            );
        }
    }



    //===========================================================
    // Full Repository Synchronization
    //===========================================================

    public async Task<GitOperationResultDto>
        SyncAsync
    (
        long sourceControlId,

        GitCommitDto dto
    )
    {
        try
        {
            if
            (
                dto is null
                ||
                string.IsNullOrWhiteSpace(
                    dto.Message
                )
            )
            {
                return GitFailure(
                    "Synchronization Failed",
                    "Synchronization message is required."
                );
            }


            var sourceControl =
                await GetSourceControlForGitAsync(
                    sourceControlId
                );


            if
            (
                sourceControl is null
            )
            {
                return GitFailure(
                    "Synchronization Failed",
                    "Source Control repository was not found."
                );
            }


            var validation =
                ValidateRepository(
                    sourceControl
                );


            if
            (
                !validation.Success
            )
            {
                await CreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Failed",

                    validation.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Synchronization Failed",
                    validation.Message
                );
            }


            //===================================================
            // Pull
            //===================================================

            var pullResult =
                await PullAsync(
                    sourceControlId
                );


            if
            (
                !pullResult.Success
            )
            {
                return new GitOperationResultDto
                {
                    Success =
                        false,

                    Message =
                        "Synchronization failed during Pull operation.",

                    Output =
                        pullResult.Output
                };
            }


            //===================================================
            // Commit
            //===================================================

            var commitResult =
                await CommitAsync(
                    sourceControlId,

                    dto
                );


            if
            (
                !commitResult.Success
            )
            {
                return new GitOperationResultDto
                {
                    Success =
                        false,

                    Message =
                        "Synchronization failed during Commit operation.",

                    Output =
                        commitResult.Output
                };
            }


            //===================================================
            // Push
            //===================================================

            var pushResult =
                await PushAsync(
                    sourceControlId
                );


            if
            (
                !pushResult.Success
            )
            {
                return new GitOperationResultDto
                {
                    Success =
                        false,

                    Message =
                        "Synchronization failed during Push operation.",

                    Output =
                        pushResult.Output
                };
            }


            //===================================================
            // Final Status
            //===================================================

            var finalStatus =
                await GetStatusAsync(
                    sourceControlId
                );


            var finalMessage =
                finalStatus.IsClean
                    ? "Pull → Commit → Push completed successfully. Repository is clean."
                    : "Pull → Commit → Push completed successfully. Repository contains remaining changes.";


            await CreateGitHistoryAsync(
                sourceControlId,

                "SYNC",

                "Synchronization Completed",

                finalMessage,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Repository synchronization completed successfully.",

                Output =
                    finalMessage
            };
        }
        catch
        (
            Exception exception
        )
        {
            await TryCreateGitHistoryAsync(
                sourceControlId,

                "SYNC",

                "Synchronization Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Synchronization Failed",
                exception.Message
            );
        }
    }



    //===========================================================
    // Get Source Control For Git
    //===========================================================

    private async Task<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl?>
        GetSourceControlForGitAsync
    (
        long sourceControlId
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>()
            .FirstOrDefaultAsync(
                x =>
                    x.SourceControlId ==
                    sourceControlId

                    &&

                    !x.IsDeleted

                    &&

                    x.IsActive
            );
    }



    //===========================================================
    // Validate Repository
    //===========================================================

    private static GitValidationResult
        ValidateRepository
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl sourceControl
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                sourceControl.RepositoryPath
            )
        )
        {
            return GitValidationResult.Failure(
                "Repository path is not configured."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                sourceControl.GitRemoteUrl
            )
        )
        {
            return GitValidationResult.Failure(
                "Git remote URL is not configured."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                sourceControl.DefaultBranch
            )
        )
        {
            return GitValidationResult.Failure(
                "Default branch is not configured."
            );
        }


        return GitValidationResult.SuccessResult();
    }



    //===========================================================
    // Ensure Local Repository
    //===========================================================

    private static async Task<GitValidationResult>
        EnsureLocalRepositoryAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl sourceControl
    )
    {
        var repositoryPath =
            sourceControl.RepositoryPath.Trim();


        var remoteUrl =
            sourceControl.GitRemoteUrl.Trim();


        var defaultBranch =
            sourceControl.DefaultBranch.Trim();


        try
        {
            if
            (
                !Directory.Exists(
                    repositoryPath
                )
            )
            {
                Directory.CreateDirectory(
                    repositoryPath
                );
            }
        }
        catch
        (
            Exception exception
        )
        {
            return GitValidationResult.Failure(
                $"Unable to create repository path '{repositoryPath}'. {exception.Message}"
            );
        }


        var gitDirectory =
            Path.Combine(
                repositoryPath,
                ".git"
            );


        if
        (
            Directory.Exists(
                gitDirectory
            )

            ||

            File.Exists(
                gitDirectory
            )
        )
        {
            return GitValidationResult.SuccessResult();
        }


        var hasFiles =
            Directory
                .EnumerateFileSystemEntries(
                    repositoryPath
                )
                .Any();


        if
        (
            hasFiles
        )
        {
            return GitValidationResult.Failure(
                $"Repository path '{repositoryPath}' is not an empty Git directory. Initial download was stopped to protect existing files."
            );
        }


        var cloneResult =
            await ExecuteGitCommandAsync(
                repositoryPath,

                "clone",

                "--branch",

                defaultBranch,

                "--single-branch",

                remoteUrl,

                "."
            );


        if
        (
            !cloneResult.Success
        )
        {
            return GitValidationResult.Failure(
                BuildGitFailureMessage(
                    "Unable to download the remote repository.",

                    cloneResult
                )
            );
        }


        return GitValidationResult.SuccessResult();
    }



    //===========================================================
    // Ensure Remote
    //===========================================================

    private async Task<GitValidationResult>
        EnsureRemoteAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl sourceControl
    )
    {
        var remoteResult =
            await ExecuteGitCommandAsync(
                sourceControl.RepositoryPath,

                "remote",

                "get-url",

                "origin"
            );


        if
        (
            remoteResult.Success
        )
        {
            var configuredRemote =
                remoteResult.Output.Trim();


            if
            (
                string.Equals(
                    configuredRemote,
                    sourceControl.GitRemoteUrl.Trim(),
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return GitValidationResult.SuccessResult();
            }


            var updateResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "remote",

                    "set-url",

                    "origin",

                    sourceControl.GitRemoteUrl.Trim()
                );


            if
            (
                !updateResult.Success
            )
            {
                return GitValidationResult.Failure(
                    BuildGitFailureMessage(
                        "Unable to configure the repository remote.",

                        updateResult
                    )
                );
            }


            return GitValidationResult.SuccessResult();
        }


        var addResult =
            await ExecuteGitCommandAsync(
                sourceControl.RepositoryPath,

                "remote",

                "add",

                "origin",

                sourceControl.GitRemoteUrl.Trim()
            );


        if
        (
            !addResult.Success
        )
        {
            return GitValidationResult.Failure(
                BuildGitFailureMessage(
                    "Unable to configure the repository remote.",

                    addResult
                )
            );
        }


        return GitValidationResult.SuccessResult();
    }



    //===========================================================
    // Ensure Current Branch
    //===========================================================

    private async Task<GitValidationResult>
        EnsureCurrentBranchAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl sourceControl
    )
    {
        var branchResult =
            await ExecuteGitCommandAsync(
                sourceControl.RepositoryPath,

                "branch",

                "--show-current"
            );


        if
        (
            !branchResult.Success
        )
        {
            return GitValidationResult.Failure(
                BuildGitFailureMessage(
                    "Unable to determine the current Git branch.",

                    branchResult
                )
            );
        }


        var currentBranch =
            branchResult.Output.Trim();


        if
        (
            string.IsNullOrWhiteSpace(
                currentBranch
            )
        )
        {
            return GitValidationResult.Failure(
                "The repository is in a detached HEAD state. A named branch is required."
            );
        }


        if
        (
            !string.Equals(
                currentBranch,
                sourceControl.DefaultBranch.Trim(),
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return GitValidationResult.Failure(
                $"Current branch '{currentBranch}' does not match configured default branch '{sourceControl.DefaultBranch}'."
            );
        }


        return GitValidationResult.SuccessResult();
    }



    //===========================================================
    // Execute Git Command
    //===========================================================

    private static async Task<GitCommandResult>
        ExecuteGitCommandAsync
    (
        string repositoryPath,

        params string[] arguments
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                repositoryPath
            )
        )
        {
            return GitCommandResult.Failure(
                -1,

                "Repository path is not configured."
            );
        }


        if
        (
            !Directory.Exists(
                repositoryPath
            )
        )
        {
            return GitCommandResult.Failure(
                -1,

                $"Repository path was not found: {repositoryPath}"
            );
        }


        using var process =
            new Process();


        process.StartInfo =
            new ProcessStartInfo
            {
                FileName =
                    "git",

                WorkingDirectory =
                    repositoryPath,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true,

                UseShellExecute =
                    false,

                CreateNoWindow =
                    true
            };


        foreach
        (
            var argument in arguments
        )
        {
            process.StartInfo.ArgumentList.Add(
                argument
            );
        }


        try
        {
            process.Start();


            var standardOutputTask =
                process.StandardOutput
                    .ReadToEndAsync();


            var standardErrorTask =
                process.StandardError
                    .ReadToEndAsync();


            await Task.WhenAll(
                standardOutputTask,

                standardErrorTask
            );


            await process.WaitForExitAsync();


            var output =
                standardOutputTask.Result
                    .Trim();


            var error =
                standardErrorTask.Result
                    .Trim();


            var combinedOutput =
                CombineGitOutput(
                    output,

                    error
                );


            Console.WriteLine(
                $"[GIT] Repository Path : {repositoryPath}"
            );


            Console.WriteLine(
                $"[GIT] Command : git {string.Join(" ", arguments)}"
            );


            Console.WriteLine(
                $"[GIT] Exit Code : {process.ExitCode}"
            );


            if
            (
                !string.IsNullOrWhiteSpace(
                    combinedOutput
                )
            )
            {
                Console.WriteLine(
                    $"[GIT OUTPUT]\n{combinedOutput}"
                );
            }


            return new GitCommandResult
            {
                Success =
                    process.ExitCode == 0,

                ExitCode =
                    process.ExitCode,

                Output =
                    combinedOutput,

                Error =
                    string.IsNullOrWhiteSpace(
                        error
                    )
                    ? combinedOutput
                    : error
            };
        }
        catch
        (
            Exception exception
        )
        {
            return GitCommandResult.Failure(
                -1,

                exception.Message
            );
        }
    }



    //===========================================================
    // Parse Git Status
    //===========================================================

    private static List<string>
        ParseGitStatus
    (
        string output
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                output
            )
        )
        {
            return [];
        }


        return output
            .Replace(
                "\r\n",
                "\n"
            )
            .Replace(
                "\r",
                "\n"
            )
            .Split(
                '\n',
                StringSplitOptions.RemoveEmptyEntries
            )
            .Select(
                x =>
                    x.Trim()
            )
            .ToList();
    }



    //===========================================================
    // Combine Git Output
    //===========================================================

    private static string
        CombineGitOutput
    (
        string output,

        string error
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                output
            )
        )
        {
            return error;
        }


        if
        (
            string.IsNullOrWhiteSpace(
                error
            )
        )
        {
            return output;
        }


        return
            output
            +
            Environment.NewLine
            +
            error;
    }



    //===========================================================
    // Normalize Git Output
    //===========================================================

    private static string
        NormalizeGitOutput
    (
        GitCommandResult result
    )
    {
        return
            result.Output.Trim();
    }



    //===========================================================
    // Build Git Failure Message
    //===========================================================

    private static string
        BuildGitFailureMessage
    (
        string prefix,

        GitCommandResult result
    )
    {
        var details =
            string.IsNullOrWhiteSpace(
                result.Output
            )
            ? result.Error
            : result.Output;


        if
        (
            string.IsNullOrWhiteSpace(
                details
            )
        )
        {
            return prefix;
        }


        return
            $"{prefix}{Environment.NewLine}{details.Trim()}";
    }



    //===========================================================
    // Git Failure
    //===========================================================

    private static GitOperationResultDto
        GitFailure
    (
        string message,

        string details,

        string? output = null
    )
    {
        return new GitOperationResultDto
        {
            Success =
                false,

            Message =
                message,

            Output =
                string.IsNullOrWhiteSpace(
                    output
                )
                ? details
                : output
        };
    }



    //===========================================================
    // Create Activity History
    //===========================================================

    private async Task
        CreateActivityHistoryAsync
    (
        long sourceControlId,

        string activityType,

        string activityTitle,

        string? activityDescription
    )
    {
        const long userId =
            1;


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "SourceControl",

                EntityId =
                    sourceControlId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    activityTitle,

                ActivityDescription =
                    activityDescription,

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context
            .SaveChangesAsync();
    }



    //===========================================================
    // Create Git History
    //===========================================================

    private async Task
        CreateGitHistoryAsync
    (
        long sourceControlId,

        string activityType,

        string activityTitle,

        string? activityDescription,

        string activityResult
    )
    {
        await CreateActivityHistoryAsync(
            sourceControlId,

            activityType,

            activityTitle,

            $"[{activityResult}] {activityDescription}"
        );
    }



    //===========================================================
    // Try Create Git History
    //===========================================================

    private async Task
        TryCreateGitHistoryAsync
    (
        long sourceControlId,

        string activityType,

        string activityTitle,

        string activityDescription,

        string activityResult
    )
    {
        if
        (
            sourceControlId <= 0
        )
        {
            return;
        }


        try
        {
            await CreateGitHistoryAsync(
                sourceControlId,

                activityType,

                activityTitle,

                activityDescription,

                activityResult
            );
        }
        catch
        {
            //===================================================
            // Git operation result must not be replaced by a
            // history persistence failure.
            //===================================================
        }
    }



    //===========================================================
    // Git Validation Result
    //===========================================================

    private sealed class GitValidationResult
    {
        public bool Success
        {
            get;
            private init;
        }


        public string Message
        {
            get;
            private init;
        } =
            string.Empty;


        public static GitValidationResult
            SuccessResult()
        {
            return new GitValidationResult
            {
                Success =
                    true,

                Message =
                    string.Empty
            };
        }


        public static GitValidationResult
            Failure
        (
            string message
        )
        {
            return new GitValidationResult
            {
                Success =
                    false,

                Message =
                    message
            };
        }
    }



    //===========================================================
    // Git Command Result
    //===========================================================

    private sealed class GitCommandResult
    {
        public bool Success
        {
            get;
            init;
        }


        public int ExitCode
        {
            get;
            init;
        }


        public string Output
        {
            get;
            init;
        } =
            string.Empty;


        public string Error
        {
            get;
            init;
        } =
            string.Empty;


        public static GitCommandResult
            Failure
        (
            int exitCode,

            string error
        )
        {
            return new GitCommandResult
            {
                Success =
                    false,

                ExitCode =
                    exitCode,

                Output =
                    string.Empty,

                Error =
                    error
            };
        }
    }
}