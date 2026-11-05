//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Customer Profiles Repository Interface
//===============================================================

public interface ICustomerProfilesRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<CustomerProfilesDto>> GetAllAsync();


    //===========================================================
    // Get Paged (the list page : one page, server side)
    //===========================================================

    Task<PagedResult<CustomerProfilesDto>> GetPagedAsync(
        CustomerProfilesPageRequest request);


    //===========================================================
    // Public Id (the id the browser uses) -> internal id, or
    // null when there is no live customer with it
    //===========================================================

    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<CustomerProfilesDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateCustomerProfilesDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateCustomerProfilesDto dto,
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
    // (next codes, receivable sub group, locations)
    //===========================================================

    Task<CustomerProfilesDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Photo : store a new path, returns the old one ('' if none)
    //===========================================================

    Task<string> SetPhotoPathAsync(
        long id,
        string photoPath,
        long userId);
}