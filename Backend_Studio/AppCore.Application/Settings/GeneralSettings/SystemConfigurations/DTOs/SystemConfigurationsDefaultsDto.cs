//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// System Configurations Defaults DTO
//
// Suggested values for a new setting in a module.
//===============================================================

public class SystemConfigurationsDefaultsDto
{
    public long NavigationModuleId { get; set; }

    public string ModuleName { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;
}