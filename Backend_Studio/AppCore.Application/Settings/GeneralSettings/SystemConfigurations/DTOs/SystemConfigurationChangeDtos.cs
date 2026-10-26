//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Apply Changes (Review & Apply)
//
// All changes are checked first; if any is not allowed nothing
// is saved. Normal changes apply at once. Critical changes by a
// non-admin become Pending requests.
//===============================================================

public class ApplySystemConfigurationChangesDto
{
    public List<SystemConfigurationChangeDto> Changes { get; set; } = new();
}

public class SystemConfigurationChangeDto
{
    public string ConfigurationCode { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    public string Value { get; set; } = string.Empty;

    // Required for critical switches
    public string Reason { get; set; } = string.Empty;
}

public class ApplySystemConfigurationResultDto
{
    public int Applied { get; set; }

    public int SentForApproval { get; set; }

    public int Unchanged { get; set; }
}


//===============================================================
// Runtime value (GET values) : what other pages read by code
//===============================================================

public class SystemConfigurationValueDto
{
    public string ConfigurationCode { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    public string Value { get; set; } = string.Empty;
}


//===============================================================
// Change Request (Pending Approval tab)
//===============================================================

public class SystemConfigurationRequestDto
{
    public long SystemConfigurationRequestId { get; set; }

    public string ConfigurationCode { get; set; } = string.Empty;

    public string ConfigurationName { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;

    public string SubmenuName { get; set; } = string.Empty;

    public string ValueUnit { get; set; } = string.Empty;

    public string ValueEmptyText { get; set; } = string.Empty;

    public bool FromEnabled { get; set; }

    public string FromValue { get; set; } = string.Empty;

    public bool ToEnabled { get; set; }

    public string ToValue { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    // The switch changed since the request : cannot be approved
    public bool IsStale { get; set; }

    public long RequestedBy { get; set; }

    public string RequestedByName { get; set; } = string.Empty;

    public DateTime RequestedDate { get; set; }
}

public class DecideSystemConfigurationRequestDto
{
    public string Note { get; set; } = string.Empty;
}