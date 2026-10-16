//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Set System Configuration Enabled DTO
//
// Body of PUT {id}/enabled — the on/off switch on the list page.
//===============================================================

public class SetSystemConfigurationEnabledDto
{
    public bool IsEnabled { get; set; }
}