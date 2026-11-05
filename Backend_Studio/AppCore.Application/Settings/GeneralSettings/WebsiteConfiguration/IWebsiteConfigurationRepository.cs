//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Settings.GeneralSettings.WebsiteConfiguration.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Website Configuration Repository Interface
//===============================================================

public interface IWebsiteConfigurationRepository
{
    // The configuration with every brand and branch (defaults
    // when nothing is saved yet)
    Task<WebsiteConfigurationDto> GetAsync();

    // Saves everything in one transaction (creates the row on
    // the first save). InvalidOperationException = bad input.
    Task SaveAsync(
        WebsiteConfigurationDto dto,
        long userId,
        string userName);

    Task<List<ActivityHistoryDto>> GetHistoryAsync();

    // Reads the pin from a Google Maps link (short share links are
    // followed). null = not a Google Maps link, or unreadable.
    Task<WebsiteMapPinDto?> ResolveMapAsync(
        string link);
}
