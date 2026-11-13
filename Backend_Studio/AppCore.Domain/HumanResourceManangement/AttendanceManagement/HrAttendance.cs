//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Attendance and leave (Human Resource > Attendance Management,
// hand-written pages : NEVER run Code Sync for them; tables made
// by HumanResource_Phase2_Engine.sql)
//
//   HrAttendance          one row per employee per day
//   HrLeaveApplications   LVA-0001; approving writes the leave
//                         days into HrAttendance
//===============================================================

public class HrAttendance
{
    public long AttendanceId { get; set; }

    public long EmployeeId { get; set; }

    public DateOnly AttendanceDate { get; set; }

    // P Present, L Late, H Half Day, A Absent, LV Leave,
    // WO Weekly Off, HD Holiday
    public string Status { get; set; } = string.Empty;

    // HH:mm (24 hours); '' = not noted
    public string InTime { get; set; } = string.Empty;

    public string OutTime { get; set; } = string.Empty;

    public int LateMinutes { get; set; }

    public decimal OvertimeHours { get; set; }

    // LV : the leave type
    public long? LeaveTypeId { get; set; }

    // LV : the application that wrote the row (null = marked on
    // Daily Attendance)
    public long? LeaveApplicationId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class HrLeaveApplications
{
    public long LeaveApplicationId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public long LeaveTypeId { get; set; }

    public DateOnly FromDate { get; set; }

    public DateOnly ToDate { get; set; }

    // Working days in the range (weekly off days and holidays are
    // not leave)
    public decimal Days { get; set; }

    public string Reason { get; set; } = string.Empty;

    // Pending / Approved / Rejected / Cancelled
    public string Status { get; set; } = "Pending";

    public long? DecidedBy { get; set; }

    public DateTime? DecidedDate { get; set; }

    public string DecisionNote { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
