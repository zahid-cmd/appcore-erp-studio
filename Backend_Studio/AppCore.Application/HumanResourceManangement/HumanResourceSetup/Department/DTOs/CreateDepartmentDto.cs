//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup.Department.DTOs;


//===============================================================
// Create Department DTO
//===============================================================

public class CreateDepartmentDto
{
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