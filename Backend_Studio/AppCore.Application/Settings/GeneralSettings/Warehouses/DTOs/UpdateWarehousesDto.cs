//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.Warehouses.DTOs;


//===============================================================
// Update Warehouses DTO
//===============================================================

public class UpdateWarehousesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long WarehouseId
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
    // Branch
    //===========================================================

    public long BranchId
    {
        get;
        set;
    }


    //===========================================================
    // Warehouse Information
    //===========================================================

    public string WarehouseCode
    {
        get;
        set;
    } = string.Empty;


    public string WarehouseName
    {
        get;
        set;
    } = string.Empty;


    public string DisplayName
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

    public bool IsBranchGenerated
    {
        get;
        set;
    } = false;


    public bool IsDefault
    {
        get;
        set;
    } = false;


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