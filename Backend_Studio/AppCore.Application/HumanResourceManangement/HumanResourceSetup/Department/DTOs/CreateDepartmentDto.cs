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
    // The wing the department belongs to (null : none). Hand-added
    // 2026-11-16 : the technicians of Workshop Configuration are the
    // employees of the departments under the Service Center wing.
    //===========================================================

    public long? WingId
    {
        get;
        set;
    }


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