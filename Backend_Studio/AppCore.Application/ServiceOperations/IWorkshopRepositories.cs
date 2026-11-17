//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations, the workshop : repositories
//===============================================================

// Workshop Configuration : bays, technicians, the check-in
// checklist and the switches
public interface IWorkshopSetupRepository
{
    Task<WorkshopSetupDto> GetSetupAsync();

    Task<WorkshopBayDto> SaveBayAsync(Guid? publicId, WorkshopBayDto dto, long userId);

    // All or nothing : "Bay n" ... for a service center
    Task<List<WorkshopBayDto>> CreateBaysAsync(WorkshopBaysCreateDto dto, long userId);

    Task DeleteBayAsync(Guid publicId, long userId);

    Task<WorkshopTechnicianDto> SaveTechnicianAsync(Guid? publicId, WorkshopTechnicianDto dto, long userId);

    Task DeleteTechnicianAsync(Guid publicId, long userId);

    Task<WorkshopChecklistItemDto> SaveChecklistItemAsync(Guid? publicId, WorkshopChecklistItemDto dto, long userId);

    Task DeleteChecklistItemAsync(Guid publicId, long userId);

    Task<WorkshopSwitchesDto> GetSwitchesAsync();

    Task SaveSwitchesAsync(WorkshopSwitchesDto dto, long userId);
}

// Job Cards
public interface IJobCardsRepository
{
    Task<JobCardLookupsDto> GetLookupsAsync();

    // Spare parts and accessories with price and stock
    // branchId : only the parts of the business lines the service
    // center runs (Business Configuration); null : every part
    Task<List<PartOptionDto>> GetPartsAsync(long? branchId = null);

    // Bikes by chassis / engine / registration no, mobile or customer
    // name (Service Vehicles first, then bikes of earlier job cards)
    Task<List<JobCardBikeDto>> FindBikesAsync(string? find);

    // New Job page : a bike we do not sell (brand + typed model +
    // colour) joins the workshop's own list; the one already there
    // is answered when it is the same
    Task<JobCardMotorBikeDto> AddServiceBikeAsync(SaveServiceBikeDto dto, long userId);

    // A new job card, not saved yet, with the customer, the bike,
    // the labour and the parts of an estimate
    Task<JobCardDto> GetFromEstimateAsync(Guid estimatePublicId);

    // The heads only
    Task<List<JobCardDto>> GetAllAsync();

    // With its lines, work, checklist and status history
    Task<JobCardDto> GetAsync(Guid publicId);

    Task<JobCardDto> SaveAsync(Guid? publicId, SaveJobCardDto dto, long userId);

    // The status of a card (the stage rules of the controller)
    Task<string> GetStatusAsync(Guid publicId);

    // Job Card Assignment : the service engineer, the bay and the
    // technicians. An Open card becomes Assigned.
    Task<JobCardDto> AssignAsync(Guid publicId, AssignJobCardDto dto, long userId);

    Task<JobCardDto> ChangeStatusAsync(Guid publicId, JobCardStatusChangeDto dto, long userId);

    // A technician starts on the job now
    Task<JobCardDto> StartWorkAsync(Guid publicId, StartJobCardWorkDto dto, long userId);

    Task<JobCardDto> StopWorkAsync(Guid publicId, long workEntryId, long userId);

    Task<JobCardDto> DeleteWorkAsync(Guid publicId, long workEntryId, long userId);

    // An Open job card nobody worked on
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted job card comes back (its number;
    // null : none deleted)
    Task<string?> RestoreAsync(long userId);
}


// Service Estimates : made for a customer and a bike; a job card
// can be made from one
public interface IServiceEstimatesRepository
{
    Task<ServiceEstimateLookupsDto> GetLookupsAsync();

    // Spare parts and accessories with price and stock
    // branchId : only the parts of the business lines the service
    // center runs (Business Configuration); null : every part
    Task<List<PartOptionDto>> GetPartsAsync(long? branchId = null);

    // The number a new estimate of the service center would get
    // (nothing is taken)
    Task<string> PeekNoAsync(long branchId, string? date);

    // The Estimate Charge is collected : its journal and a Receipt
    // Voucher are posted
    Task<ServiceEstimateDto> CollectChargeAsync(Guid publicId, CollectEstimateChargeDto dto, long userId);

    // The heads only
    Task<List<ServiceEstimateDto>> GetAllAsync();

    Task<ServiceEstimateDto> GetAsync(Guid publicId);

    // A new estimate, or a Draft
    Task<ServiceEstimateDto> SaveAsync(Guid? publicId, SaveServiceEstimateDto dto, long userId);

    // Draft -> Sent -> Approved / Rejected
    Task<ServiceEstimateDto> ChangeStatusAsync(Guid publicId, ServiceEstimateStatusChangeDto dto, long userId);

    // The estimate becomes Revised; the new Draft version comes back
    Task<ServiceEstimateDto> ReviseAsync(Guid publicId, long userId);

    // A Draft that is not a revision
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted estimate comes back (its number;
    // null : none deleted)
    Task<string?> RestoreAsync(long userId);
}


// Parts Requisitions, Parts Issues, Parts Returns, Parts Back-
// Orders : the stock and the Workshop WIP of the job cards
public interface IWorkshopPartsRepository
{
    Task<PartsLookupsDto> GetLookupsAsync();

    // What a warehouse holds now, item by item
    Task<List<PartsStockDto>> GetStockAsync(long warehouseId);

    //-----------------------------------------------------------
    // Requisitions
    //-----------------------------------------------------------

    Task<List<PartsDocumentDto>> GetRequisitionsAsync();

    Task<PartsDocumentDto> GetRequisitionAsync(Guid publicId);

    // A new requisition, not saved yet, with the parts of the job
    // card nobody asked for yet
    Task<PartsDocumentDto> GetRequisitionDraftAsync(Guid jobCardPublicId);

    // A new requisition, or an Open one
    Task<PartsDocumentDto> SaveRequisitionAsync(Guid? publicId, SavePartsRequisitionDto dto, long userId);

    // Open -> Cancelled; Partly Issued -> Closed
    Task<PartsDocumentDto> ChangeRequisitionStatusAsync(Guid publicId, PartsStatusChangeDto dto, long userId);

    //-----------------------------------------------------------
    // Issues (posted at once : stock out, Dr WIP / Cr inventory)
    //-----------------------------------------------------------

    Task<List<PartsDocumentDto>> GetIssuesAsync();

    Task<PartsDocumentDto> GetIssueAsync(Guid publicId);

    Task<PartsDocumentDto> PostIssueAsync(PostPartsIssueDto dto, long userId);

    //-----------------------------------------------------------
    // Returns (posted at once : stock in, Dr inventory / Cr WIP)
    //-----------------------------------------------------------

    Task<List<PartsDocumentDto>> GetReturnsAsync();

    Task<PartsDocumentDto> GetReturnAsync(Guid publicId);

    Task<PartsDocumentDto> PostReturnAsync(PostPartsReturnDto dto, long userId);

    // Requisition lines the service center has not enough stock for
    Task<List<PartsBackOrderDto>> GetBackOrdersAsync();
}


//===============================================================
// Service Invoices and Service Returns
//===============================================================

public interface IServiceInvoicesRepository
{
    Task<ServiceInvoiceLookupsDto> GetLookupsAsync(bool canCredit);

    Task<List<ServiceInvoiceDto>> GetAllAsync();

    Task<ServiceInvoiceDto> GetAsync(Guid publicId);

    // The figures of a job card as an invoice, nothing saved
    Task<ServiceInvoiceDto> PriceAsync(SaveServiceInvoiceDto dto, bool canCredit);

    // Posted at once : journal, VAT register, receipt voucher
    Task<ServiceInvoiceDto> PostAsync(SaveServiceInvoiceDto dto, bool canCredit, long userId);

    Task<ServiceInvoiceDto> DeliverAsync(Guid publicId, long userId);

    Task<List<ServiceReturnDto>> GetReturnsAsync();

    Task<ServiceReturnDto> GetReturnAsync(Guid publicId);

    // Posted invoices to pick on the return form
    Task<List<PartsOptionDto>> GetReturnableAsync();

    Task<ServiceReturnDto> PostReturnAsync(PostServiceReturnDto dto, long userId);
}


//===============================================================
// Free Service Claims
//===============================================================

public interface IFreeServiceClaimsRepository
{
    Task<FreeServiceClaimLookupsDto> GetLookupsAsync();

    Task<List<FreeServiceClaimLineDto>> GetOpenLinesAsync(long brandManagementId);

    Task<List<FreeServiceClaimDto>> GetAllAsync();

    Task<FreeServiceClaimDto> GetAsync(Guid publicId);

    Task<FreeServiceClaimDto> CreateAsync(SaveFreeServiceClaimDto dto, long userId);

    Task<FreeServiceClaimDto> CancelAsync(Guid publicId, long userId);

    Task<FreeServiceClaimDto> SettleAsync(Guid publicId, SettleFreeServiceClaimDto dto, long userId);
}


//===============================================================
// Workshop Dashboard and Service Reports (read-only)
//===============================================================

public interface IWorkshopReportsRepository
{
    Task<WorkshopDashboardDto> GetDashboardAsync(long? branchId);

    // report : service-history, job-card-register,
    // technician-performance, parts-consumption, service-due-list
    Task<WsReportDto> GetReportAsync(string report, string? from, string? to, long? branchId, string? text);
}
