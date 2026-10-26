//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// System Configurations DTO
//
// ModuleCode / ModuleName / ModuleIcon, MenuName and
// SubmenuName are joined for display. CanChange / IsPending
// are worked out for the user who asked.
//===============================================================

public class SystemConfigurationsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SystemConfigurationId { get; set; }


    //===========================================================
    // Module
    //===========================================================

    public long NavigationModuleId { get; set; }

    public string ModuleCode { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;

    public string ModuleIcon { get; set; } = string.Empty;


    //===========================================================
    // Scope (Module / Menu / Submenu, by code)
    //===========================================================

    public string ScopeType { get; set; } = "Module";

    public string NavigationMenuCode { get; set; } = string.Empty;

    public string MenuName { get; set; } = string.Empty;

    public string NavigationSubmenuCode { get; set; } = string.Empty;

    public string SubmenuName { get; set; } = string.Empty;


    //===========================================================
    // Fields
    //===========================================================

    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public string OnDescription { get; set; } = string.Empty;

    public string OffDescription { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    // Optional number / short text (e.g. Max Lines = 20)
    public string Value { get; set; } = string.Empty;

    public string ValueType { get; set; } = "None";

    public string ValueUnit { get; set; } = string.Empty;

    public int? ValueMin { get; set; }

    public int? ValueMax { get; set; }

    public string ValueEmptyText { get; set; } = string.Empty;

    public bool DefaultEnabled { get; set; }

    public string DefaultValue { get; set; } = string.Empty;

    public string ParentConfigurationCode { get; set; } = string.Empty;

    public bool IsCritical { get; set; }

    public bool IsSystemDefined { get; set; }

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // For the user who asked
    //===========================================================

    // May toggle / change the value (admin, or Change
    // Configuration on the page)
    public bool CanChange { get; set; }

    // A critical change is waiting for approval
    public bool IsPending { get; set; }

    public bool PendingEnabled { get; set; }

    public string PendingValue { get; set; } = string.Empty;

    public string PendingByName { get; set; } = string.Empty;


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}