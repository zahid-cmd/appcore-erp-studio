//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.DTOs;


//===============================================================
// Switch Branch (user menu › Switch Branch, 2026-11-07)
//
// A user allotted to two or more active branches (Branch
// Assignment, the same rule as login) may move the session to
// another of them without logging out. The server issues a new
// token carrying the new branchId, with the SAME expiry as the
// current one (switching never lengthens a session).
//
// Setting "Allow Branch Switch Without Re-login" (Security &
// Permission › Branch Assignment, CFG-MOD-006-0101; missing = ON).
//===============================================================


// One branch the user may work in
public class SwitchBranchOptionDto
{
    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string WingName { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Accessories / Services the branch
    // runs today (wing core lines + active grants)
    public List<string> BusinessLines { get; set; } = new();

    // The branch of the current session
    public bool IsCurrent { get; set; }
}


// GET my-branches
public class MyBranchesDto
{
    public long CurrentBranchId { get; set; }

    // The setting is ON
    public bool SwitchAllowed { get; set; }

    // Setting ON and two or more branches : the menu item shows
    public bool CanSwitch { get; set; }

    // Why it cannot switch ('' when it can)
    public string Message { get; set; } = string.Empty;

    public List<SwitchBranchOptionDto> Branches { get; set; } = new();
}


// POST switch-branch
public class SwitchBranchRequestDto
{
    public long BranchId { get; set; }
}
