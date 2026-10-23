//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// System Configurations DTO
//
// ModuleCode / ModuleName / ModuleIcon are joined from the
// Navigation Module for display.
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
    // Fields
    //===========================================================

    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    // Optional number / short text (e.g. Max Lines = 20)
    public string Value { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;


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