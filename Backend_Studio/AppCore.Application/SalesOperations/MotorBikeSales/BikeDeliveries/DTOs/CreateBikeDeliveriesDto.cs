//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries : Save (final) one sold bike's delivery
//
// The PDI answers follow the template of the bike's model, by
// section / item position (0-based); the server copies the
// template text into the delivery.
//===============================================================

public class SaveBikeDeliveryDto
{
    public long SalesInvoiceLineId { get; set; }

    // yyyy-MM-dd
    public string DeliveryDate { get; set; } = string.Empty;

    // Customer / Nominee
    public string ReceivedBy { get; set; } = "Customer";

    public string ReceiverName { get; set; } = string.Empty;

    public string ReceiverPhone { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // PDI : yyyy-MM-dd
    public string PdiDate { get; set; } = string.Empty;

    public string TechnicianName { get; set; } = string.Empty;

    public string ProblemsFound { get; set; } = string.Empty;

    public string PdiRemarks { get; set; } = string.Empty;

    public List<SaveBikeDeliveryAnswerDto> Answers { get; set; } = new();
}


public class SaveBikeDeliveryAnswerDto
{
    public int SectionIndex { get; set; }

    public int ItemIndex { get; set; }

    public string Answer { get; set; } = string.Empty;

    public string Remark { get; set; } = string.Empty;

    public string TechnicianComment { get; set; } = string.Empty;

    public string QcComment { get; set; } = string.Empty;
}
