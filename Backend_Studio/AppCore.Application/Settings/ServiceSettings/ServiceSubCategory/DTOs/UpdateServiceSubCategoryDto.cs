//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Update Service Sub Category DTO
//===============================================================

public class UpdateServiceSubCategoryDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information (Category and Type are locked)
    //===========================================================

    // Preview only : the server builds <Category Code>-sss
    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    public long ServiceCategoryId
    {
        get;
        set;
    }


    public string SubCategoryType
    {
        get;
        set;
    } = string.Empty;


    // Brand Services : built by the server as "<Brand> <Type>"
    public string SubCategoryName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Income Account Sub Group (preview only; built by the server)
    //===========================================================

    public string IncomeSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeSubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool ItemCreationAllowed
    {
        get;
        set;
    } = true;


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