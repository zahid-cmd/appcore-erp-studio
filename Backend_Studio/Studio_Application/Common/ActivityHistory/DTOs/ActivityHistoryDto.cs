//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.Common.ActivityHistory.DTOs;

//===============================================================
// Activity History DTO
//===============================================================

public class ActivityHistoryDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long Id
    {
        get;
        set;
    }

    //===========================================================
    // Module Information
    //===========================================================

    public string Module
    {
        get;
        set;
    } = string.Empty;

    public string EntityName
    {
        get;
        set;
    } = string.Empty;

    public long EntityId
    {
        get;
        set;
    }

    //===========================================================
    // Activity Information
    //===========================================================

    public string ActivityType
    {
        get;
        set;
    } = string.Empty;

    public string ActivityTitle
    {
        get;
        set;
    } = string.Empty;

    public string? ActivityDescription
    {
        get;
        set;
    }

    //===========================================================
    // User Information
    //===========================================================

    public long PerformedBy
    {
        get;
        set;
    }

    public string PerformedByName
    {
        get;
        set;
    } = string.Empty;

    //===========================================================
    // Date
    //===========================================================

    public DateTime PerformedDate
    {
        get;
        set;
    }
}