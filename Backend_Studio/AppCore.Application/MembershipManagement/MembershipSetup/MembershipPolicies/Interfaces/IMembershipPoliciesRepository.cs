//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards Repository Interface
//===============================================================

public interface IMembershipPoliciesRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<MembershipPoliciesDto>> GetAllAsync();

    Task<MembershipPoliciesDto?> GetByIdAsync(
        long id);

    Task<MembershipPoliciesDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateMembershipPoliciesDto dto,
        long userId);

    Task UpdateAsync(
        UpdateMembershipPoliciesDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}