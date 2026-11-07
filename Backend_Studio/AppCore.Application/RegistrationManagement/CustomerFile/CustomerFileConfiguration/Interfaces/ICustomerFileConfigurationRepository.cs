//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.CustomerFile;


//===============================================================
// Customer File Configuration Repository Interface
//
// Rules broken -> InvalidOperationException (400 / 409),
// missing row -> KeyNotFoundException (404).
//===============================================================

public interface ICustomerFileConfigurationRepository
{
    Task<CustomerFileConfigurationDto> GetAllAsync();

    Task<CustomerFileConfigurationDefaultsDto> GetDefaultsAsync();


    // Name Transfer rules (dated)
    Task<Guid> CreateNameTransferRuleAsync(SaveNameTransferRuleDto dto, long userId);

    Task UpdateNameTransferRuleAsync(Guid publicId, SaveNameTransferRuleDto dto, long userId);

    Task DeleteNameTransferRuleAsync(Guid publicId, long userId);

    Task<bool> RestoreNameTransferRuleAsync(long userId);


    // File Delivery rules (dated)
    Task<Guid> CreateDeliveryRuleAsync(SaveDeliveryRuleDto dto, long userId);

    Task UpdateDeliveryRuleAsync(Guid publicId, SaveDeliveryRuleDto dto, long userId);

    Task DeleteDeliveryRuleAsync(Guid publicId, long userId);

    Task<bool> RestoreDeliveryRuleAsync(long userId);


    // Required documents (documentFor : NameTransfer / FileDelivery)
    Task<Guid> CreateDocumentAsync(SaveCustomerFileDocumentDto dto, long userId);

    Task UpdateDocumentAsync(Guid publicId, SaveCustomerFileDocumentDto dto, long userId);

    Task DeleteDocumentAsync(Guid publicId, long userId);

    Task<bool> RestoreDocumentAsync(string? documentFor, long userId);
}
