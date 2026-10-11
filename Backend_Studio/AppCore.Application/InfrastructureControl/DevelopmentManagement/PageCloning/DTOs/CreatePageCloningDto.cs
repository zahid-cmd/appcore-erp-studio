//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;


//===============================================================
// Create Page Cloning DTO
//===============================================================

public class CreatePageCloningDto
{
    //===========================================================
    // Clone From (Source Submenu)
    //===========================================================

    public long CloneFromId
    {
        get;
        set;
    }


    public string CloneFromCode
    {
        get;
        set;
    } = string.Empty;


    public string CloneFromName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Clone To (Target Submenu)
    //===========================================================

    public long CloneToId
    {
        get;
        set;
    }


    public string CloneToCode
    {
        get;
        set;
    } = string.Empty;


    public string CloneToName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Blueprint
    //===========================================================

    public string EntityName
    {
        get;
        set;
    } = string.Empty;


    public string BlueprintJson
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