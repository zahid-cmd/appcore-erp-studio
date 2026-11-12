//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Fees Collection repository (hand-written page)
//===============================================================

public interface IMembershipFeesCollectionRepository
{
    // To collect (Pending memberships with a fee) + collections
    Task<MembershipFeesPageDto> GetAllAsync(
        long branchId);

    // Payment Desk : Receipt Voucher, the membership Active
    Task<MembershipFeeResultDto> CollectAsync(
        CollectMembershipFeeDto dto,
        long branchId,
        long userId);

    // Unused only : Receipt Voucher cancelled, membership Pending
    Task<MembershipFeeResultDto> CancelCollectionAsync(
        Guid publicId,
        MembershipFeeReasonDto dto,
        long userId);

    // Cancelled membership, unused : Journal Voucher crediting
    // the customer with the whole fee
    Task<MembershipFeeResultDto> RefundAsync(
        Guid publicId,
        MembershipFeeReasonDto dto,
        long branchId,
        long userId);
}
