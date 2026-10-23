//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Update System Configurations DTO
//
// Module and Code are locked after creation.
//===============================================================

public class UpdateSystemConfigurationsDto
{
    public long SystemConfigurationId { get; set; }

    public long NavigationModuleId { get; set; }

    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    // Optional number / short text (e.g. Max Lines = 20)
    public string Value { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}