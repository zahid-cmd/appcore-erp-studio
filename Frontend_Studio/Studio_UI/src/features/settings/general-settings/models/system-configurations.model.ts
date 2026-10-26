//===============================================================
// System Configuration
//
// A switchable setting. Pages and the server read a switch by
// its CODE only (CFG-<ModuleCode>-0001).
//
// ScopeType :
//   Module  : module-wide system switch → admin only
//   Menu    : menu-wide system switch   → admin only
//   Submenu : a page switch (NavigationSubmenuCode) → admin, or
//             a user with "Change Configuration" on that page
//
// Value (optional) : ValueType None / Number / Text. A Number is
// a whole number between ValueMin and ValueMax; empty allowed
// only when ValueEmptyText is set (e.g. "No limit").
//
// IsCritical : a reason is needed; a non-admin's change waits
// for an admin's approval (IsPending).
//===============================================================

export type ConfigurationScope =
    | 'Module'
    | 'Menu'
    | 'Submenu';

export type ConfigurationValueType =
    | 'None'
    | 'Number'
    | 'Text';

export interface SystemConfiguration
{
    SystemConfigurationId: number;

    NavigationModuleId: number;

    ModuleCode: string;

    ModuleName: string;

    ModuleIcon: string;

    ScopeType: ConfigurationScope;

    NavigationMenuCode: string;

    MenuName: string;

    NavigationSubmenuCode: string;

    SubmenuName: string;

    ConfigurationCode: string;

    ConfigurationName: string;

    OnDescription: string;

    OffDescription: string;

    IsEnabled: boolean;

    // Optional number / short text (e.g. Max Lines = 20)
    Value: string;

    ValueType: ConfigurationValueType;

    ValueUnit: string;

    ValueMin: number | null;

    ValueMax: number | null;

    ValueEmptyText: string;

    DefaultEnabled: boolean;

    DefaultValue: string;

    ParentConfigurationCode: string;

    IsCritical: boolean;

    IsSystemDefined: boolean;

    DisplayOrder: number;

    Remarks: string;

    // For the logged-in user
    CanChange: boolean;

    IsPending: boolean;

    PendingEnabled: boolean;

    PendingValue: string;

    PendingByName: string;
}

//===============================================================
// Create / Update System Configuration (admin)
//===============================================================

export interface CreateSystemConfiguration
{
    NavigationModuleId: number;

    ConfigurationCode: string;

    ConfigurationName: string;

    ScopeType: ConfigurationScope;

    NavigationMenuCode: string | null;

    NavigationSubmenuCode: string | null;

    OnDescription: string;

    OffDescription: string;

    IsEnabled: boolean;

    Value: string;

    ValueType: ConfigurationValueType;

    ValueUnit: string;

    ValueMin: number | null;

    ValueMax: number | null;

    ValueEmptyText: string;

    DefaultEnabled: boolean;

    DefaultValue: string;

    ParentConfigurationCode: string | null;

    IsCritical: boolean;

    DisplayOrder: number;

    Remarks: string;
}

export interface UpdateSystemConfiguration
extends CreateSystemConfiguration
{
    SystemConfigurationId: number;

    // Required when a critical switch's ON / OFF or Value changes
    Reason: string;
}

//===============================================================
// Runtime value (what other pages read by code)
//===============================================================

export interface SystemConfigurationValue
{
    ConfigurationCode: string;

    IsEnabled: boolean;

    Value: string;
}

//===============================================================
// Workspace (the page, already filtered for the user)
//===============================================================

export interface ConfigurationModuleInfo
{
    NavigationModuleId: number;

    Code: string;

    Name: string;

    Icon: string;

    DisplayOrder: number;
}

export interface ConfigurationMenuInfo
{
    NavigationModuleId: number;

    Code: string;

    Name: string;

    DisplayOrder: number;
}

export interface ConfigurationSubmenuInfo
{
    NavigationModuleId: number;

    MenuCode: string;

    Code: string;

    Name: string;

    DisplayOrder: number;
}

export interface ConfigurationRecentChange
{
    ConfigurationCode: string;

    ConfigurationName: string;

    Description: string;

    PerformedByName: string;

    PerformedDate: string;
}

export interface ConfigurationWorkspace
{
    CanManage: boolean;

    PendingCount: number;

    Modules: ConfigurationModuleInfo[];

    Menus: ConfigurationMenuInfo[];

    Submenus: ConfigurationSubmenuInfo[];

    Switches: SystemConfiguration[];

    Recent: ConfigurationRecentChange[];
}

//===============================================================
// Apply (Review & Apply)
//===============================================================

export interface ConfigurationChange
{
    ConfigurationCode: string;

    IsEnabled: boolean;

    Value: string;

    Reason: string;
}

export interface ApplyConfigurationResult
{
    Applied: number;

    SentForApproval: number;

    Unchanged: number;
}

//===============================================================
// Change Request (Pending Approval tab, admin)
//===============================================================

export interface ConfigurationRequest
{
    SystemConfigurationRequestId: number;

    ConfigurationCode: string;

    ConfigurationName: string;

    ModuleName: string;

    SubmenuName: string;

    ValueUnit: string;

    ValueEmptyText: string;

    FromEnabled: boolean;

    FromValue: string;

    ToEnabled: boolean;

    ToValue: string;

    Reason: string;

    Status: string;

    IsStale: boolean;

    RequestedBy: number;

    RequestedByName: string;

    RequestedDate: string;
}

//===============================================================
// Configuration Module (kept for older imports)
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

//===============================================================
// "ON · 7 days" / "OFF" / "ON · No limit"
//===============================================================

export function formatConfigurationState
(
    isEnabled:
        boolean,
    value:
        string,
    valueType:
        string,
    unit:
        string,
    emptyText:
        string
):
    string
{
    const state =
        isEnabled ? 'ON' : 'OFF';

    if
    (
        valueType !== 'Number'
        &&
        valueType !== 'Text'
    )
    {
        return state;
    }

    const clean =
        String(value ?? '').trim();

    if
    (
        !clean
    )
    {
        return emptyText
            ? `${state} · ${emptyText}`
            : state;
    }

    return unit
        ? `${state} · ${clean} ${unit}`
        : `${state} · ${clean}`;
}