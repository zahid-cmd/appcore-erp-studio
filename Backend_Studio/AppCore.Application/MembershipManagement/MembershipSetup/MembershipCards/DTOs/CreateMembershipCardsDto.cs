//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Create Membership Cards DTO
//
// Codes and ledgers are always built by the server.
//===============================================================

public class CreateMembershipCardsDto
{
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