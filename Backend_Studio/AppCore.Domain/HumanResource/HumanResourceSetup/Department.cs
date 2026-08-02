//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResource.HumanResourceSetup;

//===============================================================
// Department
//===============================================================

public class Department : CodeMasterEntity
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
}