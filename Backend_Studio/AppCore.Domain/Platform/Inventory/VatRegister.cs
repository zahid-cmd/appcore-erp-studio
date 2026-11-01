//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Inventory;


//===============================================================
// VAT register : item-level VAT of purchases and sales (Mushak
// 6.1 / 6.2 books, 9.1 return).
//===============================================================

public class VatRegister
{
    public long VatRegisterId { get; set; }
    // Purchase / Sale
    public string Direction { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public long DocumentId { get; set; }
    public long? DocumentLineId { get; set; }
    public string DocumentNo { get; set; } = string.Empty;
    public DateOnly DocumentDate { get; set; }
    public string MushakNo { get; set; } = string.Empty;
    public DateOnly? MushakDate { get; set; }
    public string PartyType { get; set; } = string.Empty;
    public string PartyCode { get; set; } = string.Empty;
    public string PartyName { get; set; } = string.Empty;
    public string PartyBin { get; set; } = string.Empty;
    public long BranchId { get; set; }
    // MB / SP / AC / SV
    public string ProductType { get; set; } = string.Empty;
    public long? ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal TaxableValue { get; set; }
    public decimal VatRate { get; set; }
    public decimal VatAmount { get; set; }
    public decimal VatClaimable { get; set; }
    public string VatLedgerCode { get; set; } = string.Empty;
    public bool IsReversal { get; set; }
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}
