//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResource.HumanResourceSetup.Department.DTOs;

//===============================================================
// Department DTO
//===============================================================

public class DepartmentDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long Id { get; set; }

    //===========================================================
    // Basic Information
    //===========================================================

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? ShortName { get; set; }

    public string? DepartmentHead { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    //===========================================================
    // Organization Information
    //===========================================================

    public long CompanyId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }

    //===========================================================
    // Status
    //===========================================================

    public bool IsActive { get; set; }
}