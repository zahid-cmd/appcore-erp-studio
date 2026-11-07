//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.CustomerFile;


//===============================================================
// Customer File Configuration : fixed lists
//===============================================================

public static class CustomerFileDocumentFor
{
    public const string NameTransfer = "NameTransfer";

    public const string FileDelivery = "FileDelivery";

    // Document list -> (code prefix, label)
    public static readonly IReadOnlyDictionary<string, (string Prefix, string Label)> All =
        new Dictionary<string, (string Prefix, string Label)>(StringComparer.OrdinalIgnoreCase)
        {
            [NameTransfer] = ("NTD", "Name Transfer Document"),
            [FileDelivery] = ("FDD", "File Delivery Document")
        };
}


//===============================================================
// Custody charge of a registration file collected late
// (owner 2026-11-08) :
//   within Free Days after the file is ready : 0
//   then up to one year (from ready)        : FirstYearAmount (once)
//   in the second year                      : + SecondYearAmount (once)
//   beyond two years                        : + years x PerYearAmount,
//                                             a part year = a full year
// The rule used is the one in force on the day the file is ready.
//===============================================================

public static class CustodyCharge
{
    public static decimal Calculate
    (
        DateOnly readyDate,
        DateOnly collectedDate,
        int freeDays,
        decimal firstYearAmount,
        decimal secondYearAmount,
        decimal perYearAmount
    )
    {
        if (collectedDate <= readyDate.AddDays(freeDays))
        {
            return 0m;
        }

        decimal charge = firstYearAmount;

        if (collectedDate <= readyDate.AddYears(1))
        {
            return charge;
        }

        charge += secondYearAmount;

        if (collectedDate <= readyDate.AddYears(2))
        {
            return charge;
        }

        // Years started after the second year
        int years = 1;

        while (collectedDate > readyDate.AddYears(2 + years))
        {
            years++;
        }

        return charge + years * perYearAmount;
    }
}


//===============================================================
// Rows
//===============================================================

public class NameTransferRuleDto
{
    public long NameTransferRuleId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    public int TransfersAllowed { get; set; }

    public decimal FeePerTransfer { get; set; }

    // Current / Upcoming / Old
    public string RateState { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class SaveNameTransferRuleDto
{
    public string EffectiveFrom { get; set; } = string.Empty;

    public int TransfersAllowed { get; set; }

    public decimal FeePerTransfer { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


public class DeliveryRuleDto
{
    public long DeliveryRuleId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string EffectiveFrom { get; set; } = string.Empty;

    public int FreeDays { get; set; }

    public decimal FirstYearAmount { get; set; }

    public decimal SecondYearAmount { get; set; }

    public decimal PerYearAmount { get; set; }

    public string RateState { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class SaveDeliveryRuleDto
{
    public string EffectiveFrom { get; set; } = string.Empty;

    public int FreeDays { get; set; }

    public decimal FirstYearAmount { get; set; }

    public decimal SecondYearAmount { get; set; }

    public decimal PerYearAmount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


public class CustomerFileDocumentDto
{
    public long CustomerFileDocumentId { get; set; }

    public Guid PublicId { get; set; }

    public string DocumentFor { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsRequired { get; set; }

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class SaveCustomerFileDocumentDto
{
    // Locked after saving
    public string DocumentFor { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;

    // 0 = after the last one
    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Everything the page shows (one call) / next codes
//===============================================================

public class CustomerFileConfigurationDto
{
    public List<NameTransferRuleDto> NameTransferRules { get; set; } = new();

    public List<DeliveryRuleDto> DeliveryRules { get; set; } = new();

    public List<CustomerFileDocumentDto> Documents { get; set; } = new();

    public string Today { get; set; } = string.Empty;
}


public class CustomerFileConfigurationDefaultsDto
{
    public string NameTransferRuleCode { get; set; } = string.Empty;

    public string DeliveryRuleCode { get; set; } = string.Empty;

    public string NameTransferDocumentCode { get; set; } = string.Empty;

    public string FileDeliveryDocumentCode { get; set; } = string.Empty;

    public int NextNameTransferDocumentOrder { get; set; } = 1;

    public int NextFileDeliveryDocumentOrder { get; set; } = 1;
}
