//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning Repository Interface
//===============================================================

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

public interface IPageCloningRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<IEnumerable<PageCloning>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<PageCloning?> GetByIdAsync
    (
        long id
    );


    //===========================================================
    // Get History
    //===========================================================

    Task<IEnumerable<PageCloning>> GetHistoryAsync();


    //===========================================================
    // Analyze Source
    //===========================================================

    Task<PageCloningSourceAnalysisDto> AnalyzeSourceAsync
    (
        long submenuId
    );


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync
    (
        PageCloning pageCloning
    );


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync
    (
        PageCloning pageCloning
    );


    //===========================================================
    // Clone
    //===========================================================

    Task CloneAsync
    (
        long id
    );


    //===========================================================
    // Generate Package
    //===========================================================

    Task GeneratePackageAsync
    (
        long id
    );


    //===========================================================
    // Restore Package
    //===========================================================

    Task RestorePackageAsync
    (
        long id
    );


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync
    (
        long id
    );


    //===========================================================
    // Restore
    //===========================================================

    Task RestoreAsync();
}