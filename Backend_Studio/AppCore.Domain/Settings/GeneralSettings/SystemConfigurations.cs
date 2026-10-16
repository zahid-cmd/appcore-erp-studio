//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// System Configurations
//
// A switchable setting that belongs to one Navigation Module.
// ConfigurationCode is system generated per module and never
// reused : CFG-<ModuleCode>-0001
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
    // Configuration Code (auto generated)
    //===========================================================

    public string ConfigurationCode { get; set; } = string.Empty;


    //===========================================================
    // Configuration Name
    //===========================================================

    public string ConfigurationName { get; set; } = string.Empty;


    //===========================================================
    // Enabled / Disabled
    //===========================================================

    public bool IsEnabled { get; set; }


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