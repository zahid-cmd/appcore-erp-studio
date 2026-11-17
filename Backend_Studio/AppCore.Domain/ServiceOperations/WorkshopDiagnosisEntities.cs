//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : observations and diagnoses (ServiceOperations_
// Diagnosis_Engine.sql; hand-written pages, no Code Sync).
//
// WorkshopObservations         OBS-0001 : a problem seen on a bike or
//                              told by the customer ("Engine noise")
// WorkshopDiagnoses            DGN-0001 : what was found ("Clutch
//                              plate worn"); it can belong to one
//                              observation
// WorkshopDiagnosisItems       the labour and the parts a diagnosis
//                              suggests (LineType Service / Part)
// ServiceEstimateObservations  the observations of an estimate, each
//                              with its diagnosis and a note
//===============================================================

public class WorkshopObservations
{
    public long WorkshopObservationId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // The default observation : one only. A new job card and a new
    // estimate start with it.
    public bool IsDefault { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class WorkshopDiagnoses
{
    public long WorkshopDiagnosisId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The observation it explains (null : any observation)
    public long? WorkshopObservationId { get; set; }

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

public class WorkshopDiagnosisItems
{
    public long WorkshopDiagnosisItemId { get; set; }

    public long WorkshopDiagnosisId { get; set; }

    public int LineNo { get; set; }

    // Service (labour) / Part
    public string LineType { get; set; } = string.Empty;

    // Service : Scheduled / LaborChart / Customized / Membership.
    // Part : SparePart / Accessory
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;
}

public class ServiceEstimateObservations
{
    public long ServiceEstimateObservationId { get; set; }

    public long ServiceEstimateId { get; set; }

    public int LineNo { get; set; }

    public long? WorkshopObservationId { get; set; }

    public string Observation { get; set; } = string.Empty;

    public long? WorkshopDiagnosisId { get; set; }

    public string Diagnosis { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}
