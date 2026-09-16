//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// ISourceControlRepository
//===============================================================

public interface ISourceControlRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl
    >>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl?
    >
        GetByIdAsync
    (
        long sourceControlId
    );



    //===========================================================
    // Create
    //===========================================================

    Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl entity
    );



    //===========================================================
    // Delete
    //===========================================================

    Task
        DeleteAsync
    (
        long sourceControlId
    );



    //===========================================================
    // Restore
    //===========================================================

    Task
        RestoreAsync();



    //===========================================================
    // Get History
    //===========================================================

    Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync();



    //===========================================================
    // Get Entity History
    //===========================================================

    Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
    (
        long sourceControlId
    );



    //===========================================================
    // Git Status
    //===========================================================

    Task<GitStatusDto>
        GetStatusAsync
    (
        long sourceControlId
    );



    //===========================================================
    // Git Pull
    //===========================================================

    Task<GitOperationResultDto>
        PullAsync
    (
        long sourceControlId
    );



    //===========================================================
    // Git Commit
    //===========================================================

    Task<GitOperationResultDto>
        CommitAsync
    (
        long sourceControlId,
        GitCommitDto dto
    );



    //===========================================================
    // Git Push
    //===========================================================

    Task<GitOperationResultDto>
        PushAsync
    (
        long sourceControlId
    );



    //===========================================================
    // Git Synchronization
    //===========================================================

    Task<GitOperationResultDto>
        SyncAsync
    (
        long sourceControlId,
        GitCommitDto dto
    );

}