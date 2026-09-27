//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.Company.DTOs;


//===============================================================
// Create Company DTO
//===============================================================

public class CreateCompanyDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    public string CompanyCode
    {
        get;
        set;
    } = string.Empty;


    public string CompanyName
    {
        get;
        set;
    } = string.Empty;


    public string CompanyShortName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Address & Contact Information
    //===========================================================

    public string AddressLine1
    {
        get;
        set;
    } = string.Empty;


    public string AddressLine2
    {
        get;
        set;
    } = string.Empty;


    public string Phone
    {
        get;
        set;
    } = string.Empty;


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


    public string Website
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Business Information
    //===========================================================

    public string BINNo
    {
        get;
        set;
    } = string.Empty;


    public string OwnershipType
    {
        get;
        set;
    } = string.Empty;


    public string EconomicActivity
    {
        get;
        set;
    } = string.Empty;


    public string TINNo
    {
        get;
        set;
    } = string.Empty;


    public string TradeLicenseNo
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public string CompanyLogoPath
    {
        get;
        set;
    } = string.Empty;


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