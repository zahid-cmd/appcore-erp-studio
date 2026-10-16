//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Create System Configurations DTO
//
// ConfigurationCode is accepted for compatibility but is always
// generated on the server.
//===============================================================

public class CreateSystemConfigurationsDto
{
    public long NavigationModuleId { get; set; }

    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    public string Remarks { get; set; } = string.Empty;
}