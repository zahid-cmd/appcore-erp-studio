//=============================================================== 
// Namespaces 
//=============================================================== 
 
using AppCore.Domain.Common; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration; 
 
 
//=============================================================== 
// Widget Configuration 
//=============================================================== 
 
public class WidgetConfiguration 
{ 
    //=========================================================== 
    // Primary Key 
    //=========================================================== 
 
    public long WidgetConfigurationId 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Dashboard 
    //=========================================================== 
 
    public long DashboardId 
    { 
        get; 
        set; 
    } 
 
 
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
 
 
    public bool IsDeleted 
    { 
        get; 
        set; 
    } 
    = 
        false; 
 
 
    //=========================================================== 
    // Delete Audit 
    //=========================================================== 
 
    public long? DeletedBy 
    { 
        get; 
        set; 
    } 
 
 
    public DateTime? DeletedDate 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Create Audit 
    //=========================================================== 
 
    public long? CreatedBy 
    { 
        get; 
        set; 
    } 
 
 
    public DateTime CreatedDate 
    { 
        get; 
        set; 
    } 
    = 
        DateTime.UtcNow; 
 
 
    //=========================================================== 
    // Modify Audit 
    //=========================================================== 
 
    public long? ModifiedBy 
    { 
        get; 
        set; 
    } 
 
 
    public DateTime? ModifiedDate 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Details 
    //=========================================================== 
 
    public virtual ICollection<WidgetConfigurationDetail> 
        Details 
    { 
        get; 
        set; 
    } 
    = 
        new List<WidgetConfigurationDetail>(); 
} 
 
 
//=============================================================== 
// Widget Configuration Detail 
//=============================================================== 
 
public class WidgetConfigurationDetail 
{ 
    //=========================================================== 
    // Primary Key 
    //=========================================================== 
 
    public long WidgetConfigurationDetailId 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Widget Configuration 
    //=========================================================== 
 
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
 
 
    public bool IsDeleted 
    { 
        get; 
        set; 
    } 
    = 
        false; 
 
 
    //=========================================================== 
    // Delete Audit 
    //=========================================================== 
 
    public long? DeletedBy 
    { 
        get; 
        set; 
    } 
 
 
    public DateTime? DeletedDate 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Create Audit 
    //=========================================================== 
 
    public long? CreatedBy 
    { 
        get; 
        set; 
    } 
 
 
    public DateTime CreatedDate 
    { 
        get; 
        set; 
    } 
    = 
        DateTime.UtcNow; 
 
 
    //=========================================================== 
    // Modify Audit 
    //=========================================================== 
 
    public long? ModifiedBy 
    { 
        get; 
        set; 
    } 
 
 
    public DateTime? ModifiedDate 
    { 
        get; 
        set; 
    } 
 
 
    //=========================================================== 
    // Widget Configuration 
    //=========================================================== 
 
    public virtual WidgetConfiguration 
        WidgetConfiguration 
    { 
        get; 
        set; 
    } 
    = 
        null!; 
}