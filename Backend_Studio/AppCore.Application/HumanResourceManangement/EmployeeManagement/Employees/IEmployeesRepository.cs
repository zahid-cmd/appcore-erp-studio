//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employees repository (hand-written page)
//===============================================================

public interface IEmployeesRepository
{
    Task<List<EmployeeListItemDto>> GetListAsync();

    Task<EmployeeDto> GetAsync(Guid publicId);

    // Next code and the form's lists (branches, departments,
    // designations, shifts, logins, salary structures)
    Task<EmployeeDefaultsDto> GetDefaultsAsync();

    Task<EmployeeDto> CreateAsync(EmployeeDto dto, long userId);

    Task UpdateAsync(Guid publicId, EmployeeDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted employee back : the code; null = none
    Task<string?> RestoreAsync(long userId);
}
