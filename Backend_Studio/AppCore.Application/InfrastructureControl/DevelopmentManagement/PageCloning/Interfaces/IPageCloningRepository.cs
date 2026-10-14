//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning Repository Interface
//===============================================================

public interface IPageCloningRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<PageCloningDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<PageCloningDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreatePageCloningDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdatePageCloningDto dto,
        long userId);


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long id,
        long userId);


    //===========================================================
    // Restore Deleted Record
    //===========================================================

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<PageCloningDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Analyze Source Page (reads files, writes nothing)
    //===========================================================

    EntityAnalysisDto Analyze(
        string name);


    //===========================================================
    // Preview From The Wizard Plan (no saved record, writes nothing)
    //===========================================================

    Task<PageCloningPreviewDto> PreviewPlanAsync(
        ClonePlanDto plan);


    //===========================================================
    // Save From The Wizard Plan (writes the files, then creates
    // or updates the Page Cloning record)
    //===========================================================

    Task<PageCloningResultDto> SavePlanAsync(
        ClonePlanDto plan,
        bool overwriteEdited,
        long userId);


    //===========================================================
    // Preview Clone (saved record, writes nothing)
    //===========================================================

    Task<PageCloningPreviewDto> PreviewAsync(
        long id);


    //===========================================================
    // Apply Clone (writes the files)
    //===========================================================

    Task<PageCloningResultDto> ApplyAsync(
        long id,
        bool overwriteEdited,
        long userId);


    //===========================================================
    // Restore Code To Baseline
    //===========================================================

    Task<PageCloningResultDto> RestoreToBaselineAsync(
        long id,
        long userId);
}