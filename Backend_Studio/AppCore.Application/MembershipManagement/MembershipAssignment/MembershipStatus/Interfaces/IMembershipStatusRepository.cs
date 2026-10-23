//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status Repository Interface
//===============================================================

public interface IMembershipStatusRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<MembershipStatusDto>> GetAllAsync();

    Task<MembershipStatusDto?> GetByIdAsync(
        long id);

    Task<MembershipStatusDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateMembershipStatusDto dto,
        long userId);

    Task UpdateAsync(
        UpdateMembershipStatusDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Free Service Windows (manual until job cards exist)
    //===========================================================

    Task UseWindowAsync(
        long membershipId,
        long windowId,
        UseMembershipServiceDto dto,
        long userId);

    Task UndoUseWindowAsync(
        long membershipId,
        long windowId,
        long userId);

    Task ApproveWindowAsync(
        long membershipId,
        long windowId,
        ApproveMembershipServiceDto dto,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}