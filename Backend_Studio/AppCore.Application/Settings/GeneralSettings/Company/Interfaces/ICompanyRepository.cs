//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.Company;


//===============================================================
// ICompanyRepository
//===============================================================

public interface ICompanyRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Settings.GeneralSettings.Company>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Settings.GeneralSettings.Company?> GetByIdAsync(
        long id
    );


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        global::AppCore.Domain.Settings.GeneralSettings.Company entity
    );


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        global::AppCore.Domain.Settings.GeneralSettings.Company entity
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