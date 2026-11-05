//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Supplier Profiles Repository Interface
//===============================================================

public interface ISupplierProfilesRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<SupplierProfilesDto>> GetAllAsync();


    //===========================================================
    // Get Paged (the list page : one page, server side)
    //===========================================================

    Task<PagedResult<SupplierProfilesDto>> GetPagedAsync(
        SupplierProfilesPageRequest request);


    //===========================================================
    // Public Id (the id the browser uses) -> internal id, or
    // null when there is no live supplier with it
    //===========================================================

    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<SupplierProfilesDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateSupplierProfilesDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateSupplierProfilesDto dto,
        long userId);


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long id,
        long userId);


    //===========================================================
    // Restore
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
    // (next codes, payable sub group, supplier types, brands)
    //===========================================================

    Task<SupplierProfilesDefaultsDto> GetDefaultsAsync();

}