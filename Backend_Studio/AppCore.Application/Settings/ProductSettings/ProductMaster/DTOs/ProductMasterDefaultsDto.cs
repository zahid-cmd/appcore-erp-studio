//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductMaster.DTOs;


//===============================================================
// Product Master Defaults DTO
//===============================================================

public class ProductMasterDefaultsDto
{
    //===========================================================
    // Product Master Code
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Ledger Code
    //===========================================================

    public string InventoryLedgerCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // WIP Ledger Code
    //===========================================================

    public string WipLedgerCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // COGS Ledger Code
    //===========================================================

    public string CogsLedgerCode
    {
        get;
        set;
    } = string.Empty;
}