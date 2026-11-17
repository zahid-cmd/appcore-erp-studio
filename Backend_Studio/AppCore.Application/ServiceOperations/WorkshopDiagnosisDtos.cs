//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations : observations (the problems of a bike) and
// diagnoses (what was found). Listed in Workshop Configuration,
// used on the service estimate.
//===============================================================

public class WorkshopObservationDto
{
    public long WorkshopObservationId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // The default one (one only) : a new job card and a new estimate
    // start with it
    public bool IsDefault { get; set; }
}

// A labour or a part a diagnosis suggests
public class WorkshopDiagnosisItemDto
{
    // Service / Part
    public string LineType { get; set; } = string.Empty;

    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;
}

public class WorkshopDiagnosisDto
{
    public long WorkshopDiagnosisId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The observation it explains (null : any)
    public long? WorkshopObservationId { get; set; }

    public string ObservationName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<WorkshopDiagnosisItemDto> Items { get; set; } = new();
}

// Workshop Configuration : the two lists and what a diagnosis can
// suggest
public class WorkshopDiagnosisSetupDto
{
    public List<WorkshopObservationDto> Observations { get; set; } = new();

    public List<WorkshopDiagnosisDto> Diagnoses { get; set; } = new();

    public string NextObservationCode { get; set; } = string.Empty;

    public string NextDiagnosisCode { get; set; } = string.Empty;

    public List<ServiceItemOptionDto> ServiceItems { get; set; } = new();

    public List<PartOptionDto> Parts { get; set; } = new();
}

// The estimate form : the active lists
public class EstimateObservationListsDto
{
    public List<WorkshopObservationDto> Observations { get; set; } = new();

    public List<WorkshopDiagnosisDto> Diagnoses { get; set; } = new();

    // Switch : a picked diagnosis puts its labour and parts on the
    // estimate
    public bool Suggest { get; set; }

    // The user has the page action Add Observation
    public bool CanAdd { get; set; }
}

// A new observation or diagnosis typed on the estimate
public class QuickObservationDto
{
    public string Name { get; set; } = string.Empty;

    // A diagnosis : the observation it explains
    public long? WorkshopObservationId { get; set; }
}

// An observation of an estimate
public class ServiceEstimateObservationDto
{
    public long? WorkshopObservationId { get; set; }

    public string Observation { get; set; } = string.Empty;

    public long? WorkshopDiagnosisId { get; set; }

    public string Diagnosis { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}


public interface IWorkshopDiagnosisRepository
{
    Task<WorkshopDiagnosisSetupDto> GetSetupAsync();

    Task<WorkshopObservationDto> SaveObservationAsync(Guid? publicId, WorkshopObservationDto dto, long userId);

    Task DeleteObservationAsync(Guid publicId, long userId);

    Task<WorkshopDiagnosisDto> SaveDiagnosisAsync(Guid? publicId, WorkshopDiagnosisDto dto, long userId);

    Task DeleteDiagnosisAsync(Guid publicId, long userId);

    // The estimate form
    Task<EstimateObservationListsDto> GetListsAsync(bool canAdd);

    // Typed on the estimate : made when the list does not have it,
    // the one of the list otherwise
    Task<WorkshopObservationDto> QuickObservationAsync(QuickObservationDto dto, long userId);

    Task<WorkshopDiagnosisDto> QuickDiagnosisAsync(QuickObservationDto dto, long userId);
}
