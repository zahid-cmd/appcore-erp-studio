//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards Repository Interface
//===============================================================

public interface IMembershipCardsRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<MembershipCardsDto>> GetAllAsync();

    Task<MembershipCardsDto?> GetByIdAsync(
        long id);

    Task<MembershipCardsDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateMembershipCardsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateMembershipCardsDto dto,
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