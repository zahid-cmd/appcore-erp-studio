//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// System Configuration Workspace DTO
//
// Everything the System Configurations page needs, already
// filtered for the logged-in user on the server :
//
//   CanManage : "Manage Configurations" on the System
//               Configurations page (= admin)
//   Modules   : every active Navigation Module (left panel)
//   Menus /
//   Submenus  : names for the page headers (and the admin form)
//   Switches  : only the switches this user may see / change
//   Recent    : last changes of those switches
//===============================================================

public class SystemConfigurationWorkspaceDto
{
    public bool CanManage { get; set; }

    public int PendingCount { get; set; }

    public List<ConfigurationModuleDto> Modules { get; set; } = new();

    public List<ConfigurationMenuDto> Menus { get; set; } = new();

    public List<ConfigurationSubmenuDto> Submenus { get; set; } = new();

    public List<SystemConfigurationsDto> Switches { get; set; } = new();

    public List<ConfigurationRecentChangeDto> Recent { get; set; } = new();
}


//===============================================================
// Module (left panel)
//===============================================================

public class ConfigurationModuleDto
{
    public long NavigationModuleId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Icon { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}


//===============================================================
// Menu
//===============================================================

public class ConfigurationMenuDto
{
    public long NavigationModuleId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}


//===============================================================
// Submenu (a page)
//===============================================================

public class ConfigurationSubmenuDto
{
    public long NavigationModuleId { get; set; }

    public string MenuCode { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}


//===============================================================
// Recent change
//===============================================================

public class ConfigurationRecentChangeDto
{
    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string PerformedByName { get; set; } = string.Empty;

    public DateTime PerformedDate { get; set; }
}