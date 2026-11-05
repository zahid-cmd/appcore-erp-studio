//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// SparePart Fitments ("Fits models")
//
// The item lives in ONE sub category (its home : stock, price,
// ledgers); each row here is another sub category (model) of the
// same Product Category it also fits. Information only.
//===============================================================

public class SparePartFitments
{
    public long SparePartFitmentId { get; set; }

    public long SparePartId { get; set; }

    public long ProductSubCategoryId { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}
