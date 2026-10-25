//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Update Fund Transfer DTO (Draft only)
//===============================================================

public class UpdateFundTransferDto : CreateFundTransferDto
{
    public long FundTransferId { get; set; }
}


//===============================================================
// Cancel Fund Transfer DTO (Posted only)
//===============================================================

public class CancelFundTransferDto
{
    // yyyy-MM-dd (empty = today)
    public string CancelDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}