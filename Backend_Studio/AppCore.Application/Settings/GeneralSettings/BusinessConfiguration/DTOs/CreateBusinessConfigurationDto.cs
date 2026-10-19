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

    public DateOnly? ValidFrom { get; set; }

    public DateOnly? ValidUntil { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}