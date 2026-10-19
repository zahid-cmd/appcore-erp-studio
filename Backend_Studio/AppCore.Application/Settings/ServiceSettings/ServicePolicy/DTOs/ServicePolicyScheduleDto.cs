//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Policy Schedule DTO (one scheduled service)
//===============================================================

public class ServicePolicyScheduleDto
{
    //===========================================================
    // Primary Key (0 for a new row)
    //===========================================================

    public long ServicePolicyScheduleId
    {
        get;
        set;
    }


    //===========================================================
    // Order
    //===========================================================

    // 1, 2, 3 ... (set by the server from the row order)
    public int SequenceNo
    {
        get;
        set;
    }


    //===========================================================
    // Service
    //===========================================================

    // Free / Paid
    public string ServiceType
    {
        get;
        set;
    } = string.Empty;


    // 1st, 2nd ... of its type (set by the server)
    public int ServiceTypeNo
    {
        get;
        set;
    }


    // e.g. "4th Free Service" (set by the server)
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Due : this many days after the previous service (row 1 :
    // after the sale date). Days control the schedule.
    //===========================================================

    public int IntervalDays
    {
        get;
        set;
    }


    //===========================================================
    // Reference only : the usual km for this service (not enforced)
    //===========================================================

    public int IntervalKm
    {
        get;
        set;
    }


    //===========================================================
    // Grace days allowed after the due date
    //===========================================================

    public int GraceDays
    {
        get;
        set;
    }
}