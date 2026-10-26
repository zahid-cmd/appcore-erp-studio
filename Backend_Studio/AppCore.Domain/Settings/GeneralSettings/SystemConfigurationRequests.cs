//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// System Configuration Requests
//
// A change to a CRITICAL switch made by a user who is not an
// admin. Nothing changes until an admin approves it.
//
// Status :
//   Pending   : waiting (one Pending request per switch)
//   Approved  : applied by an admin
//   Rejected  : refused by an admin
//   Stale     : the switch changed after the request was made
//   Cancelled : the requester lost the permission
//===============================================================

public class SystemConfigurationRequests
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SystemConfigurationRequestId { get; set; }


    //===========================================================
    // Switch
    //===========================================================

    public long SystemConfigurationId { get; set; }

    public string ConfigurationCode { get; set; } = string.Empty;


    //===========================================================
    // From → To
    //===========================================================

    public bool FromEnabled { get; set; }

    public string FromValue { get; set; } = string.Empty;

    public bool ToEnabled { get; set; }

    public string ToValue { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public string Status { get; set; } = "Pending";


    //===========================================================
    // Requested
    //===========================================================

    public long RequestedBy { get; set; }

    public string RequestedByName { get; set; } = string.Empty;

    public DateTime RequestedDate { get; set; }


    //===========================================================
    // Decided
    //===========================================================

    public long? DecidedBy { get; set; }

    public string? DecidedByName { get; set; }

    public DateTime? DecidedDate { get; set; }

    public string? DecisionNote { get; set; }
}