//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations : the Workshop Dashboard and the Service
// Reports (read-only pages). A report comes as columns and rows of
// ready text, so the one report page shows any of them.
//===============================================================

public class WsReportColumnDto
{
    public string Header { get; set; } = string.Empty;

    // left / right / center
    public string Align { get; set; } = "left";

    public string Width { get; set; } = "140px";
}


public class WsReportDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public List<WsLookupDto> Branches { get; set; } = new();

    public List<WsReportColumnDto> Columns { get; set; } = new();

    // One text per column
    public List<List<string>> Rows { get; set; } = new();

    // The closing row : one text per column ('' : nothing); empty :
    // the report has no totals
    public List<string> Totals { get; set; } = new();

    // More rows matched than are shown
    public bool Cut { get; set; }
}


public class WsTileDto
{
    public string Label { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    public string Hint { get; set; } = string.Empty;

    // blue / green / amber / red / slate
    public string Tone { get; set; } = "blue";
}


// A bike that is in the workshop now
public class WorkshopDashboardJobDto
{
    public Guid PublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    public string JobType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime? CheckInAt { get; set; }

    public DateTime? PromisedAt { get; set; }

    // Promised, and the time is over
    public bool IsLate { get; set; }

    // Who works on it now, and where
    public string Technicians { get; set; } = string.Empty;

    public string Bays { get; set; } = string.Empty;
}


public class WorkshopDashboardDto
{
    public string Today { get; set; } = string.Empty;

    public List<WsLookupDto> Branches { get; set; } = new();

    public List<WsTileDto> Tiles { get; set; } = new();

    // The open job cards by status
    public List<WsTileDto> Statuses { get; set; } = new();

    public List<WorkshopDashboardJobDto> Jobs { get; set; } = new();

    // The bays : free, or the job in it
    public List<WsTileDto> Bays { get; set; } = new();
}
