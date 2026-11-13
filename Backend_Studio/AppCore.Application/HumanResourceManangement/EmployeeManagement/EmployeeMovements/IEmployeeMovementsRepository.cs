//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employee Movements repository (hand-written page)
//===============================================================

public interface IEmployeeMovementsRepository
{
    Task<List<EmployeeMovementDto>> GetListAsync();

    Task<EmployeeMovementDto> GetAsync(Guid publicId);

    Task<EmployeeMovementDefaultsDto> GetDefaultsAsync();

    // The employee as now (a new movement starts from it)
    Task<MovementEmployeeStateDto> GetEmployeeStateAsync(long employeeId);

    // Saves the movement and changes the employee
    Task<EmployeeMovementDto> CreateAsync(EmployeeMovementDto dto, long userId);

    // The employee's latest movement only : the employee goes back
    // to what was before it
    Task DeleteAsync(Guid publicId, long userId);
}
