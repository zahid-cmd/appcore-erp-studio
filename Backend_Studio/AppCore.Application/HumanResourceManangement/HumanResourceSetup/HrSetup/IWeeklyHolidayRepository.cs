//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// The weekly holiday (hand-written page) : one record
//===============================================================

public interface IWeeklyHolidayRepository
{
    Task<WeeklyHolidayDto> GetAsync();

    // Changes the one record (makes it when there is none yet)
    Task<WeeklyHolidayDto> SaveAsync(WeeklyHolidayDto dto, long userId);
}
