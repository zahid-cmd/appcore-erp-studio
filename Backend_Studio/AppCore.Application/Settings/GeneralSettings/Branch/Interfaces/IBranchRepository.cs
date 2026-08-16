//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.Branch;


//===============================================================
// IBranchRepository
//===============================================================

public interface IBranchRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Settings.GeneralSettings.Branch>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Settings.GeneralSettings.Branch?> GetByIdAsync(
        long id
    );


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        global::AppCore.Domain.Settings.GeneralSettings.Branch entity
    );


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        global::AppCore.Domain.Settings.GeneralSettings.Branch entity
    );


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long id
    );


    //===========================================================
    // Restore
    //===========================================================

    Task RestoreAsync();


    //===========================================================
    // Get History
    //===========================================================

    Task<IReadOnlyList<object>> GetHistoryAsync();


    //===========================================================
    // Get Entity History
    //===========================================================

    Task<IReadOnlyList<object>> GetEntityHistoryAsync(
        long id
    );
}