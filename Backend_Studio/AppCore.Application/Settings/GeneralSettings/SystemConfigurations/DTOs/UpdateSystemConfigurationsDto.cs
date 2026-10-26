//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Update System Configurations DTO (admin only)
//
// Module and Code are locked after creation. ON / OFF and Value
// change here too, with Reason when the switch is critical.
//===============================================================

public class UpdateSystemConfigurationsDto
    : CreateSystemConfigurationsDto
{
    public long SystemConfigurationId { get; set; }

    // Required when a critical switch's ON / OFF or Value changes
    public string Reason { get; set; } = string.Empty;
}