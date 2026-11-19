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

    // On the page the column is not a column of its own : its text
    // is the small second line under the column of this index (the
    // mobile under the customer, the date under the job card ...).
    // -1 : a column of its own. The rows keep a text per column.
    public int Under { get; set; } = -1;

    // A column "under" another one, shown as the big figure of a
    // serial token (1118 small, 002 big and green) after the texts
    // of the second line
    public bool Figure { get; set; }
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

    // A grouped report (Work In Progress : job by job) : the first
    // GroupColumns columns tell the group, the same on all its rows.
    // 0 : the report is not grouped.
    public int GroupColumns { get; set; }

    // The closing row of every group, in the order the groups come :
    // one text per column ('' : nothing)
    public List<List<string>> GroupTotals { get; set; } = new();
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

    // The jobs of the technicians (owner 2026-11-19) : the job in
    // hand and the ones that wait after it
    public List<WorkshopQueueDto> Queues { get; set; } = new();

    // The service ramps (bays) with the jobs given to them : the
    // first is on the ramp, the later ones wait for it
    public List<WorkshopRampDto> Ramps { get; set; } = new();
}

// A job of a service ramp
public class WorkshopRampJobDto
{
    public Guid PublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string TechnicianName { get; set; } = string.Empty;

    // a technician has the clock running on it now
    public bool Working { get; set; }

    public DateTime? PromisedAt { get; set; }

    public bool IsLate { get; set; }
}

// A service ramp (bay)
public class WorkshopRampDto
{
    public string Name { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public List<WorkshopRampJobDto> Jobs { get; set; } = new();
}

// A job of the queue of a technician
public class WorkshopQueueJobDto
{
    public Guid PublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}

// The queue of a technician : the first job that is not done is
// in hand, the later ones wait
public class WorkshopQueueDto
{
    public string TechnicianName { get; set; } = string.Empty;

    public WorkshopQueueJobDto InHand { get; set; } = new();

    public List<WorkshopQueueJobDto> Waiting { get; set; } = new();
}
