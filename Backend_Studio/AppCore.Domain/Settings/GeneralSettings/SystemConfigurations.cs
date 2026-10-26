//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// System Configurations
//
// A switchable setting. ConfigurationCode is system generated
// per module and never reused : CFG-<ModuleCode>-0001. Pages and
// the server read a switch by its CODE only.
//
// Scope (who may change it) :
//
//   Module  : module-wide system switch      → admin only
//   Menu    : menu-wide system switch        → admin only
//   Submenu : page switch (one submenu)      → admin, or a user
//             with "Change Configuration" on that submenu
//
// Menu / submenu are linked by CODE (NavigationMenus.Code,
// NavigationSubmenus.Code).
//
// Value (optional) : ValueType None / Number / Text. A Number
// is a whole number between ValueMin and ValueMax; empty is
// allowed only when ValueEmptyText is set ("No limit").
//
// IsCritical : a reason is required, and a change by a non-admin
// waits for approval (SystemConfigurationRequests).
// IsSystemDefined : read by code somewhere → cannot be deleted.
//===============================================================

public class SystemConfigurations
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SystemConfigurationId { get; set; }


    //===========================================================
    // Navigation Module (FK → NavigationModules.Id)
    //===========================================================

    public long NavigationModuleId { get; set; }


    //===========================================================
    // Scope : Module / Menu / Submenu, linked by code
    //===========================================================

    public string ScopeType { get; set; } = "Module";

    public string? NavigationMenuCode { get; set; }

    public string? NavigationSubmenuCode { get; set; }


    //===========================================================
    // Configuration Code (auto generated)
    //===========================================================

    public string ConfigurationCode { get; set; } = string.Empty;


    //===========================================================
    // Configuration Name
    //===========================================================

    public string ConfigurationName { get; set; } = string.Empty;


    //===========================================================
    // What ON and OFF do (the two lines on the card)
    //===========================================================

    public string OnDescription { get; set; } = string.Empty;

    public string OffDescription { get; set; } = string.Empty;


    //===========================================================
    // Enabled / Disabled
    //===========================================================

    public bool IsEnabled { get; set; }


    //===========================================================
    // Value (optional : number or short text)
    //===========================================================

    public string Value { get; set; } = string.Empty;

    // None / Number / Text
    public string ValueType { get; set; } = "None";

    // e.g. "days", "lines"
    public string ValueUnit { get; set; } = string.Empty;

    public int? ValueMin { get; set; }

    public int? ValueMax { get; set; }

    // Shown when Value is empty (e.g. "No limit"); empty text =
    // an empty Value is not allowed for a Number
    public string ValueEmptyText { get; set; } = string.Empty;


    //===========================================================
    // Defaults (Reset to default / "Changed" dot)
    //===========================================================

    public bool DefaultEnabled { get; set; }

    public string DefaultValue { get; set; } = string.Empty;


    //===========================================================
    // Parent switch (this one only works while the parent is ON)
    //===========================================================

    public string? ParentConfigurationCode { get; set; }


    //===========================================================
    // Flags
    //===========================================================

    public bool IsCritical { get; set; }

    public bool IsSystemDefined { get; set; }

    public int DisplayOrder { get; set; }


    //===========================================================
    // Remarks
    //===========================================================

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; } = false;

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