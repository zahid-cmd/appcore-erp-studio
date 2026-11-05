//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Setup Repository Interface
//
// Rules broken → InvalidOperationException (400 / 409),
// missing row → KeyNotFoundException (404).
//===============================================================

public interface IEnquirySetupRepository
{
    //===========================================================
    // Read (setupType '' = every list)
    //===========================================================

    Task<List<EnquirySetupDto>> GetAllAsync(
        string? setupType);


    Task<EnquirySetupDto?> GetByIdAsync(
        long id);


    Task<EnquirySetupDefaultsDto> GetDefaultsAsync(
        string setupType);


    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    Task<long> CreateAsync(
        CreateEnquirySetupDto dto,
        long userId);


    Task UpdateAsync(
        UpdateEnquirySetupDto dto,
        long userId);


    Task DeleteAsync(
        long id,
        long userId);


    // The most recently deleted row of the type ('' = any);
    // false when there is none
    Task<bool> RestoreAsync(
        string? setupType,
        long userId);
}
