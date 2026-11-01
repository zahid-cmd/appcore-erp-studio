//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.PostingSetup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Posting Setup Repository Interface
//
// The purposes are fixed (made by SQL); only the ledger of a
// purpose can change, with a reason, by a user who has the
// Update activity on the Posting Setup page.
//===============================================================

public interface IPostingSetupRepository
{
    Task<PostingSetupWorkspaceDto> GetWorkspaceAsync(
        long userId);

    Task<PostingSetupRowDto> UpdateAsync(
        string purposeCode,
        UpdatePostingSetupDto dto,
        long userId,
        string userName);

    Task<List<PostingSetupHistoryDto>> GetHistoryAsync(
        string? purposeCode);
}
