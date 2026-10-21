//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards Defaults DTO
//
// Preview of what the next card gets. The server builds the real
// codes on save.
//===============================================================

public class MembershipCardsDefaultsDto
{
    //===========================================================
    // Card Information
    //===========================================================

    public string NextCardCode
    {
        get;
        set;
    } = string.Empty;


    public int NextCardRank
    {
        get;
        set;
    }


    //===========================================================
    // Accounts (the four sub groups, found by code)
    //===========================================================

    public MembershipCardsAccountOptionDto FeeAccount
    {
        get;
        set;
    } = new();


    public MembershipCardsAccountOptionDto DiscountAccount
    {
        get;
        set;
    } = new();


    public MembershipCardsAccountOptionDto ServiceIncomeAccount
    {
        get;
        set;
    } = new();


    public MembershipCardsAccountOptionDto ServiceExpenseAccount
    {
        get;
        set;
    } = new();


    //===========================================================
    // Complimentary Service
    //===========================================================

    public string ServiceSubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceSubCategoryName
    {
        get;
        set;
    } = string.Empty;


    public string NextServiceCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceMessage
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// One account sub group a card creates a ledger under
//===============================================================

public class MembershipCardsAccountOptionDto
{
    public string SubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string SubGroupName
    {
        get;
        set;
    } = string.Empty;


    public string NextLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Why a card cannot be saved yet (empty when fine)
    public string Message
    {
        get;
        set;
    } = string.Empty;
}