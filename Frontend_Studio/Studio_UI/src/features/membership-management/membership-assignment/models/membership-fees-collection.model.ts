//===============================================================
// Membership Fees Collection : models (hand-written page; API
// api/membership-management/membership-assignment/
// membership-fees-collection)
//
// Kind ToCollect : a Pending membership with a fee (no fee row
//                  yet; collect it)
// Kind Fee       : a collection : Paid / Cancelled / Refunded
//===============================================================

export type MembershipFeeStatus =
    'To Collect' | 'Paid' | 'Cancelled' | 'Refunded';


export interface MembershipFeeRow
{
    Kind:'ToCollect' | 'Fee';
    MembershipFeeId:number;
    PublicId:string;
    FeeNo:string;
    FeeType:string;
    MembershipId:number;
    MembershipNo:string;
    MembershipStatus:string;
    CardName:string;
    CustomerId:number;
    CustomerCode:string;
    CustomerName:string;
    CustomerPhone:string;
    ChassisNo:string;
    StartDate:string;
    ExpiryDate:string;
    Amount:number;
    Date:string;
    BranchName:string;
    ReceiptVoucherNo:string;
    RefundJournalVoucherNo:string;
    RefundDate:string;
    Status:MembershipFeeStatus;
    Reason:string;
    Used:boolean;
    UsedText:string;
    CanCancel:boolean;
    CanRefund:boolean;
    Note:string;
}


export interface MembershipFeesPage
{
    Today:string;
    BranchId:number;
    BranchName:string;
    Rows:MembershipFeeRow[];
}


export interface CollectMembershipFee
{
    MembershipId:number;
    Date:string;
    Narration:string;
    Debits:any[];
}


export interface MembershipFeeResult
{
    PublicId:string;
    FeeNo:string;
    MembershipNo:string;
    Amount:number;
    VoucherNo:string;
}
