//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Application.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration.DTOs; 
 
 
//=============================================================== 
// Widget Configuration DTO 
//=============================================================== 
 
public class WidgetConfigurationDto 
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
 
 
    public string DashboardCode 
    { 
        get; 
        set; 
    } 
    = 
        string.Empty; 
 
 
    public string DashboardName 
    { 
        get; 
        set; 
    } 
    = 
        string.Empty; 
 
 
    //=========================================================== 
    // Widget Configuration Summary 
    //=========================================================== 
 
    public int WidgetCount 
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
 
    public List<WidgetConfigurationDetailDto> Details 
    { 
        get; 
        set; 
    } 
    = 
        new(); 
} 
 
 
//=============================================================== 
// Widget Configuration Detail DTO 
//=============================================================== 
 
public class WidgetConfigurationDetailDto 
{ 
    //=========================================================== 
    // Widget Configuration Detail 
    //=========================================================== 
 
    public long WidgetConfigurationDetailId 
    { 
        get; 
        set; 
    } 
 
 
    public long WidgetConfigurationId 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Widget 
    //=========================================================== 
 
    public long WidgetId 
    { 
        get; 
        set; 
    } 
 
 
    public string WidgetCode 
    { 
        get; 
        set; 
    } 
    = 
        string.Empty; 
 
 
    public string WidgetName 
    { 
        get; 
        set; 
    } 
    = 
        string.Empty; 
 
 
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