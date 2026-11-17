//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup.Department.DTOs;


//===============================================================
// A wing a department can belong to (the Wing dropdown of the
// Department page)
//===============================================================

public class DepartmentWingDto
{
    public long WingId { get; set; }

    public string WingCode { get; set; } = string.Empty;

    public string WingName { get; set; } = string.Empty;
}
