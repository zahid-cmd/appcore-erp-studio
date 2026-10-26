//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Set System Configuration Enabled DTO
//
// Body of PUT {id}/enabled. Goes through the same rules as
// Apply (permission, parent, critical reason / approval).
//===============================================================

public class SetSystemConfigurationEnabledDto
{
    public bool IsEnabled { get; set; }

    public string Reason { get; set; } = string.Empty;
}