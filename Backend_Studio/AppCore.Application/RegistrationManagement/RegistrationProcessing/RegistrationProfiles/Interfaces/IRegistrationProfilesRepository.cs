//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Registration Profiles repository (hand-written page, NO Code
// Synchronization). Profiles are made by the Sales Invoice - MB
// on posting; this page lists them (the Registration Collection /
// stage pages come later).
//===============================================================

public interface IRegistrationProfilesRepository
{
    // branchId 0 = all branches
    Task<RegistrationProfilesListDto> GetListAsync(
        long branchId);
}
