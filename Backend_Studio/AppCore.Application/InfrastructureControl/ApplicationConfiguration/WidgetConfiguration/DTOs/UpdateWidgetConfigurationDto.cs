//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration.DTOs;


//===============================================================
// Update Widget Configuration DTO
//===============================================================

public class UpdateWidgetConfigurationDto
{
    //===========================================================
    // Widget Configuration
    //===========================================================

    public long WidgetConfigurationId
    {
        get;
        set;
    }


    public long DashboardId
    {
        get;
        set;
    }


    public bool IsActive
    {
        get;
        set;
    }


    //===========================================================
    // Details
    //===========================================================

    public List<UpdateWidgetConfigurationDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Update Widget Configuration Detail DTO
//===============================================================

public class UpdateWidgetConfigurationDetailDto
{
    //===========================================================
    // Widget Configuration Detail
    //===========================================================

    public long WidgetConfigurationDetailId
    {
        get;
        set;
    }


    public long WidgetId
    {
        get;
        set;
    }


    //===========================================================
    // Layout
    //===========================================================

    public int ColumnSpan
    {
        get;
        set;
    }
    =
        12;


    public int DisplayOrder
    {
        get;
        set;
    }
    =
        1;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    }
}