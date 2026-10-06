//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup.Department.DTOs;


//===============================================================
// Update Department DTO
//===============================================================

public class UpdateDepartmentDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long DepartmentId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string DepartmentCode
    {
        get;
        set;
    } = string.Empty;


    public string DepartmentName
    {
        get;
        set;
    } = string.Empty;


    public string DepartmentShortName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;
}