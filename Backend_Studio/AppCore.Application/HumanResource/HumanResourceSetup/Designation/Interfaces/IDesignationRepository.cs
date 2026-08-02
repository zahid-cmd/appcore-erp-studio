//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.HumanResource.HumanResourceSetup.Designation.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResource.HumanResourceSetup.Designation.Interfaces;

//===============================================================
// Designation Repository Interface
//===============================================================

public interface IDesignationRepository
{
    Task<DesignationDefaultsDto> GetDefaultsAsync();

    Task<List<DesignationDto>> GetAllAsync();

    Task<DesignationDto?> GetByIdAsync(long id);

    Task<long> CreateAsync(CreateDesignationDto dto);

    Task<bool> UpdateAsync(UpdateDesignationDto dto);

    Task<bool> DeleteAsync(long id);

    Task<bool> ExistsByNameAsync(string name, long? excludeId = null);
}