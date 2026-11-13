//===============================================================
// Product Shelf : what a page hands to the shelf, and what it
// gets back. The shelf knows nothing about orders : the page
// builds the products (already filtered by the supplier), their
// starting figures, and turns the picks into its own lines.
//===============================================================


// Figures of one picked item (start values or the result)
export interface ShelfFigures
{
    qty:
        number;

    free:
        number;

    // 0 = not given
    mrp:
        number;

    // Margin % on MRP; null = not given / not used
    margin:
        number | null;

    // 0 = not given
    dp:
        number;
}


export interface ShelfProduct
{
    code:
        string;

    name:
        string;

    unit:
        string;

    categoryId:
        number | null;

    categoryName:
        string;

    subCategoryId:
        number | null;

    subCategoryName:
        string;

    // Full URL; '' = icon tile
    imageUrl:
        string;

    // Colour of the item (motor bikes); left out = read from the
    // last part of the name ("... - A09 - Black")
    colorName?:
        string;

    // "Last DP 333.33 · POSP-…-00002" / "No order from this supplier yet"
    lastText:
        string;

    // Ordered from this supplier before (the "Ordered before" filter)
    boughtBefore:
        boolean;

    // "MRP 400.00" / "MRP —"
    mrpText:
        string;

    // Stock line : "Stock — · On order 10 · Re-order 15"
    stockText:
        string;

    // The same figures, one by one, for the card's stock strip
    // (left out : the card shows stockText)
    stockQty?:
        number | null;
    onOrderQty?:
        number;
    reorderLevel?:
        number;
    // Status colour : red / amber (needs re-order) / green / ''
    stockTone:
        'red' | 'amber' | 'green' | '';

    // Most this order may take (Max Stock Level); null = no cap
    room:
        number | null;

    // Quantity already on the order (0 = not on it); its line's
    // figures are then the start values (the pick updates it)
    inOrderQty:
        number;

    start:
        ShelfFigures;
}


export interface ShelfOptions
{
    // MRP box (SP / AC)
    showMrp:
        boolean;

    // Margin % box (MRP invoice)
    showMargin:
        boolean;

    // Free Qty box (switch)
    showFree:
        boolean;

    // MRP needed on every pick (MRP invoice)
    mrpRequired:
        boolean;

    // "DP" / "Unit Price"
    priceWord:
        string;

    // "spare part / lubricant"
    itemWord:
        string;

    // "spare parts / lubricants"
    itemsWord:
        string;

    // Font Awesome icon of the item
    icon:
        string;
    // The record lines go to : 'order' (default) / 'purchase'
    docWord?:
        string;

    // Sales (Sales Invoices / Quotations, 2026-11-13) : the price
    // box shows the MRP read only (no price to type), the card's
    // "last from this supplier" strip is hidden
    salesMode?:
        boolean;
}


export interface ShelfPick
{
    code:
        string;

    figures:
        ShelfFigures;

    // DP given (typed or from the last order); false = worked
    // out from MRP and Margin %
    dpTyped:
        boolean;
}
