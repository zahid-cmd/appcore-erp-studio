//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration.DTOs;


//===============================================================
// Create Widget Configuration DTO
//===============================================================

public class CreateWidgetConfigurationDto
{
    //===========================================================
    // Widget Configuration
    //===========================================================

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
    =
        true;


    //===========================================================
    // Details
    //===========================================================

    public List<CreateWidgetConfigurationDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Create Widget Configuration Detail DTO
//===============================================================

public class CreateWidgetConfigurationDetailDto
{
    //===========================================================
    // Widget Configuration Detail
    //===========================================================

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
    =
        true;
}