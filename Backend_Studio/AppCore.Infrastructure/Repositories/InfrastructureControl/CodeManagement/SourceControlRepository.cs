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


            //=======================================================
            // Current Branch
            //=======================================================

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


            //=======================================================
            // Last Commit Hash
            //=======================================================

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


            //=======================================================
            // Last Commit Message
            //=======================================================

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


            //=======================================================
            // Last Commit Date
            //=======================================================

            var commitDateResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "log",

                    "-1",

                    "--format=%cI"
                );


            if
            (
                commitDateResult.Success
            )
            {
                result.LastCommitDate =
                    commitDateResult.Output.Trim();
            }


            //=======================================================
            // Git Status
            //
            // --short gives machine-readable status.
            //
            // --ignore-submodules=all prevents Master_ERP and any
            // other submodule working-tree changes from appearing
            // in AppCore Repository Health.
            //
            // The pathspec excludes Master_ERP completely.
            //=======================================================

            var statusResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "status",

                    "--short",

                    "--ignore-submodules=all",

                    "--",

                    ".",

                    ":(exclude)Master_ERP"
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


            //=======================================================
            // Parse Git Status
            //=======================================================

            result.ModifiedFiles =
                ParseGitStatus(
                    statusResult.Output
                );


            //=======================================================
            // Working Tree State
            //=======================================================

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


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Pull Blocked",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                mergeStateResult.IsInProgress
            )
            {
                var message =
                    "Pull was blocked because a Git merge is currently in progress. "
                    +
                    "Resolve the conflicts, then use Continue Merge, or use Abort Merge.";


                return GitFailure(
                    "Pull Blocked",

                    message,

                    mergeStateResult.Output
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


            var workingTreeResult =
                await GetWorkingTreeStatusAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !workingTreeResult.Success
            )
            {
                return GitFailure(
                    "Pull Failed",

                    workingTreeResult.Message,

                    workingTreeResult.Output
                );
            }


            if
            (
                workingTreeResult.HasChanges
            )
            {
                var message =
                    "Pull was stopped because this repository has local changes. "
                    +
                    "Commit or synchronize the local changes before pulling remote changes.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PULL",

                    "Pull Blocked",

                    message,

                    "BLOCKED"
                );


                return GitFailure(
                    "Pull Blocked",

                    message,

                    workingTreeResult.Output
                );
            }


            var fetchResult =
                await FetchOriginAsync(
                    sourceControl
                );


            if
            (
                !fetchResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to fetch the latest remote changes.",

                        fetchResult
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

                    fetchResult.Output
                );
            }


            var pullResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "-c",

                    "submodule.recurse=false",

                    "merge",

                    "--ff-only",

                    $"origin/{sourceControl.DefaultBranch}"
                );


            if
            (
                !pullResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Pull could not be completed as a fast-forward update. "
                        +
                        "The local branch may have diverged from the remote. "
                        +
                        "Use Full Synchronization to integrate local and remote work.",

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
                CombineGitOutput(
                    fetchResult,

                    pullResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "PULL",

                "Pull Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "Latest remote changes were applied successfully."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Latest repository changes were pulled successfully.",

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

                    "-A",

                    "--",

                    ".",

                    ":(exclude)Master_ERP"
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


            //===================================================
            // Check whether AppCore-managed files were staged.
            //
            // Master_ERP is intentionally excluded from staging.
            // Therefore changes that exist only inside that
            // submodule must never make the commit fail.
            //===================================================

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
                var message =
                    "No AppCore repository changes were found to commit. "
                    +
                    "Master_ERP is excluded from AppCore Git operations.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "COMMIT",

                    "Commit Completed",

                    message,

                    "SUCCESS"
                );


                return new GitOperationResultDto
                {
                    Success =
                        true,

                    Message =
                        message,

                    Output =
                        message
                };
            }


            if
            (
                stagedResult.ExitCode != 1
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to determine staged repository changes.",

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


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Push Blocked",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                mergeStateResult.IsInProgress
            )
            {
                var message =
                    "Push was blocked because a Git merge is currently in progress. "
                    +
                    "Resolve the conflicts and complete the merge before pushing.";


                return GitFailure(
                    "Push Blocked",

                    message,

                    mergeStateResult.Output
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
                return GitFailure(
                    "Push Failed",

                    branchResult.Message
                );
            }


            var workingTreeResult =
                await GetWorkingTreeStatusAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !workingTreeResult.Success
            )
            {
                return GitFailure(
                    "Push Failed",

                    workingTreeResult.Message,

                    workingTreeResult.Output
                );
            }


            if
            (
                workingTreeResult.HasChanges
            )
            {
                var message =
                    "Push was stopped because the working tree contains uncommitted changes. "
                    +
                    "Commit the local changes before pushing.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Blocked",

                    message,

                    "BLOCKED"
                );


                return GitFailure(
                    "Push Blocked",

                    message,

                    workingTreeResult.Output
                );
            }


            var fetchResult =
                await FetchOriginAsync(
                    sourceControl
                );


            if
            (
                !fetchResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to fetch the latest remote changes before push.",

                        fetchResult
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

                    fetchResult.Output
                );
            }


            var aheadBehindResult =
                await GetAheadBehindAsync(
                    sourceControl.RepositoryPath,

                    sourceControl.DefaultBranch
                );


            if
            (
                !aheadBehindResult.Success
            )
            {
                return GitFailure(
                    "Push Failed",

                    aheadBehindResult.Message,

                    aheadBehindResult.Output
                );
            }


            if
            (
                aheadBehindResult.Behind > 0
            )
            {
                var message =
                    "Push was blocked because the remote repository contains "
                    +
                    $"{aheadBehindResult.Behind} commit(s) not present on this machine. "
                    +
                    "Synchronize with the remote repository before pushing.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Blocked",

                    message,

                    "BLOCKED"
                );


                return GitFailure(
                    "Push Blocked",

                    message,

                    aheadBehindResult.Output
                );
            }


            if
            (
                aheadBehindResult.Ahead == 0
            )
            {
                var message =
                    "There are no local commits to publish.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "PUSH",

                    "Push Completed",

                    message,

                    "SUCCESS"
                );


                return new GitOperationResultDto
                {
                    Success =
                        true,

                    Message =
                        message,

                    Output =
                        message
                };
            }


            var pushResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "-c",

                    "submodule.recurse=false",

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
                CombineGitOutput(
                    fetchResult,

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
                    "Repository changes were published successfully.",

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


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Synchronization Blocked",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                mergeStateResult.IsInProgress
            )
            {
                var message =
                    "Synchronization was blocked because a Git merge is currently in progress. "
                    +
                    "Resolve the conflicts and use Continue Merge, or use Abort Merge.";


                return GitFailure(
                    "Synchronization Blocked",

                    message,

                    mergeStateResult.Output
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


            //=======================================================
            // Fetch first.
            //
            // The remote is always inspected before local work is
            // committed or integrated.
            //=======================================================

            var initialFetchResult =
                await FetchOriginAsync(
                    sourceControl
                );


            if
            (
                !initialFetchResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Synchronization fetch phase failed.",

                        initialFetchResult
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

                    initialFetchResult.Output
                );
            }


            //=======================================================
            // Commit local AppCore changes before integrating remote
            // changes. This preserves the local work as a Git commit
            // before another machine's commits are merged.
            //=======================================================

            var workingTreeResult =
                await GetWorkingTreeStatusAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !workingTreeResult.Success
            )
            {
                return GitFailure(
                    "Synchronization Failed",

                    workingTreeResult.Message,

                    workingTreeResult.Output
                );
            }


            GitOperationResultDto commitResult;


            if
            (
                workingTreeResult.HasChanges
            )
            {
                commitResult =
                    await CommitAsync(
                        sourceControlId,

                        dto
                    );


                if
                (
                    !commitResult.Success
                )
                {
                    return GitFailure(
                        "Synchronization Failed",

                        "Local changes could not be committed. "
                        +
                        commitResult.Message,

                        commitResult.Output
                    );
                }
            }
            else
            {
                commitResult =
                    new GitOperationResultDto
                    {
                        Success =
                            true,

                        Message =
                            "No local AppCore changes required a commit.",

                        Output =
                            "Working tree is clean."
                    };
            }


            //=======================================================
            // Fetch again because another machine may have pushed
            // while this machine was committing local work.
            //=======================================================

            var finalFetchResult =
                await FetchOriginAsync(
                    sourceControl
                );


            if
            (
                !finalFetchResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Synchronization could not refresh the remote state.",

                        finalFetchResult
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

                    finalFetchResult.Output
                );
            }


            var aheadBehindResult =
                await GetAheadBehindAsync(
                    sourceControl.RepositoryPath,

                    sourceControl.DefaultBranch
                );


            if
            (
                !aheadBehindResult.Success
            )
            {
                return GitFailure(
                    "Synchronization Failed",

                    aheadBehindResult.Message,

                    aheadBehindResult.Output
                );
            }


            //=======================================================
            // Integrate remote commits.
            //
            // 0 / 0 = synchronized.
            // Ahead only = local commits can be pushed.
            // Behind only = fast-forward to remote.
            // Ahead + behind = merge remote into local.
            //=======================================================

            GitCommandResult? mergeResult =
                null;


            if
            (
                aheadBehindResult.Behind > 0
            )
            {
                mergeResult =
                    await ExecuteGitCommandAsync(
                        sourceControl.RepositoryPath,

                        "-c",

                        "submodule.recurse=false",

                        "merge",

                        "--no-edit",

                        $"origin/{sourceControl.DefaultBranch}"
                    );


                if
                (
                    !mergeResult.Success
                )
                {
                    var message =
                        BuildGitFailureMessage(
                            "Synchronization stopped because remote changes could not be integrated. "
                            +
                            "Resolve the Git conflicts, complete the merge, then run Synchronization again.",

                            mergeResult
                        );


                    await CreateGitHistoryAsync(
                        sourceControlId,

                        "SYNC",

                        "Synchronization Conflict",

                        message,

                        "CONFLICT"
                    );


                    return GitFailure(
                        "Synchronization Conflict",

                        message,

                        mergeResult.Output
                    );
                }
            }


            //=======================================================
            // Recalculate the relationship after integration.
            // This prevents a remote update during synchronization
            // from being missed.
            //=======================================================

            var finalAheadBehindResult =
                await GetAheadBehindAsync(
                    sourceControl.RepositoryPath,

                    sourceControl.DefaultBranch
                );


            if
            (
                !finalAheadBehindResult.Success
            )
            {
                return GitFailure(
                    "Synchronization Failed",

                    finalAheadBehindResult.Message,

                    finalAheadBehindResult.Output
                );
            }


            //=======================================================
            // If remote moved again while synchronization was
            // running, do not push. The next synchronization must
            // integrate the newer remote commit.
            //=======================================================

            if
            (
                finalAheadBehindResult.Behind > 0
            )
            {
                var message =
                    "Synchronization stopped because the remote repository "
                    +
                    "received newer commits while synchronization was running. "
                    +
                    "Run Synchronization again to integrate the latest remote changes.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Blocked",

                    message,

                    "BLOCKED"
                );


                return GitFailure(
                    "Synchronization Blocked",

                    message,

                    finalAheadBehindResult.Output
                );
            }


            if
            (
                finalAheadBehindResult.Ahead == 0
            )
            {
                var output =
                    CombineGitOutput(
                        initialFetchResult,

                        commitResult.Output is null
                            ? GitCommandResult.Failure(
                                0,
                                string.Empty
                            )
                            : GitCommandResult.Failure(
                                0,
                                commitResult.Output
                            ),

                        finalFetchResult,

                        mergeResult
                    );


                var message =
                    "Full repository synchronization completed successfully. "
                    +
                    "The local repository is synchronized with the remote repository.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Completed",

                    string.IsNullOrWhiteSpace(
                        output
                    )
                    ? message
                    : output,

                    "SUCCESS"
                );


                return new GitOperationResultDto
                {
                    Success =
                        true,

                    Message =
                        message,

                    Output =
                        output
                };
            }


            //=======================================================
            // Push only after local work has been committed and the
            // remote branch has been fully integrated.
            //=======================================================

            var pushResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "-c",

                    "submodule.recurse=false",

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


            var outputAfterPush =
                CombineGitOutput(
                    initialFetchResult,

                    finalFetchResult,

                    mergeResult,

                    pushResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "SYNC",

                "Synchronization Completed",

                string.IsNullOrWhiteSpace(
                    outputAfterPush
                )
                ? "Local work was committed, remote work was integrated, and the synchronized repository was pushed successfully."
                : outputAfterPush,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Full repository synchronization completed successfully.",

                Output =
                    outputAfterPush
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
    // Reset To Remote
    //===========================================================

    public async Task<GitOperationResultDto>
        ResetToRemoteAsync
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
                    "Reset to Remote Failed",

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
                return GitFailure(
                    "Reset to Remote Failed",

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
                    "Reset to Remote Failed",

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
                    "Reset to Remote Failed",

                    branchResult.Message
                );
            }


            var fetchResult =
                await FetchOriginAsync(
                    sourceControl
                );


            if
            (
                !fetchResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to fetch the latest remote repository state.",

                        fetchResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "RESET",

                    "Reset to Remote Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Reset to Remote Failed",

                    message,

                    fetchResult.Output
                );
            }


            var resetResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "-c",

                    "submodule.recurse=false",

                    "reset",

                    "--hard",

                    $"origin/{sourceControl.DefaultBranch}"
                );


            if
            (
                !resetResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to reset the local repository to the remote branch.",

                        resetResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "RESET",

                    "Reset to Remote Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Reset to Remote Failed",

                    message,

                    resetResult.Output
                );
            }


            //=======================================================
            // Remove untracked files and directories from the parent
            // repository. Master_ERP remains excluded because it is
            // intentionally outside AppCore parent-repository
            // operations.
            //=======================================================

            var cleanResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "clean",

                    "-fd",

                    "--",

                    ".",

                    ":(exclude)Master_ERP"
                );


            if
            (
                !cleanResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Repository reset completed, but untracked AppCore files could not be cleaned.",

                        cleanResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "RESET",

                    "Reset to Remote Completed With Warning",

                    message,

                    "WARNING"
                );


                return new GitOperationResultDto
                {
                    Success =
                        false,

                    Message =
                        message,

                    Output =
                        CombineGitOutput(
                            fetchResult,

                            resetResult,

                            cleanResult
                        )
                };
            }


            var output =
                CombineGitOutput(
                    fetchResult,

                    resetResult,

                    cleanResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "RESET",

                "Reset to Remote Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "Local repository was reset to the remote branch."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Local repository was reset to the remote repository successfully.",

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

                "RESET",

                "Reset to Remote Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Reset to Remote Failed",

                exception.Message
            );
        }
    }
    //===========================================================
    // Get Merge Conflicts
    //===========================================================

    public async Task<GitOperationResultDto>
        GetMergeConflictsAsync
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
                    "Merge Conflict Check Failed",

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
                return GitFailure(
                    "Merge Conflict Check Failed",

                    validation.Message
                );
            }


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Merge Conflict Check Failed",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                !mergeStateResult.IsInProgress
            )
            {
                return new GitOperationResultDto
                {
                    Success =
                        true,

                    Message =
                        "No Git merge is currently in progress.",

                    Output =
                        string.Empty
                };
            }


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    mergeStateResult.HasConflicts
                        ? "Git merge is in progress and unresolved conflicts remain."
                        : "Git merge is in progress and no unresolved conflicts were detected.",

                Output =
                    mergeStateResult.Output
            };
        }
        catch
        (
            Exception exception
        )
        {
            return GitFailure(
                "Merge Conflict Check Failed",

                exception.Message
            );
        }
    }



    //===========================================================
    // Resolve Merge Conflict
    //
    // resolution:
    //   LOCAL  = keep the current/local branch version
    //   REMOTE = keep the incoming/remote branch version
    //
    // This method is intentionally file-specific. It is designed
    // for both text and binary conflicts, including image files.
    // Master_ERP is never allowed to be resolved through the
    // AppCore parent-repository Git operations.
    //===========================================================

    public async Task<GitOperationResultDto>
        ResolveMergeConflictAsync
    (
        long sourceControlId,

        string filePath,

        string resolution
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
                    "Resolve Merge Conflict Failed",

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
                return GitFailure(
                    "Resolve Merge Conflict Failed",

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
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    branchResult.Message
                );
            }


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                !mergeStateResult.IsInProgress
            )
            {
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    "There is no Git merge currently in progress."
                );
            }


            if
            (
                !TryNormalizeMergeConflictPath(
                    sourceControl.RepositoryPath,

                    filePath,

                    out var normalizedPath,

                    out var pathError
                )
            )
            {
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    pathError
                );
            }


            var normalizedResolution =
                (resolution ?? string.Empty)
                    .Trim()
                    .ToUpperInvariant();


            string gitSide;


            if
            (
                normalizedResolution ==
                "LOCAL"
                ||
                normalizedResolution ==
                "OURS"
            )
            {
                gitSide =
                    "ours";
            }
            else if
            (
                normalizedResolution ==
                "REMOTE"
                ||
                normalizedResolution ==
                "THEIRS"
            )
            {
                gitSide =
                    "theirs";
            }
            else
            {
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    "Resolution must be LOCAL or REMOTE."
                );
            }


            //=======================================================
            // Confirm that the requested file is actually unresolved.
            //=======================================================

            var unresolvedResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "ls-files",

                    "-u",

                    "--",

                    normalizedPath
                );


            if
            (
                !unresolvedResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to determine whether the selected file has an unresolved merge conflict.",

                        unresolvedResult
                    );


                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    message,

                    unresolvedResult.Output
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    unresolvedResult.Output
                )
            )
            {
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    $"The selected file is not currently an unresolved merge conflict: {normalizedPath}"
                );
            }


            //=======================================================
            // Select the requested side.
            //
            // --ours   = current/local branch version
            // --theirs = incoming/remote branch version
            //
            // The command is safe for binary files because Git copies
            // the selected blob directly into the working tree.
            //=======================================================

            var checkoutResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "checkout",

                    $"--{gitSide}",

                    "--",

                    normalizedPath
                );


            if
            (
                !checkoutResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        $"Unable to keep the {normalizedResolution} version of the selected conflict file.",

                        checkoutResult
                    );


                await TryCreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Conflict Resolution Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    message,

                    checkoutResult.Output
                );
            }


            //=======================================================
            // Stage only the resolved file.
            //
            // Do not stage unrelated working-tree changes and do not
            // touch Master_ERP.
            //=======================================================

            var addResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "add",

                    "--",

                    normalizedPath
                );


            if
            (
                !addResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "The selected conflict was resolved in the working tree, but Git could not stage the resolved file.",

                        addResult
                    );


                await TryCreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Conflict Resolution Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    message,

                    addResult.Output
                );
            }


            //=======================================================
            // Recheck the merge state after staging.
            //=======================================================

            var remainingConflictResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !remainingConflictResult.Success
            )
            {
                return GitFailure(
                    "Resolve Merge Conflict Failed",

                    remainingConflictResult.Message,

                    remainingConflictResult.Output
                );
            }


            var remainingOutput =
                remainingConflictResult.Output?.Trim()
                ??
                string.Empty;


            var resolvedMessage =
                normalizedResolution == "LOCAL"
                ||
                normalizedResolution == "OURS"
                    ? "local"
                    : "remote";


            var activityDescription =
                string.IsNullOrWhiteSpace(
                    remainingOutput
                )
                ? $"Merge conflict '{normalizedPath}' was resolved using the {resolvedMessage} version. No unresolved merge conflicts remain."
                : $"Merge conflict '{normalizedPath}' was resolved using the {resolvedMessage} version. Remaining unresolved conflicts: {remainingOutput}";


            await CreateGitHistoryAsync(
                sourceControlId,

                "MERGE",

                "Merge Conflict Resolved",

                activityDescription,

                "SUCCESS"
            );


            var output =
                CombineGitOutput(
                    checkoutResult,

                    addResult
                );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    string.IsNullOrWhiteSpace(
                        remainingOutput
                    )
                    ? $"Merge conflict resolved successfully using the {resolvedMessage} version. You can now continue the merge."
                    : $"Merge conflict resolved successfully using the {resolvedMessage} version. Resolve the remaining conflict(s) before continuing the merge.",

                Output =
                    string.IsNullOrWhiteSpace(
                        output
                    )
                    ? remainingOutput
                    : string.IsNullOrWhiteSpace(
                        remainingOutput
                    )
                        ? output
                        : $"{output}{Environment.NewLine}{Environment.NewLine}Remaining conflicts:{Environment.NewLine}{remainingOutput}"
            };
        }
        catch
        (
            Exception exception
        )
        {
            await TryCreateGitHistoryAsync(
                sourceControlId,

                "MERGE",

                "Merge Conflict Resolution Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Resolve Merge Conflict Failed",

                exception.Message
            );
        }
    }



    //===========================================================
    // Continue Merge
    //===========================================================

    public async Task<GitOperationResultDto>
        ContinueMergeAsync
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
                    "Continue Merge Failed",

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
                return GitFailure(
                    "Continue Merge Failed",

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
                return GitFailure(
                    "Continue Merge Failed",

                    branchResult.Message
                );
            }


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Continue Merge Failed",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                !mergeStateResult.IsInProgress
            )
            {
                return GitFailure(
                    "Continue Merge Failed",

                    "There is no Git merge currently in progress."
                );
            }


            if
            (
                mergeStateResult.HasConflicts
            )
            {
                var message =
                    "The Git merge still contains unresolved conflicts. "
                    +
                    "Resolve every conflict before continuing the merge.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Continue Blocked",

                    message,

                    "BLOCKED"
                );


                return GitFailure(
                    "Continue Merge Blocked",

                    message,

                    mergeStateResult.Output
                );
            }


            var addResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "add",

                    "-A",

                    "--",

                    ".",

                    ":(exclude)Master_ERP"
                );


            if
            (
                !addResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to stage the resolved merge changes.",

                        addResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Continue Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Continue Merge Failed",

                    message,

                    addResult.Output
                );
            }


            var remainingConflictResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !remainingConflictResult.Success
            )
            {
                return GitFailure(
                    "Continue Merge Failed",

                    remainingConflictResult.Message,

                    remainingConflictResult.Output
                );
            }


            if
            (
                remainingConflictResult.HasConflicts
            )
            {
                var message =
                    "The Git merge still contains unresolved conflicts after staging. "
                    +
                    "Resolve every conflict before continuing the merge.";


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Continue Blocked",

                    message,

                    "BLOCKED"
                );


                return GitFailure(
                    "Continue Merge Blocked",

                    message,

                    remainingConflictResult.Output
                );
            }


            var commitResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "commit",

                    "--no-edit"
                );


            if
            (
                !commitResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to complete the Git merge commit.",

                        commitResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Continue Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Continue Merge Failed",

                    message,

                    commitResult.Output
                );
            }


            var mergeOutput =
                CombineGitOutput(
                    addResult,

                    commitResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "MERGE",

                "Merge Completed",

                string.IsNullOrWhiteSpace(
                    mergeOutput
                )
                ? "The resolved Git merge was completed successfully."
                : mergeOutput,

                "SUCCESS"
            );


            //=======================================================
            // Continue the synchronization after the merge.
            //
            // PushAsync performs the final safety checks:
            // - blocks an unfinished merge,
            // - requires a clean working tree,
            // - fetches the latest remote state,
            // - blocks when the remote is ahead,
            // - never force-pushes.
            //=======================================================

            var pushResult =
                await PushAsync(
                    sourceControlId
                );


            if
            (
                !pushResult.Success
            )
            {
                var message =
                    "The Git merge was completed, but the synchronized result "
                    +
                    "could not be pushed to the remote repository. "
                    +
                    "Review the Push result and synchronize again if required.";


                await TryCreateGitHistoryAsync(
                    sourceControlId,

                    "SYNC",

                    "Synchronization Push Failed",

                    message
                    +
                    Environment.NewLine
                    +
                    pushResult.Message,

                    "FAILED"
                );


                return GitFailure(
                    "Synchronization Push Failed",

                    message
                    +
                    Environment.NewLine
                    +
                    pushResult.Message,

                    pushResult.Output
                );
            }


            var output =
                CombineGitOutput(
                    addResult,

                    commitResult,

                    GitCommandResult.Failure(
                        0,

                        pushResult.Output ??
                        string.Empty
                    )
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "SYNC",

                "Synchronization Completed",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "The resolved Git merge was completed and the synchronized repository was pushed successfully."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "The resolved Git merge was completed and the synchronized repository was pushed successfully.",

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

                "MERGE",

                "Merge Continue Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Continue Merge Failed",

                exception.Message
            );
        }
    }



    //===========================================================
    // Abort Merge
    //===========================================================

    public async Task<GitOperationResultDto>
        AbortMergeAsync
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
                    "Abort Merge Failed",

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
                return GitFailure(
                    "Abort Merge Failed",

                    validation.Message
                );
            }


            var mergeStateResult =
                await GetMergeStateAsync(
                    sourceControl.RepositoryPath
                );


            if
            (
                !mergeStateResult.Success
            )
            {
                return GitFailure(
                    "Abort Merge Failed",

                    mergeStateResult.Message,

                    mergeStateResult.Output
                );
            }


            if
            (
                !mergeStateResult.IsInProgress
            )
            {
                return GitFailure(
                    "Abort Merge Failed",

                    "There is no Git merge currently in progress."
                );
            }


            var abortResult =
                await ExecuteGitCommandAsync(
                    sourceControl.RepositoryPath,

                    "merge",

                    "--abort"
                );


            if
            (
                !abortResult.Success
            )
            {
                var message =
                    BuildGitFailureMessage(
                        "Unable to abort the Git merge.",

                        abortResult
                    );


                await CreateGitHistoryAsync(
                    sourceControlId,

                    "MERGE",

                    "Merge Abort Failed",

                    message,

                    "FAILED"
                );


                return GitFailure(
                    "Abort Merge Failed",

                    message,

                    abortResult.Output
                );
            }


            var output =
                NormalizeGitOutput(
                    abortResult
                );


            await CreateGitHistoryAsync(
                sourceControlId,

                "MERGE",

                "Merge Aborted",

                string.IsNullOrWhiteSpace(
                    output
                )
                ? "The Git merge was aborted and the repository was returned to its pre-merge state."
                : output,

                "SUCCESS"
            );


            return new GitOperationResultDto
            {
                Success =
                    true,

                Message =
                    "Git merge was aborted successfully.",

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

                "MERGE",

                "Merge Abort Failed",

                exception.Message,

                "FAILED"
            );


            return GitFailure(
                "Abort Merge Failed",

                exception.Message
            );
        }
    }



    //===========================================================
    // Fetch Origin
    //===========================================================

    private static async Task<GitCommandResult>
        FetchOriginAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl sourceControl
    )
    {
        return await ExecuteGitCommandAsync(
            sourceControl.RepositoryPath,

            "-c",

            "submodule.recurse=false",

            "fetch",

            "origin",

            sourceControl.DefaultBranch
        );
    }



    //===========================================================
    // Get Merge State
    //===========================================================

    private static async Task<MergeStateResult>
        GetMergeStateAsync
    (
        string repositoryPath
    )
    {
        var mergeHeadResult =
            await ExecuteGitCommandAsync(
                repositoryPath,

                "rev-parse",

                "-q",

                "--verify",

                "MERGE_HEAD"
            );


        if
        (
            mergeHeadResult.Success
        )
        {
            var conflictResult =
                await ExecuteGitCommandAsync(
                    repositoryPath,

                    "diff",

                    "--name-only",

                    "--diff-filter=U",

                    "--",

                    ".",

                    ":(exclude)Master_ERP"
                );


            if
            (
                !conflictResult.Success
            )
            {
                return MergeStateResult.Failure(
                    "Unable to determine the current Git merge conflict state.",

                    conflictResult.Output
                );
            }


            return MergeStateResult.SuccessResult(
                true,

                !string.IsNullOrWhiteSpace(
                    conflictResult.Output
                ),

                conflictResult.Output
            );
        }


        if
        (
            mergeHeadResult.ExitCode != 128
            &&
            mergeHeadResult.ExitCode != 1
        )
        {
            return MergeStateResult.Failure(
                "Unable to determine whether a Git merge is currently in progress.",

                NormalizeGitOutput(
                    mergeHeadResult
                )
            );
        }


        return MergeStateResult.SuccessResult(
            false,

            false,

            string.Empty
        );
    }



    //===========================================================
    // Get Working Tree Status
    //===========================================================

    private static async Task<WorkingTreeStatusResult>
        GetWorkingTreeStatusAsync
    (
        string repositoryPath
    )
    {
        var statusResult =
            await ExecuteGitCommandAsync(
                repositoryPath,

                "status",

                "--short",

                "--ignore-submodules=all",

                "--",

                ".",

                ":(exclude)Master_ERP"
            );


        if
        (
            !statusResult.Success
        )
        {
            return WorkingTreeStatusResult.Failure(
                "Unable to determine the local repository working-tree state.",

                statusResult.Output
            );
        }


        return WorkingTreeStatusResult.SuccessResult(
            !string.IsNullOrWhiteSpace(
                statusResult.Output
            ),

            statusResult.Output
        );
    }



    //===========================================================
    // Get Ahead / Behind
    //===========================================================

    private static async Task<AheadBehindResult>
        GetAheadBehindAsync
    (
        string repositoryPath,

        string defaultBranch
    )
    {
        var result =
            await ExecuteGitCommandAsync(
                repositoryPath,

                "rev-list",

                "--left-right",

                "--count",

                $"HEAD...origin/{defaultBranch}"
            );


        if
        (
            !result.Success
        )
        {
            return AheadBehindResult.Failure(
                "Unable to determine the local and remote repository relationship.",

                result.Output
            );
        }


        var values =
            result.Output
                .Trim()
                .Split(
                    new[]
                    {
                        ' ',
                        '\t'
                    },
                    StringSplitOptions.RemoveEmptyEntries
                );


        if
        (
            values.Length < 2
            ||
            !int.TryParse(
                values[0],
                out var ahead
            )
            ||
            !int.TryParse(
                values[1],
                out var behind
            )
        )
        {
            return AheadBehindResult.Failure(
                "Unable to parse the local and remote repository relationship.",

                result.Output
            );
        }


        return AheadBehindResult.SuccessResult(
            ahead,

            behind,

            result.Output
        );
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
    // Normalize Merge Conflict Path
    //
    // Only repository-relative files are accepted. This prevents
    // arbitrary filesystem paths from being passed to Git.
    //===========================================================

    private static bool
        TryNormalizeMergeConflictPath
    (
        string repositoryPath,

        string filePath,

        out string normalizedPath,

        out string errorMessage
    )
    {
        normalizedPath =
            string.Empty;

        errorMessage =
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                repositoryPath
            )
        )
        {
            errorMessage =
                "Repository path is not configured.";

            return false;
        }


        if
        (
            string.IsNullOrWhiteSpace(
                filePath
            )
        )
        {
            errorMessage =
                "A merge conflict file path is required.";

            return false;
        }


        var candidate =
            filePath
                .Trim()
                .Trim('"')
                .Replace(
                    '\\',
                    '/'
                );


        while
        (
            candidate.StartsWith(
                "./",
                StringComparison.Ordinal
            )
        )
        {
            candidate =
                candidate[2..];
        }


        if
        (
            string.IsNullOrWhiteSpace(
                candidate
            )
        )
        {
            errorMessage =
                "The merge conflict file path is empty.";

            return false;
        }


        if
        (
            Path.IsPathRooted(
                candidate
            )
            ||
            candidate.StartsWith(
                "/",
                StringComparison.Ordinal
            )
            ||
            candidate.Contains(
                ":",
                StringComparison.Ordinal
            )
        )
        {
            errorMessage =
                "Only repository-relative merge conflict paths are allowed.";

            return false;
        }


        var segments =
            candidate.Split(
                '/',
                StringSplitOptions.RemoveEmptyEntries
            );


        if
        (
            segments.Any(
                x =>
                    x == ".."
            )
        )
        {
            errorMessage =
                "Parent-directory traversal is not allowed in a merge conflict path.";

            return false;
        }


        if
        (
            segments.Any(
                x =>
                    x == "."
            )
        )
        {
            errorMessage =
                "Invalid repository-relative merge conflict path.";

            return false;
        }


        if
        (
            segments.Length == 0
        )
        {
            errorMessage =
                "The merge conflict file path is invalid.";

            return false;
        }


        if
        (
            string.Equals(
                segments[0],
                "Master_ERP",
                OperatingSystem.IsWindows()
                    ? StringComparison.OrdinalIgnoreCase
                    : StringComparison.Ordinal
            )
        )
        {
            errorMessage =
                "Master_ERP is excluded from AppCore parent-repository merge operations.";

            return false;
        }


        var relativePath =
            string.Join(
                "/",
                segments
            );


        var repositoryFullPath =
            Path.GetFullPath(
                repositoryPath
            );


        var fileFullPath =
            Path.GetFullPath(
                Path.Combine(
                    repositoryFullPath,

                    relativePath.Replace(
                        '/',
                        Path.DirectorySeparatorChar
                    )
                )
            );


        var repositoryPrefix =
            repositoryFullPath.TrimEnd(
                Path.DirectorySeparatorChar,

                Path.AltDirectorySeparatorChar
            )
            +
            Path.DirectorySeparatorChar;


        var comparison =
            OperatingSystem.IsWindows()
                ? StringComparison.OrdinalIgnoreCase
                : StringComparison.Ordinal;


        if
        (
            !fileFullPath.StartsWith(
                repositoryPrefix,
                comparison
            )
        )
        {
            errorMessage =
                "The merge conflict path is outside the configured repository.";

            return false;
        }


        normalizedPath =
            relativePath;


        return true;
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
    // Merge State Result
    //===========================================================

    private sealed class MergeStateResult
    {
        public bool Success
        {
            get;

            private init;
        }


        public bool IsInProgress
        {
            get;

            private init;
        }


        public bool HasConflicts
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


        public string Output
        {
            get;

            private init;
        } =
            string.Empty;


        public static MergeStateResult
            SuccessResult
        (
            bool isInProgress,

            bool hasConflicts,

            string output
        )
        {
            return new MergeStateResult
            {
                Success =
                    true,

                IsInProgress =
                    isInProgress,

                HasConflicts =
                    hasConflicts,

                Message =
                    string.Empty,

                Output =
                    output
            };
        }


        public static MergeStateResult
            Failure
        (
            string message,

            string output
        )
        {
            return new MergeStateResult
            {
                Success =
                    false,

                IsInProgress =
                    false,

                HasConflicts =
                    false,

                Message =
                    message,

                Output =
                    output
            };
        }
    }



    //===========================================================
    // Working Tree Status Result
    //===========================================================

    private sealed class WorkingTreeStatusResult
    {
        public bool Success
        {
            get;

            private init;
        }


        public bool HasChanges
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


        public string Output
        {
            get;

            private init;
        } =
            string.Empty;


        public static WorkingTreeStatusResult
            SuccessResult
        (
            bool hasChanges,

            string output
        )
        {
            return new WorkingTreeStatusResult
            {
                Success =
                    true,

                HasChanges =
                    hasChanges,

                Message =
                    string.Empty,

                Output =
                    output
            };
        }


        public static WorkingTreeStatusResult
            Failure
        (
            string message,

            string output
        )
        {
            return new WorkingTreeStatusResult
            {
                Success =
                    false,

                HasChanges =
                    false,

                Message =
                    message,

                Output =
                    output
            };
        }
    }



    //===========================================================
    // Ahead / Behind Result
    //===========================================================

    private sealed class AheadBehindResult
    {
        public bool Success
        {
            get;

            private init;
        }


        public int Ahead
        {
            get;

            private init;
        }


        public int Behind
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


        public string Output
        {
            get;

            private init;
        } =
            string.Empty;


        public static AheadBehindResult
            SuccessResult
        (
            int ahead,

            int behind,

            string output
        )
        {
            return new AheadBehindResult
            {
                Success =
                    true,

                Ahead =
                    ahead,

                Behind =
                    behind,

                Message =
                    string.Empty,

                Output =
                    output
            };
        }


        public static AheadBehindResult
            Failure
        (
            string message,

            string output
        )
        {
            return new AheadBehindResult
            {
                Success =
                    false,

                Ahead =
                    0,

                Behind =
                    0,

                Message =
                    message,

                Output =
                    output
            };
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
