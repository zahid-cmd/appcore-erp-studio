//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : the list of outside works (hand-written,
// 2026-11-17; NEVER run Code Sync; table made by
// ServiceOperations_Outside_Works.sql)
//
// WorkshopOutsideWorks   OW-0001 : a work done outside the workshop,
//                        with its usual charge to the customer.
//                        Picked on the estimate and the job card.
//===============================================================

public class WorkshopOutsideWorks
{
    public long WorkshopOutsideWorkId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The usual charge to the customer
    public decimal Rate { get; set; }

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
