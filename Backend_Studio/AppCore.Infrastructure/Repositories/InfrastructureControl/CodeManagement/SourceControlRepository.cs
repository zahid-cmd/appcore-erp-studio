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
                "Source Control repository not found."
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


        await _context
            .SaveChangesAsync();


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
            throw new InvalidOperationException(
                "Source Control repository not found."
            );
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


        await _context
            .SaveChangesAsync();


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
        return await _context
            .ActivityHistories
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
        return await _context
            .ActivityHistories
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
            new GitStatusDto();


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
                result.IsClean =
                    false;

                result.ModifiedFiles =
                [
                    "Source Control repository was not found."
                ];

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
                result.IsClean =
                    false;

                result.ModifiedFiles =
                [
                    validation.Message
                ];

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
                branchResult.Success
            )
            {
                result.Branch =
                    branchResult.Output.Trim();
            }


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


            //===================================================
            // Git status
            //
            // --short gives machine-readable status.
            // --ignore-submodules=none is important because
            // submodule working-tree changes must be visible.
            //===================================================

            var statusResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "status",

                    "--short",

                    "--ignore-submodules=none"
                );


            if
            (
                !statusResult.Success
            )
            {
                result.IsClean =
                    false;

                result.ModifiedFiles =
                [
                    statusResult.Error
                ];

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
                    "Pull Failed",

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


            var addResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "add",

                    "."
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


            var commitResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "commit",

                    "-m",

                    dto.Message.Trim()
                );


            if
            (
                !commitResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Commit failed.",

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
                    : string.Empty;


            var output =
                NormalizeGitOutput(
                    commitResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "COMMIT",

                "Commit Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? dto.Message.Trim()
                : output,

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


            var remoteResult =
                await EnsureRemoteAsync(
                    sourceControl
                );


            if
            (
                !remoteResult.Success
            )
            {
                return GitFailure(
                    "Synchronization Failed",

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
                return GitFailure(
                    "Synchronization Failed",

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
                        "Synchronization pull phase failed.",

                        pullResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Synchronization Failed",

                    message,

                    pullResult.Output
                );
            }


            var addResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "add",

                    "."
                );


            if
            (
                !addResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Synchronization staging phase failed.",

                        addResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Synchronization Failed",

                    message,

                    addResult.Output
                );
            }


            var commitResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "commit",

                    "-m",

                    dto.Message.Trim()
                );


            if
            (
                !commitResult.Success
            )
            {
                var normalizedCommitOutput =
                    NormalizeGitOutput(
                        commitResult
                    );


                //===================================================
                // "nothing to commit" is not an operational failure.
                // Continue to push the existing local commits.
                //===================================================

                var nothingToCommit =
                    normalizedCommitOutput
                        .Contains(
                            "nothing to commit",
                            StringComparison.OrdinalIgnoreCase
                        );


                if
                (
                    !nothingToCommit
                )
                {
                    var message =
                        BuildGitFailureMessage(
                            "Synchronization commit phase failed.",

                            commitResult
                        );


                    await CreateGitHistoryAsync(
                        sourceControlId,

                        "SYNC",

                        "Synchronization Failed",

                        message,

                        "FAILED"
                    );


                    return GitFailure(
                        "Synchronization Failed",

                        message,

                        commitResult.Output
                    );
                }
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
                        "Synchronization push phase failed.",

                        pushResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Synchronization Failed",

                    message,

                    pushResult.Output
                );
            }


            var output =
                CombineGitOutput(
                    pullResult,

                    commitResult,

                    pushResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "SYNC",

                "Synchronization Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "Pull, commit, and push completed successfully."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Full repository synchronization completed successfully.",

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
            !Directory.Exists(
                sourceControl.RepositoryPath
            )
        )
        {
            return GitValidationResult.Failure(
                $"Repository path was not found: {sourceControl.RepositoryPath}"
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
            string.Equals(
                currentBranch,

                sourceControl.DefaultBranch.Trim(),

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return GitValidationResult.SuccessResult();
        }


        var checkoutResult =
            await ExecuteGitCommandAsync(
                sourceControl.RepositoryPath,

                "checkout",

                sourceControl.DefaultBranch.Trim()
            );


        if
        (
            !checkoutResult.Success
        )
        {
            return GitValidationResult.Failure(
                BuildGitFailureMessage(
                    $"Unable to switch to branch '{sourceControl.DefaultBranch}'.",

                    checkoutResult
                )
            );
        }


        return GitValidationResult.SuccessResult();
    }



    //===========================================================
    // Parse Git Status
    //===========================================================
    //
    // Git short status:
    //
    //   XY path
    //
    // Normal file:
    //   M  file       -> staged modification
    //    M file       -> working-tree modification
    //   D  file       -> staged deletion
    //    D file       -> working-tree deletion
    //   ?? file      -> untracked
    //
    // Submodule:
    //   M  module     -> submodule commit differs in index
    //    M module     -> submodule commit differs in worktree
    //    m module     -> submodule contains modified content
    //    ? module     -> submodule contains untracked content
    //
    // We prefix the result so the existing frontend can classify
    // each status without changing the GitStatusDto contract.
    //
    //===========================================================

    private static List<string>
        ParseGitStatus
    (
        string output
    )
    {
        var statuses =
            new List<string>();


        if
        (
            string.IsNullOrWhiteSpace(
                output
            )
        )
        {
            return statuses;
        }


        var lines =
            output
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
                );


        foreach
        (
            var rawLine in lines
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    rawLine
                )
            )
            {
                continue;
            }


            var line =
                rawLine.TrimEnd();


            if
            (
                line.Length < 3
            )
            {
                statuses.Add(
                    "[MODIFIED] "
                    +
                    line.Trim()
                );

                continue;
            }


            var indexStatus =
                line[0];


            var workTreeStatus =
                line[1];


            var path =
                line.Length > 3
                    ? line[3..].Trim()
                    : string.Empty;


            if
            (
                path.Contains(
                    " -> ",
                    StringComparison.Ordinal
                )
            )
            {
                path =
                    path
                        .Split(
                            " -> ",
                            StringSplitOptions.None
                        )
                        .Last()
                        .Trim();
            }


            //=======================================================
            // Untracked entry
            //=======================================================

            if
            (
                indexStatus == '?'
                &&
                workTreeStatus == '?'
            )
            {
                statuses.Add(
                    "[UNTRACKED] "
                    +
                    path
                );

                continue;
            }


            //=======================================================
            // Git submodule status
            //
            // A submodule is identified by Git's lowercase
            // work-tree status markers m / ?.
            //=======================================================

            if
            (
                workTreeStatus == 'm'
                ||
                workTreeStatus == '?'
                ||
                indexStatus == 'm'
                ||
                indexStatus == '?'
            )
            {
                statuses.Add(
                    "[SUBMODULE] "
                    +
                    path
                );

                continue;
            }


            //=======================================================
            // Deleted
            //=======================================================

            if
            (
                indexStatus == 'D'
                ||
                workTreeStatus == 'D'
            )
            {
                statuses.Add(
                    "[DELETED] "
                    +
                    path
                );

                continue;
            }


            //=======================================================
            // Modified
            //=======================================================

            if
            (
                indexStatus == 'M'
                ||
                workTreeStatus == 'M'
                ||
                indexStatus == 'A'
                ||
                workTreeStatus == 'A'
                ||
                indexStatus == 'R'
                ||
                workTreeStatus == 'R'
            )
            {
                statuses.Add(
                    "[MODIFIED] "
                    +
                    path
                );

                continue;
            }


            //=======================================================
            // Fallback
            //=======================================================

            statuses.Add(
                "[MODIFIED] "
                +
                (
                    string.IsNullOrWhiteSpace(
                        path
                    )
                    ? line.Trim()
                    : path
                )
            );
        }


        return statuses;
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
        try
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


            var process =
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
                process.StartInfo
                    .ArgumentList
                    .Add(
                        argument
                    );
            }


            Console.WriteLine(
                $"[GIT] Repository Path : {repositoryPath}"
            );


            Console.WriteLine(
                $"[GIT] Command : git {string.Join(" ", arguments)}"
            );


            process.Start();


            var outputTask =
                process
                    .StandardOutput
                    .ReadToEndAsync();


            var errorTask =
                process
                    .StandardError
                    .ReadToEndAsync();


            await process
                .WaitForExitAsync();


            var output =
                await outputTask;


            var error =
                await errorTask;


            Console.WriteLine(
                $"[GIT] Exit Code : {process.ExitCode}"
            );


            if
            (
                !string.IsNullOrWhiteSpace(
                    output
                )
            )
            {
                Console.WriteLine(
                    $"[GIT OUTPUT]\n{output}"
                );
            }


            if
            (
                !string.IsNullOrWhiteSpace(
                    error
                )
            )
            {
                Console.WriteLine(
                    $"[GIT ERROR]\n{error}"
                );
            }


            return new GitCommandResult
            {
                Success =
                    process.ExitCode == 0,

                ExitCode =
                    process.ExitCode,

                Output =
                    output.Trim(),

                Error =
                    error.Trim()
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
    // Normalize Git Output
    //===========================================================

    private static string
        NormalizeGitOutput
    (
        GitCommandResult result
    )
    {
        var output =
            result.Output?.Trim()
            ??
            string.Empty;


        var error =
            result.Error?.Trim()
            ??
            string.Empty;


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
    // Combine Git Output
    //===========================================================

    private static string
        CombineGitOutput
    (
        params GitCommandResult[] results
    )
    {
        return string.Join(
            Environment.NewLine,

            results
                .Select(
                    NormalizeGitOutput
                )
                .Where(
                    x =>
                        !string.IsNullOrWhiteSpace(
                            x
                        )
                )
        );
    }



    //===========================================================
    // Build Git Failure Message
    //===========================================================

    private static string
        BuildGitFailureMessage
    (
        string fallback,

        GitCommandResult result
    )
    {
        var output =
            NormalizeGitOutput(
                result
            );


        if
        (
            string.IsNullOrWhiteSpace(
                output
            )
        )
        {
            return fallback;
        }


        return
            fallback
            +
            Environment.NewLine
            +
            output;
    }



    //===========================================================
    // Git Failure
    //===========================================================

    private static GitOperationResultDto
        GitFailure
    (
        string message,

        string detail,

        string? output = null
    )
    {
        return new GitOperationResultDto
        {
            Success =
                false,

            Message =
                detail,

            Output =
                output
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

        string activityDescription,

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
