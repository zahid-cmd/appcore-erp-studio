//===============================================================
// Public Website : repository interface
//===============================================================

namespace AppCore.Application.Public.Website;


public interface IPublicWebsiteRepository
{
    Task<PublicWebsiteDto> GetAsync();

    // A brand's parts catalogue (by Brand Code)
    Task<List<PublicPartDto>> GetPartsAsync(string brandCode);
}
