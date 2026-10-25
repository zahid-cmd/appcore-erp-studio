//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Update EMI Reimbursement Scheme (code and brand are locked)
//===============================================================

public class UpdateEmiReimbursementSchemesDto
    : CreateEmiReimbursementSchemesDto
{
    public long EmiReimbursementSchemeId { get; set; }
}