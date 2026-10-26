//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Create System Configurations DTO (admin only)
//
// ConfigurationCode is accepted for compatibility but is always
// generated on the server.
//
// ScopeType :
//   Module  : NavigationMenuCode / NavigationSubmenuCode empty
//   Menu    : NavigationMenuCode of a menu in the module
//   Submenu : NavigationSubmenuCode of a page in the module
//             (its menu code is filled in by the server)
//===============================================================

public class CreateSystemConfigurationsDto
{
    public long NavigationModuleId { get; set; }

    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public string ScopeType { get; set; } = "Submenu";

    public string? NavigationMenuCode { get; set; }

    public string? NavigationSubmenuCode { get; set; }

    public string OnDescription { get; set; } = string.Empty;

    public string OffDescription { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    // Optional number / short text (e.g. Max Lines = 20)
    public string Value { get; set; } = string.Empty;

    // None / Number / Text
    public string ValueType { get; set; } = "None";

    public string ValueUnit { get; set; } = string.Empty;

    public int? ValueMin { get; set; }

    public int? ValueMax { get; set; }

    public string ValueEmptyText { get; set; } = string.Empty;

    public bool DefaultEnabled { get; set; }

    public string DefaultValue { get; set; } = string.Empty;

    public string? ParentConfigurationCode { get; set; }

    public bool IsCritical { get; set; }

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;
}