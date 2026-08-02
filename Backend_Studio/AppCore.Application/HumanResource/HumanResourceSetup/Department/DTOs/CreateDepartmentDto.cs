//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResource.HumanResourceSetup.Department.DTOs;

//===============================================================
// Create Department DTO
//===============================================================

public class CreateDepartmentDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    public string Name { get; set; } = string.Empty;

    public string? ShortName { get; set; }

    public string? DepartmentHead { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    //===========================================================
    // Organization Information
    //===========================================================

    public long CompanyId { get; set; }

    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }

    //===========================================================
    // Status
    //===========================================================

    public bool IsActive { get; set; } = true;
}