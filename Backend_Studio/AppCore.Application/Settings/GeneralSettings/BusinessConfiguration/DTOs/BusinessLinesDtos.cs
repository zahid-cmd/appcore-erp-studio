//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Wing Core Business (read / save)
//===============================================================

public class WingBusinessLinesDto
{
    public long WingId { get; set; }

    public string WingCode { get; set; } = string.Empty;

    public string WingName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // Core line(s) of every branch under the wing
    public List<string> BusinessLines { get; set; } = new();
}


public class UpdateWingBusinessLinesDto
{
    public long WingId { get; set; }

    public List<string> BusinessLines { get; set; } = new();
}


//===============================================================
// Branch Overview : every line of every branch, for today
//===============================================================

public class BranchBusinessLinesDto
{
    public long WingId { get; set; }

    public string WingCode { get; set; } = string.Empty;

    public string WingName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // One entry per business line (all four, in fixed order)
    public List<BranchLineStatusDto> Lines { get; set; } = new();

    // Lines in force today (core + active grants)
    public List<string> ActiveLines { get; set; } = new();
}


public class BranchLineStatusDto
{
    public string BusinessLine { get; set; } = string.Empty;

    // Core / Granted / Scheduled / Expired / Inactive / None
    public string Source { get; set; } = string.Empty;

    public bool IsActiveToday { get; set; }

    public string AccessType { get; set; } = string.Empty;

    public DateOnly? ValidFrom { get; set; }

    public DateOnly? ValidUntil { get; set; }

    // The grant behind it (0 for Core / None)
    public long BusinessConfigurationId { get; set; }
}


//===============================================================
// Warehouses allowed for a business line today
//===============================================================

public class AllowedWarehouseDto
{
    public long WarehouseId { get; set; }

    public long BranchId { get; set; }

    public long WingId { get; set; }

    // Lines in force today for the warehouse's branch
    public List<string> ActiveLines { get; set; } = new();
}