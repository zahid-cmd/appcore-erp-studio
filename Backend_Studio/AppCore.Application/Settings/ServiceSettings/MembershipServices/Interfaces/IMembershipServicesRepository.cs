//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Membership Services Repository Interface
//
// Configure-only : rows are created, renamed, deleted and restored
// by Membership Cards. No Create / Delete / Restore here.
//===============================================================

public interface IMembershipServicesRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<MembershipServicesDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<MembershipServicesDto>> GetPagedAsync(
        ServiceSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);

    Task<MembershipServicesDto?> GetByIdAsync(
        long id);

    Task<MembershipServicesDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Configure (Service Value, status, remarks)
    //===========================================================

    Task UpdateAsync(
        UpdateMembershipServicesDto dto,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}