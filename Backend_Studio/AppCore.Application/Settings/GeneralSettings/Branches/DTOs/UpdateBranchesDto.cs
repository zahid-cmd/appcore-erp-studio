//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.Branches.DTOs;


//===============================================================
// Update Branches DTO
//===============================================================

public class UpdateBranchesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long BranchId
    {
        get;
        set;
    }


    //===========================================================
    // Company
    //===========================================================

    public long CompanyId
    {
        get;
        set;
    }


    //===========================================================
    // Wing
    //===========================================================

    public long WingId
    {
        get;
        set;
    }


    //===========================================================
    // Branch Information
    //===========================================================

    public string BranchCode
    {
        get;
        set;
    } = string.Empty;


    public string ShortName
    {
        get;
        set;
    } = string.Empty;


    public string BranchName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Contact Information
    //===========================================================

    public string Mobile
    {
        get;
        set;
    } = string.Empty;


    public string Email
    {
        get;
        set;
    } = string.Empty;


    public string Address
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