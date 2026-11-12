//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Business Promotions : Promotional Offers repository (one for
// the three channels : SalesCenter / ServiceCenter /
// AccessoryShop)
//===============================================================

public interface IPromotionalOffersRepository
{
    Task<List<PromotionalOfferListItemDto>> GetAllAsync(string channel);

    // One page of the list + summary counts
    Task<PagedResult<PromotionalOfferListItemDto>> GetPagedAsync(string channel, PromotionalOfferPageRequest request);

    Task<long?> GetIdAsync(string channel, Guid publicId);

    // The most recently deleted offer; false = nothing to restore
    Task<bool> RestoreAsync(string channel, long userId);

    Task<PromotionalOfferDto?> GetAsync(string channel, Guid publicId);

    Task<PromotionalOfferDefaultsDto> GetDefaultsAsync(string channel);

    // Service Center / Accessory Shop products (part no / name)
    Task<List<PromotionalOfferOptionDto>> SearchProductsAsync(string channel, string? search);

    Task<PromotionalOfferSavedDto> CreateAsync(string channel, SavePromotionalOfferDto dto, long userId);

    Task<PromotionalOfferSavedDto> UpdateAsync(string channel, Guid publicId, SavePromotionalOfferDto dto, long userId);

    Task ActivateAsync(string channel, Guid publicId, long userId);

    Task CloseAsync(string channel, Guid publicId, PromotionalOfferReasonDto dto, long userId);

    Task CancelAsync(string channel, Guid publicId, PromotionalOfferReasonDto dto, long userId);

    Task DeleteAsync(string channel, Guid publicId, long userId);
}
