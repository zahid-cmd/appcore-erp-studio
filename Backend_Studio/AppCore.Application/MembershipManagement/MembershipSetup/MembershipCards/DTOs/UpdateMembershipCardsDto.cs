//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Update Membership Cards DTO
//
// Card Code and every ledger code are locked.
//===============================================================

public class UpdateMembershipCardsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipCardId
    {
        get;
        set;
    }


    //===========================================================
    // Card Information
    //===========================================================

    // Typed; saved in UPPERCASE
    public string CardName
    {
        get;
        set;
    } = string.Empty;


    // 1 = lowest; unique
    public int CardRank
    {
        get;
        set;
    }


    //===========================================================
    // Status & Control
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    public bool IsActive
    {
        get;
        set;
    } = true;
}