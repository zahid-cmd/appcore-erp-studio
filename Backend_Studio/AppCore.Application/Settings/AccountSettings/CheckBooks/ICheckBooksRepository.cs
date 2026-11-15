//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CheckBooks;


//===============================================================
// Check Books repository (hand-written page)
//===============================================================

public interface ICheckBooksRepository
{
    Task<List<CheckBookListItemDto>> GetListAsync();

    Task<CheckBookDto> GetAsync(Guid publicId);

    Task<CheckBookDefaultsDto> GetDefaultsAsync();

    // The unused leaves of one bank account (for the vouchers)
    Task<AvailableCheckLeavesDto> GetAvailableLeavesAsync(long bankAccountId, int take);

    Task<CheckBookDto> CreateAsync(SaveCheckBookDto dto, long userId);

    Task UpdateAsync(Guid publicId, SaveCheckBookDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted book back; false = none
    Task<bool> RestoreAsync(long userId);

    // Unused -> Cancelled / Lost (with a reason)
    Task MarkLeafAsync(Guid publicId, long leafId, CheckBookLeafActionDto dto, long userId);

    // Cancelled / Lost -> Unused
    Task UndoLeafAsync(Guid publicId, long leafId, long userId);

    // Cheque print layouts of the bank accounts (unknown ids are
    // left out; IsSaved = false when none is saved yet)
    Task<List<CheckPrintLayoutDto>> GetPrintLayoutsAsync(IReadOnlyCollection<long> bankAccountIds);

    // Saves (or replaces) the layout of one bank account
    Task<CheckPrintLayoutDto> SavePrintLayoutAsync(long bankAccountId, SaveCheckPrintLayoutDto dto, long userId);
}
