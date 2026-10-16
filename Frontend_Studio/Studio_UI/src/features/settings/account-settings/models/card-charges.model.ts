//===============================================================
// Card Charges
//
// Master  : POS Account (POS Accounts page)
// Detail  : one line per Card (Card Setup) with a Charge %
//
// A card can appear only once per POS Account.
//===============================================================


//===============================================================
// Card Charge Line (one card of a POS Account)
//===============================================================

export interface CardChargeLine
{
    // 0 for a new line that is not saved yet
    CardChargeId: number;

    CardSetupId: number;

    CardCode: string;

    CardName: string;

    // Percentage, 0 – 100, two decimals
    ChargePercent: number;
}


//===============================================================
// Card Charges (all lines of one POS Account)
//
// Used by the list page (one row per POS Account) and by the
// form page (edit / view).
//===============================================================

export interface CardCharges
{
    POSAccountId: number;

    POSAccountCode: string;

    POSAccountName: string;

    // Status of the POS Account (used by the list Status filter)
    Status: boolean;

    CardCount: number;

    // "VISA, MASTERCARD, AMEX" (list display / search)
    CardNames: string;

    Details: CardChargeLine[];
}


//===============================================================
// Save Line (sent to the API)
//===============================================================

export interface SaveCardChargeLine
{
    // 0 = new line; > 0 = existing line kept / updated
    CardChargeId: number;

    CardSetupId: number;

    ChargePercent: number;
}


//===============================================================
// Save Card Charges (Create & Update)
//
// Create : POS Account has no card charges yet
// Update : replaces all lines of the POS Account
//===============================================================

export interface SaveCardCharges
{
    POSAccountId: number;

    Details: SaveCardChargeLine[];
}