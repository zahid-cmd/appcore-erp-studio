//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;


//===============================================================
// Clone Plan DTO
// The whole wizard, sent by the Angular app (CloneWorkflowState).
//===============================================================

public class ClonePlanDto
{
    //===========================================================
    // Clone From (Source Submenu)
    //===========================================================

    public long CloneFromId { get; set; }

    public string CloneFromCode { get; set; } = string.Empty;

    public string CloneFromName { get; set; } = string.Empty;


    //===========================================================
    // Clone To (Target Submenu)
    //===========================================================

    public long CloneToId { get; set; }

    public string CloneToCode { get; set; } = string.Empty;

    public string CloneToName { get; set; } = string.Empty;


    //===========================================================
    // Names
    //===========================================================

    public string EntityName { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;


    //===========================================================
    // Clone Action
    //===========================================================

    public List<ClonePlanFieldDto> Fields { get; set; } = new();

    public ClonePlanSetupDto Setup { get; set; } = new();
}


//===============================================================
// One row of the Clone Action table
//===============================================================

public class ClonePlanFieldDto
{
    public string SourceName { get; set; } = string.Empty;

    // Keep | Modify | Add | Exclude
    public string Action { get; set; } = "Keep";

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = "string";

    public int? MaxLength { get; set; }

    public bool Required { get; set; }

    public bool Unique { get; set; }

    // Textbox | Textarea | Number | Date | YesNo | Status | Checkbox | Dropdown | SearchDropdown
    public string Control { get; set; } = "Textbox";

    public string DefaultValue { get; set; } = string.Empty;
}


//===============================================================
// Parent link, code number and options
//===============================================================

public class ClonePlanSetupDto
{
    // Parent link: Keep | Change | Exclude
    public string ParentMode { get; set; } = "Exclude";

    public string ParentEntity { get; set; } = string.Empty;

    public string ParentFk { get; set; } = string.Empty;

    public List<string> Cascade { get; set; } = new();


    // Code number
    public bool CodeEnabled { get; set; }

    public string CodePrefix { get; set; } = string.Empty;

    public List<ClonePlanCodeSegmentDto> CodeSegments { get; set; } = new();

    public int CodeSequencePad { get; set; } = 4;


    // Options
    public bool SoftDelete { get; set; } = true;
}


public class ClonePlanCodeSegmentDto
{
    public string Name { get; set; } = string.Empty;

    public int Pad { get; set; } = 3;
}