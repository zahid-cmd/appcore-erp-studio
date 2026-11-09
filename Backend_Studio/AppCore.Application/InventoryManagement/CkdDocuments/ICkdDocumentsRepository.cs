//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.CkdDocuments;


//===============================================================
// CKD Documents Status Repository Interface
//
// Rules broken -> InvalidOperationException (400), missing row ->
// KeyNotFoundException (404).
//===============================================================

public interface ICkdDocumentsRepository
{
    // Every bike on record (posted purchases, receivings, opening
    // stock) + opening customer files without a bike record
    Task<CkdDocumentsPageDto> GetAllAsync();

    // A bike (MotorBikeUnits)
    Task SetUnitStatusAsync(long motorBikeUnitId, SetCkdStatusDto dto, long userId, string userName);

    // An opening customer file without a bike record
    Task SetFileStatusAsync(Guid customerFilePublicId, SetCkdStatusDto dto, long userId, string userName);
}
