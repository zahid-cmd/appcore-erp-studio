//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Create Service Category DTO
//===============================================================

public class CreateServiceCategoryDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    // Preview only : the server builds SV-nnn
    public string CategoryCode
    {
        get;
        set;
    } = string.Empty;


    // Brand Services : built by the server as "<Brand> Services"
    public string CategoryName
    {
        get;
        set;
    } = string.Empty;


    // Brand Services / Dealer Services
    public string CategoryType
    {
        get;
        set;
    } = string.Empty;


    // Brand Services only
    public long? BrandManagementId
    {
        get;
        set;
    }


    //===========================================================
    // Income Account Group (preview only, built by the server)
    //===========================================================

    public string IncomeGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool SubCategoryCreationAllowed
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