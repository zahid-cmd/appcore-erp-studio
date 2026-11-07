//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Create Business Configuration DTO (grant an extra line)
//
// Fixed     : ValidUntil must be empty (ValidFrom optional)
// Temporary : ValidUntil required, not before ValidFrom
//===============================================================

public class CreateBusinessConfigurationDto
{
    public long BranchId { get; set; }

    public string BusinessLine { get; set; } = string.Empty;

    public string AccessType { get; set; } = string.Empty;

    // Full / Gifts Only (Accessories grants only : a showroom may
    // hold and transfer Accessories stock to give with bikes,
    // never sell it over the counter)
    public string Scope { get; set; } = "Full";

    public DateOnly? ValidFrom { get; set; }

    public DateOnly? ValidUntil { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}