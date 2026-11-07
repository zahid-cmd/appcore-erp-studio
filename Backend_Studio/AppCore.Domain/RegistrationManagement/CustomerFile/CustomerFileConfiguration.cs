//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.RegistrationManagement.CustomerFile;


//===============================================================
// Customer File Configuration (hand-written page, NO Code
// Synchronization; tables made by CustomerFileConfiguration_
// Tables.sql). Two tabs :
//
//   Name Transfer  CustomerFileNameTransferRules  NTR-001  dated
//   File Delivery  CustomerFileDeliveryRules      FDR-001  dated
//   both           CustomerFileDocuments          NTD / FDD
//===============================================================


//===============================================================
// Name Transfer rules (before registration), dated
//===============================================================

public class CustomerFileNameTransferRules
{
    public long NameTransferRuleId { get; set; }

    public Guid PublicId { get; set; }

    // NTR-001 (deleted rows count, never reused)
    public string Code { get; set; } = string.Empty;

    public DateOnly EffectiveFrom { get; set; }

    // Name transfers allowed on one bike before registration
    public int TransfersAllowed { get; set; }

    // -> Customer File Income
    public decimal FeePerTransfer { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// File Delivery rules (custody charge of an uncollected file),
// dated. See CustodyCharge in the Application DTOs.
//===============================================================

public class CustomerFileDeliveryRules
{
    public long DeliveryRuleId { get; set; }

    public Guid PublicId { get; set; }

    // FDR-001
    public string Code { get; set; } = string.Empty;

    public DateOnly EffectiveFrom { get; set; }

    // Days after the file is ready with no charge
    public int FreeDays { get; set; }

    // After the free days, up to one year (once)
    public decimal FirstYearAmount { get; set; }

    // In the second year (once)
    public decimal SecondYearAmount { get; set; }

    // Beyond two years : per year (a part year = a full year)
    public decimal PerYearAmount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Required documents of a name transfer / a file delivery
//===============================================================

public class CustomerFileDocuments
{
    public long CustomerFileDocumentId { get; set; }

    public Guid PublicId { get; set; }

    // NameTransfer / FileDelivery
    public string DocumentFor { get; set; } = string.Empty;

    // NTD-001 / FDD-001
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
