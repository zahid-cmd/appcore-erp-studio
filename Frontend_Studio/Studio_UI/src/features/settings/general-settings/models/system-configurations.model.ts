//===============================================================
// System Configuration
//
// A switchable setting that belongs to one Navigation Module.
// The modules (and so the panels on the page) come from the
// Navigation Modules table — no module, no panel.
//
// ConfigurationCode is system generated per module:
//   CFG-<ModuleCode>-0001
//
// ModuleCode / ModuleName / ModuleIcon are read-only display
// values joined from the Navigation Module.
//
// Value is optional : a number or short text the setting needs
// (e.g. Max Lines = 20). Empty for plain on/off settings.
//===============================================================

export interface SystemConfiguration
{
    SystemConfigurationId: number;

    NavigationModuleId: number;

    ModuleCode: string;

    ModuleName: string;

    ModuleIcon: string;

    ConfigurationCode: string;

    ConfigurationName: string;

    IsEnabled: boolean;

    // Optional number / short text (e.g. Max Lines = 20)
    Value: string;

    Remarks: string;
}


//===============================================================
// Create System Configuration
//===============================================================

export interface CreateSystemConfiguration
{
    NavigationModuleId: number;

    ConfigurationCode: string;

    ConfigurationName: string;

    IsEnabled: boolean;

    // Optional number / short text (e.g. Max Lines = 20)
    Value: string;

    Remarks: string;
}


//===============================================================
// Update System Configuration
//===============================================================

export interface UpdateSystemConfiguration
extends CreateSystemConfiguration
{
    SystemConfigurationId: number;
}


//===============================================================
// Configuration Module (one panel on the list page)
//
// Built from a Navigation Module.
//===============================================================

export interface ConfigurationModule
{
    id: number;

    code: string;

    name: string;

    icon: string;

    displayOrder: number;

    isActive: boolean;
}

// Used when a Navigation Module has no icon
export const DEFAULT_MODULE_ICON:
    string =
    'fas fa-layer-group';