//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.HumanResource.HumanResourceSetup.Department.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Contracts.Persistence.HumanResource.HumanResourceSetup;

//===============================================================
// Department Repository Interface
//===============================================================

public interface IDepartmentRepository
{
    Task<DepartmentDefaultsDto> GetDefaultsAsync();

    Task<List<DepartmentDto>> GetAllAsync();

    Task<DepartmentDto?> GetByIdAsync(long id);

    Task<long> CreateAsync(CreateDepartmentDto dto);

    Task<bool> UpdateAsync(UpdateDepartmentDto dto);

    Task<bool> DeleteAsync(long id);

    Task<bool> ExistsByNameAsync(string name, long? excludeId = null);
}