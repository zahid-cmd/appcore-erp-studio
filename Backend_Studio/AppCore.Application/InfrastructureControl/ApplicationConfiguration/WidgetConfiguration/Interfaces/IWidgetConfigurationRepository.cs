//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// IWidgetConfigurationRepository
//===============================================================

public interface IWidgetConfigurationRepository
{
    //===========================================================
    // Defaults
    //===========================================================

    Task<WidgetConfigurationDefaultsDto>
        GetDefaultsAsync();


    //===========================================================
    // Widget Configuration
    //===========================================================

    Task<List<WidgetConfigurationDto>>
        GetAllAsync();


    Task<WidgetConfigurationDto?>
        GetByIdAsync
        (
            long widgetConfigurationId
        );


    Task<WidgetConfigurationDto?>
        GetByDashboardIdAsync
        (
            long dashboardId
        );


    //===========================================================
    // Check Dashboard Configuration
    //===========================================================

    Task<bool>
        ExistsByDashboardIdAsync
        (
            long dashboardId
        );


    //===========================================================
    // Create
    //===========================================================

    Task<long>
        CreateAsync
        (
            CreateWidgetConfigurationDto dto
        );


    //===========================================================
    // Update
    //===========================================================

    Task<bool>
        UpdateAsync
        (
            UpdateWidgetConfigurationDto dto
        );


    //===========================================================
    // Delete
    //===========================================================

    Task<bool>
        DeleteAsync
        (
            long widgetConfigurationId
        );


    //===========================================================
    // Restore
    //===========================================================

    Task<bool>
        RestoreLastDeletedAsync();
}