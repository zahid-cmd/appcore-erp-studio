//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations : the list of outside works (Workshop
// Configuration, tab Outside Works; picked on the estimate and the
// job card). Hand-written, 2026-11-17; NEVER run Code Sync.
//===============================================================

public class WorkshopOutsideWorkDto
{
    public long WorkshopOutsideWorkId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The usual charge to the customer
    public decimal Rate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


public class WorkshopOutsideWorksSetupDto
{
    public List<WorkshopOutsideWorkDto> OutsideWorks { get; set; } = new();

    public string NextCode { get; set; } = string.Empty;
}


public interface IWorkshopOutsideWorksRepository
{
    // Workshop Configuration : all of them and the next code
    Task<WorkshopOutsideWorksSetupDto> GetSetupAsync();

    // The estimate and the job card : the active ones
    Task<List<WorkshopOutsideWorkDto>> GetActiveAsync();

    Task<WorkshopOutsideWorkDto> SaveAsync(Guid? publicId, WorkshopOutsideWorkDto dto, long userId);

    Task DeleteAsync(Guid publicId, long userId);
}
