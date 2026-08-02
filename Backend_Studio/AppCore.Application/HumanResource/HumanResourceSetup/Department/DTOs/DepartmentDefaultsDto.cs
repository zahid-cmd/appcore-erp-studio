//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResource.HumanResourceSetup.Department.DTOs;

//===============================================================
// Department Defaults DTO
//===============================================================

public class DepartmentDefaultsDto
{
    //===========================================================
    // Default Values
    //===========================================================

    public string Code { get; set; } = string.Empty;

    public long CompanyId { get; set; }

    public bool IsActive { get; set; } = true;
}