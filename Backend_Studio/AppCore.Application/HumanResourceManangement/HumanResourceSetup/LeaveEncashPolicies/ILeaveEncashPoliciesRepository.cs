//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Leave Encashment Policies Repository
//===============================================================

public interface ILeaveEncashPoliciesRepository
{
    Task<List<LeaveEncashPolicyDto>> GetListAsync();

    Task<LeaveEncashPolicyDto> GetAsync(Guid publicId);

    Task<LeaveEncashPolicyDefaultsDto> GetDefaultsAsync();

    Task<LeaveEncashPolicyDto> CreateAsync(LeaveEncashPolicyDto dto, long userId);

    Task UpdateAsync(Guid publicId, LeaveEncashPolicyDto dto, long userId);

    // Refused when an Employee Profile names it
    Task DeleteAsync(Guid publicId, long userId);

    // The code of the policy brought back (null : none)
    Task<string?> RestoreAsync(long userId);
}
