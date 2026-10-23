//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Accounting;


//===============================================================
// Voucher Statuses
//
// Draft     : editable / deletable, nothing posted
// Approved  : locked, waiting to be posted
// Posted    : entries written (VoucherEntries), no edits
// Cancelled : posted voucher reversed by a reversing entry
//===============================================================

public static class VoucherStatuses
{
    public const string Draft = "Draft";

    public const string Approved = "Approved";

    public const string Posted = "Posted";

    public const string Cancelled = "Cancelled";
}