//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient,
    HttpParams
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../environments/environment';

import
{
    FreeServiceClaim,
    FreeServiceClaimLine,
    FreeServiceClaimLookups,
    JobCard,
    JobCardBike,
    JobCardMotorBike,
    AssignJobCardSimple,
    OutsourcedParts,
    OutsourcingJobs,
    SaveOutsourcedPart,
    WorkshopOutsideWork,
    WorkshopOutsideWorksSetup,
    JobCardLookups,
    JobRequirement,
    SaveJobRequirement,
    PartsBackOrder,
    PartsDocument,
    PartsKind,
    PartsLookups,
    PartsOption,
    PartsStock,
    Mis,
    LocationChart,
    MisLookups,
    PostMis,
    PostPartsIssue,
    PostPartsReturn,
    PostJobReturns,
    ReturnLookups,
    PostServiceReturn,
    SaveServiceInvoice,
    ClosingLookups,
    ClosingDetail,
    ServiceInvoice,
    ServiceInvoiceLookups,
    ServiceReturn,
    SavePartsRequisition,
    SaveJobCard,
    SaveServiceEstimate,
    ServiceEstimate,
    ServiceEstimateLookups,
    WorkshopBay,
    WorkshopChecklistItem,
    WorkshopDiagnosis,
    WorkshopDiagnosisSetup,
    WorkshopObservation,
    EstimateObservationLists,
    WorkshopDashboard,
    WorkshopSetup,
    WorkshopSwitches,
    WorkshopTechnician,
    WS_BILLING_PAGES,
    WS_PARTS_PAGES,
    WsLedger,
    WsPartOption,
    WsReport,
    CollectEstimateCharge,
    WsCustomerOption
}
from './ws.models';


//===============================================================
// Service Operations, the workshop : the one service of Workshop
// Configuration and Job Cards (api/service-operations). The API
// answers in camelCase : everything is turned into the PascalCase
// of ws.models.ts, to any depth. Bodies are sent as the models are.
//
// Errors : error?.error?.message holds the reason.
//===============================================================

// camelCase -> PascalCase, to any depth
function pascal(value: any): any
{
    if (Array.isArray(value))
    {
        return value.map(pascal);
    }

    if (value !== null && typeof value === 'object')
    {
        const row: Record<string, any> = {};

        for (const key of Object.keys(value))
        {
            row[key.charAt(0).toUpperCase() + key.slice(1)] = pascal(value[key]);
        }

        return row;
    }

    return value;
}

export interface WsHistoryItem
{
    title: string;
    description: string;
    user: string;
    dateTime: string;
    badge: string;
}

@Injectable(
{
    providedIn:'root'
})
export class WsService
{
    private readonly http =
        inject(HttpClient);

    private readonly base =
        `${environment.apiUrl}/service-operations`;

    private readonly setup =
        'service-setup/workshop-configuration';

    private readonly cards =
        'workshop-management/job-cards';

    private readonly estimates =
        'workshop-management/service-estimates';

    private get<T>(path: string, params?: HttpParams): Observable<T>
    {
        return this.http.get<any>(`${this.base}/${path}`, { params }).pipe(map(x => pascal(x) as T));
    }

    private post<T>(path: string, body: any): Observable<T>
    {
        return this.http.post<any>(`${this.base}/${path}`, body ?? {}).pipe(map(x => pascal(x) as T));
    }

    private put<T>(path: string, body: any): Observable<T>
    {
        return this.http.put<any>(`${this.base}/${path}`, body ?? {}).pipe(map(x => pascal(x) as T));
    }

    private remove<T = void>(path: string): Observable<T>
    {
        return this.http.delete<any>(`${this.base}/${path}`).pipe(map(x => pascal(x) as T));
    }

    // The activity history of a page, as the history drawer wants it.
    // page : 'workshop-management/job-cards' ...
    getHistory(page: string): Observable<WsHistoryItem[]>
    {
        return this.http
            .get<any[]>(`${this.base}/${page}/history`)
            .pipe(
                map(items =>
                    (Array.isArray(items) ? items : []).map(h => ({
                        title:h.ActivityTitle ?? h.activityTitle ?? '',
                        description:h.ActivityDescription ?? h.activityDescription ?? '',
                        user:h.PerformedByName ?? h.performedByName ?? 'System',
                        dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                        badge:h.ActivityType ?? h.activityType ?? ''
                    }))));
    }

    //===========================================================
    // Workshop Configuration
    //===========================================================

    getSetup(): Observable<WorkshopSetup>
    {
        return this.get<WorkshopSetup>(this.setup);
    }

    // publicId '' : a new one
    saveBay(publicId: string, body: Partial<WorkshopBay>): Observable<WorkshopBay>
    {
        return publicId
            ? this.put<WorkshopBay>(`${this.setup}/bays/${publicId}`, body)
            : this.post<WorkshopBay>(`${this.setup}/bays`, body);
    }

    // "Bay n" ... after the highest bay number of the service
    // center : all or nothing
    createBays(bays: { BranchId: number; Remarks: string }[]): Observable<WorkshopBay[]>
    {
        return this.post<WorkshopBay[]>(`${this.setup}/bays/generate`, { Bays:bays });
    }

    deleteBay(publicId: string): Observable<void>
    {
        return this.remove(`${this.setup}/bays/${publicId}`);
    }

    saveTechnician(publicId: string, body: Partial<WorkshopTechnician>): Observable<WorkshopTechnician>
    {
        return publicId
            ? this.put<WorkshopTechnician>(`${this.setup}/technicians/${publicId}`, body)
            : this.post<WorkshopTechnician>(`${this.setup}/technicians`, body);
    }

    deleteTechnician(publicId: string): Observable<void>
    {
        return this.remove(`${this.setup}/technicians/${publicId}`);
    }

    saveChecklistItem(publicId: string, body: Partial<WorkshopChecklistItem>): Observable<WorkshopChecklistItem>
    {
        return publicId
            ? this.put<WorkshopChecklistItem>(`${this.setup}/checklist/${publicId}`, body)
            : this.post<WorkshopChecklistItem>(`${this.setup}/checklist`, body);
    }

    deleteChecklistItem(publicId: string): Observable<void>
    {
        return this.remove(`${this.setup}/checklist/${publicId}`);
    }

    saveSwitches(body: WorkshopSwitches): Observable<void>
    {
        return this.put<void>(`${this.setup}/switches`, body);
    }

    // Observations and diagnoses (tabs of Workshop Configuration)
    getDiagnosisSetup(): Observable<WorkshopDiagnosisSetup>
    {
        return this.get<WorkshopDiagnosisSetup>(`${this.setup}/diagnosis`);
    }

    saveObservation(publicId: string, body: Partial<WorkshopObservation>): Observable<WorkshopObservation>
    {
        return publicId
            ? this.put<WorkshopObservation>(`${this.setup}/diagnosis/observations/${publicId}`, body)
            : this.post<WorkshopObservation>(`${this.setup}/diagnosis/observations`, body);
    }

    deleteObservation(publicId: string): Observable<void>
    {
        return this.remove(`${this.setup}/diagnosis/observations/${publicId}`);
    }

    // The list of outside works (tab of Workshop Configuration)
    getOutsideWorksSetup(): Observable<WorkshopOutsideWorksSetup>
    {
        return this.get<WorkshopOutsideWorksSetup>(`${this.setup}/outside-works`);
    }

    saveOutsideWork(publicId: string, body: Partial<WorkshopOutsideWork>): Observable<WorkshopOutsideWork>
    {
        return publicId
            ? this.put<WorkshopOutsideWork>(`${this.setup}/outside-works/${publicId}`, body)
            : this.post<WorkshopOutsideWork>(`${this.setup}/outside-works`, body);
    }

    deleteOutsideWork(publicId: string): Observable<void>
    {
        return this.remove(`${this.setup}/outside-works/${publicId}`);
    }

    // The active outside works, to pick on the estimate or the job card
    getOutsideWorks(page: 'estimate' | 'card'): Observable<WorkshopOutsideWork[]>
    {
        return this.get<WorkshopOutsideWork[]>(`${page === 'estimate' ? this.estimates : this.cards}/outside-works`);
    }

    saveDiagnosis(publicId: string, body: Partial<WorkshopDiagnosis>): Observable<WorkshopDiagnosis>
    {
        return publicId
            ? this.put<WorkshopDiagnosis>(`${this.setup}/diagnosis/diagnoses/${publicId}`, body)
            : this.post<WorkshopDiagnosis>(`${this.setup}/diagnosis/diagnoses`, body);
    }

    deleteDiagnosis(publicId: string): Observable<void>
    {
        return this.remove(`${this.setup}/diagnosis/diagnoses/${publicId}`);
    }

    //===========================================================
    // Job Cards
    //===========================================================

    getJobCardLookups(): Observable<JobCardLookups>
    {
        return this.get<JobCardLookups>(`${this.cards}/lookups`);
    }

    // The parts of the business lines the service center runs
    // (Business Configuration)
    getParts(branchId: number): Observable<WsPartOption[]>
    {
        return this.get<WsPartOption[]>(`${this.cards}/parts`, new HttpParams().set('branchId', String(branchId)));
    }

    // By chassis / engine / registration no, mobile or customer name
    // (3 letters at least)
    // The page Job Outsourcing (its own permissions) : the jobs in
    // work, the works and the parts to pick from, the entries of a job
    private readonly outsourcing =
        'workshop-management/job-outsourcing';

    getOutsourcingJobs(): Observable<OutsourcingJobs>
    {
        return this.get<OutsourcingJobs>(`${this.outsourcing}/jobs`);
    }

    getOutsourcingWorks(): Observable<WorkshopOutsideWork[]>
    {
        return this.get<WorkshopOutsideWork[]>(`${this.outsourcing}/outside-works`);
    }

    getOutsourcingParts(branchId: number): Observable<WsPartOption[]>
    {
        return this.get<WsPartOption[]>(`${this.outsourcing}/parts`, new HttpParams().set('branchId', String(branchId)));
    }

    getJobOutsourcing(jobCardPublicId: string): Observable<OutsourcedParts>
    {
        return this.get<OutsourcedParts>(`${this.outsourcing}/${jobCardPublicId}`);
    }

    // saved and posted at once (Dr Workshop WIP, Cr the vendor)
    addJobOutsourcing(jobCardPublicId: string, body: SaveOutsourcedPart): Observable<OutsourcedParts>
    {
        return this.post<OutsourcedParts>(`${this.outsourcing}/${jobCardPublicId}`, body);
    }

    cancelJobOutsourcing(jobCardPublicId: string, publicId: string, reason: string): Observable<OutsourcedParts>
    {
        return this.put<OutsourcedParts>(`${this.outsourcing}/${jobCardPublicId}/${publicId}/cancel`, { Reason:reason });
    }

    // Parts Outsourcing : the parts bought outside for a job card
    getOutsourcedParts(jobCardPublicId: string): Observable<OutsourcedParts>
    {
        return this.get<OutsourcedParts>(`${this.cards}/${jobCardPublicId}/outsourced-parts`);
    }

    // saved and posted at once (Dr Workshop WIP, Cr the vendor)
    addOutsourcedPart(jobCardPublicId: string, body: SaveOutsourcedPart): Observable<OutsourcedParts>
    {
        return this.post<OutsourcedParts>(`${this.cards}/${jobCardPublicId}/outsourced-parts`, body);
    }

    cancelOutsourcedPart(jobCardPublicId: string, publicId: string, reason: string): Observable<OutsourcedParts>
    {
        return this.put<OutsourcedParts>(`${this.cards}/${jobCardPublicId}/outsourced-parts/${publicId}/cancel`, { Reason:reason });
    }

    // New Job page : a bike we do not sell joins the workshop's list
    addServiceBike(body: { BrandManagementId: number; ModelName: string; ColorManagementId: number }): Observable<JobCardMotorBike>
    {
        return this.post<JobCardMotorBike>(`${this.cards}/service-bikes`, body);
    }

    findBikes(find: string): Observable<JobCardBike[]>
    {
        return this.get<JobCardBike[]>(`${this.cards}/bikes`, new HttpParams().set('find', find));
    }

    getJobCards(): Observable<JobCard[]>
    {
        return this.get<JobCard[]>(this.cards);
    }

    getJobCard(publicId: string): Observable<JobCard>
    {
        return this.get<JobCard>(`${this.cards}/${publicId}`);
    }

    // A new job card, not saved yet, with the customer, the bike, the
    // labour and the parts of an estimate
    getJobCardFromEstimate(estimatePublicId: string): Observable<JobCard>
    {
        return this.get<JobCard>(`${this.cards}/from-estimate/${estimatePublicId}`);
    }

    // publicId '' : a new one
    saveJobCard(publicId: string, body: SaveJobCard): Observable<JobCard>
    {
        return publicId
            ? this.put<JobCard>(`${this.cards}/${publicId}`, body)
            : this.post<JobCard>(this.cards, body);
    }

    // Job Card Assignment : the service engineer, the bay and the
    // technicians (the first : the lead)
    assignJobCard(publicId: string, engineerId: number, bayId: number, technicianIds: number[], note: string): Observable<JobCard>
    {
        return this.put<JobCard>(
            `${this.cards}/${publicId}/assignment`,
            { ServiceEngineerEmployeeId:engineerId, WorkshopBayId:bayId, TechnicianIds:technicianIds, Note:note });
    }

    // The Assignment page
    assignJobCardSimple(publicId: string, body: AssignJobCardSimple): Observable<JobCard>
    {
        return this.put<JobCard>(`${this.cards}/${publicId}/assignment`, body);
    }

    // Job Card Requirements : the parts and the service charges of
    // an assigned job (saving makes it Allocated)
    getJobRequirement(publicId: string): Observable<JobRequirement>
    {
        return this.get<JobRequirement>(`${this.cards}/${publicId}/requirement`);
    }

    saveJobRequirement(publicId: string, body: SaveJobRequirement): Observable<JobRequirement>
    {
        return this.put<JobRequirement>(`${this.cards}/${publicId}/requirement`, body);
    }

    changeJobCardStatus(publicId: string, status: string, note: string): Observable<JobCard>
    {
        return this.put<JobCard>(`${this.cards}/${publicId}/status`, { Status:status, Note:note });
    }

    startWork(publicId: string, technicianId: number, bayId: number | null, workNote: string): Observable<JobCard>
    {
        return this.post<JobCard>(
            `${this.cards}/${publicId}/work`,
            { WorkshopTechnicianId:technicianId, WorkshopBayId:bayId, WorkNote:workNote });
    }

    stopWork(publicId: string, workEntryId: number): Observable<JobCard>
    {
        return this.put<JobCard>(`${this.cards}/${publicId}/work/${workEntryId}/stop`, {});
    }

    deleteWork(publicId: string, workEntryId: number): Observable<JobCard>
    {
        return this.remove<JobCard>(`${this.cards}/${publicId}/work/${workEntryId}`);
    }

    deleteJobCard(publicId: string): Observable<void>
    {
        return this.remove(`${this.cards}/${publicId}`);
    }

    // { Message } : "JC-000003 restored."
    restoreJobCard(): Observable<{ Code: string; Message: string }>
    {
        return this.put<{ Code: string; Message: string }>(`${this.cards}/restore`, {});
    }


    //===========================================================
    // Service Estimates
    //===========================================================

    getEstimateLookups(): Observable<ServiceEstimateLookups>
    {
        return this.get<ServiceEstimateLookups>(`${this.estimates}/lookups`);
    }

    // The parts of the business lines the service center runs
    // (Business Configuration)
    getEstimateParts(branchId: number): Observable<WsPartOption[]>
    {
        return this.get<WsPartOption[]>(`${this.estimates}/parts`, new HttpParams().set('branchId', String(branchId)));
    }

    // The active observations and diagnoses, the switch and whether
    // the user may add one (page action Add Observation)
    getEstimateObservationLists(): Observable<EstimateObservationLists>
    {
        return this.get<EstimateObservationLists>(`${this.estimates}/observation-lists`);
    }

    // A new observation typed on the estimate (the one of the list
    // when the list has it already)
    addEstimateObservation(name: string): Observable<WorkshopObservation>
    {
        return this.post<WorkshopObservation>(`${this.estimates}/observations`, { Name:name });
    }

    addEstimateDiagnosis(name: string, observationId: number | null): Observable<WorkshopDiagnosis>
    {
        return this.post<WorkshopDiagnosis>(`${this.estimates}/diagnoses`, { Name:name, WorkshopObservationId:observationId });
    }

    // A new estimate, not saved yet, with the lines of the job card
    // The number a new estimate of the service center would get
    getEstimateNextNo(branchId: number, date: string): Observable<{ EstimateNo: string }>
    {
        return this.get<{ EstimateNo: string }>(
            `${this.estimates}/next-no`,
            new HttpParams().set('branchId', String(branchId)).set('date', date ?? ''));
    }

    // The Estimate Charge is collected (Cash / Bank / MFS lines)
    collectEstimateCharge(publicId: string, body: CollectEstimateCharge): Observable<ServiceEstimate>
    {
        return this.post<ServiceEstimate>(`${this.estimates}/${publicId}/collect-charge`, body);
    }

    // Active customers of the customer profiles
    getCustomers(): Observable<WsCustomerOption[]>
    {
        return this.http
            .get<any[]>(`${environment.apiUrl}/settings/client-settings/customer-profiles`)
            .pipe(
                map(x =>
                    (pascal(Array.isArray(x) ? x : []) as any[])
                        .filter(c => c?.IsActive !== false && !!c?.CustomerId)
                        .map(c => ({
                            CustomerId:Number(c.CustomerId),
                            CustomerCode:String(c.CustomerCode ?? ''),
                            Name:String(c.CustomerName ?? c.DisplayName ?? ''),
                            Mobile:String(c.Phone1 ?? '')
                        }))));
    }

    getEstimates(): Observable<ServiceEstimate[]>
    {
        return this.get<ServiceEstimate[]>(this.estimates);
    }

    getEstimate(publicId: string): Observable<ServiceEstimate>
    {
        return this.get<ServiceEstimate>(`${this.estimates}/${publicId}`);
    }

    // publicId '' : a new one
    saveEstimate(publicId: string, body: SaveServiceEstimate): Observable<ServiceEstimate>
    {
        return publicId
            ? this.put<ServiceEstimate>(`${this.estimates}/${publicId}`, body)
            : this.post<ServiceEstimate>(this.estimates, body);
    }

    // Sent / Approved / Rejected
    changeEstimateStatus(publicId: string, status: string, note: string): Observable<ServiceEstimate>
    {
        return this.put<ServiceEstimate>(`${this.estimates}/${publicId}/status`, { Status:status, Note:note });
    }

    // The new version (a Draft) comes back
    reviseEstimate(publicId: string): Observable<ServiceEstimate>
    {
        return this.post<ServiceEstimate>(`${this.estimates}/${publicId}/revise`, {});
    }

    deleteEstimate(publicId: string): Observable<void>
    {
        return this.remove(`${this.estimates}/${publicId}`);
    }

    restoreEstimate(): Observable<{ Code: string; Message: string }>
    {
        return this.put<{ Code: string; Message: string }>(`${this.estimates}/restore`, {});
    }


    //===========================================================
    // Parts Requisitions, Parts Issues, Parts Returns, Parts
    // Back-Orders
    //===========================================================

    getPartsLookups(kind: PartsKind): Observable<PartsLookups>
    {
        return this.get<PartsLookups>(`${WS_PARTS_PAGES[kind]}/lookups`);
    }

    // Spare parts, lubricants and accessories to pick : the ones of
    // the business lines the service center runs
    getPartsCatalogue(kind: PartsKind, branchId: number): Observable<WsPartOption[]>
    {
        return this.get<WsPartOption[]>(`${WS_PARTS_PAGES[kind]}/parts`, new HttpParams().set('branchId', String(branchId)));
    }

    // The heads only
    getPartsDocuments(kind: PartsKind): Observable<PartsDocument[]>
    {
        return this.get<PartsDocument[]>(WS_PARTS_PAGES[kind]);
    }

    getPartsDocument(kind: PartsKind, publicId: string): Observable<PartsDocument>
    {
        return this.get<PartsDocument>(`${WS_PARTS_PAGES[kind]}/${publicId}`);
    }

    // A new requisition, not saved yet, with the parts of the job card
    getRequisitionDraft(jobCardPublicId: string): Observable<PartsDocument>
    {
        return this.get<PartsDocument>(`${WS_PARTS_PAGES.requisition}/draft/${jobCardPublicId}`);
    }

    // publicId '' : a new one
    saveRequisition(publicId: string, body: SavePartsRequisition): Observable<PartsDocument>
    {
        return publicId
            ? this.put<PartsDocument>(`${WS_PARTS_PAGES.requisition}/${publicId}`, body)
            : this.post<PartsDocument>(WS_PARTS_PAGES.requisition, body);
    }

    // Cancelled / Closed
    changeRequisitionStatus(publicId: string, status: string): Observable<PartsDocument>
    {
        return this.put<PartsDocument>(`${WS_PARTS_PAGES.requisition}/${publicId}/status`, { Status:status });
    }

    // What a warehouse holds now
    getPartsStock(warehouseId: number): Observable<PartsStock[]>
    {
        return this.get<PartsStock[]>(`${WS_PARTS_PAGES.issue}/stock/${warehouseId}`);
    }

    // The requisition an issue is made for, with its lines
    getIssueRequisition(publicId: string): Observable<PartsDocument>
    {
        return this.get<PartsDocument>(`${WS_PARTS_PAGES.issue}/requisition/${publicId}`);
    }

    // Material Issue Slips (MIS) : the page Parts Issues
    getMisList(): Observable<Mis[]>
    {
        return this.get<Mis[]>(`${WS_PARTS_PAGES.issue}/mis`);
    }

    getMisLookups(): Observable<MisLookups>
    {
        return this.get<MisLookups>(`${WS_PARTS_PAGES.issue}/mis/lookups`);
    }

    // publicId : the first issue of the slip
    getMis(publicId: string): Observable<Mis>
    {
        return this.get<Mis>(`${WS_PARTS_PAGES.issue}/mis/${publicId}`);
    }

    // Location Chart : the rack, shelf and bin of the parts of a job
    getLocationChart(jobCardPublicId: string): Observable<LocationChart>
    {
        return this.get<LocationChart>(`${WS_PARTS_PAGES.issue}/location-chart/${jobCardPublicId}`);
    }

    postMis(body: PostMis): Observable<Mis>
    {
        return this.post<Mis>(`${WS_PARTS_PAGES.issue}/mis`, body);
    }

    postPartsIssue(body: PostPartsIssue): Observable<PartsDocument>
    {
        return this.post<PartsDocument>(WS_PARTS_PAGES.issue, body);
    }

    // The issue a return is made of, with its lines
    getReturnIssue(publicId: string): Observable<PartsDocument>
    {
        return this.get<PartsDocument>(`${WS_PARTS_PAGES.return}/issue/${publicId}`);
    }

    postPartsReturn(body: PostPartsReturn): Observable<PartsDocument>
    {
        return this.post<PartsDocument>(WS_PARTS_PAGES.return, body);
    }

    // Parts Return by job : the jobs with parts on them
    getReturnJobs(): Observable<ReturnLookups>
    {
        return this.get<ReturnLookups>(`${WS_PARTS_PAGES.return}/jobs`);
    }

    // a return (its own number) a parts issue it touches
    postJobReturns(body: PostJobReturns): Observable<PartsDocument[]>
    {
        return this.post<PartsDocument[]>(`${WS_PARTS_PAGES.return}/by-job`, body);
    }

    getPartsBackOrders(): Observable<PartsBackOrder[]>
    {
        return this.get<PartsBackOrder[]>('workshop-management/parts-back-orders');
    }


    //===========================================================
    // Service Invoices, Service Returns, Free Service Claims
    //===========================================================

    getInvoiceLookups(): Observable<ServiceInvoiceLookups>
    {
        return this.get<ServiceInvoiceLookups>(`${WS_BILLING_PAGES.invoices}/lookups`);
    }

    // The heads only
    getInvoices(): Observable<ServiceInvoice[]>
    {
        return this.get<ServiceInvoice[]>(WS_BILLING_PAGES.invoices);
    }

    getInvoice(publicId: string): Observable<ServiceInvoice>
    {
        return this.get<ServiceInvoice>(`${WS_BILLING_PAGES.invoices}/${publicId}`);
    }

    // The figures of a job card as an invoice, nothing saved
    priceInvoice(body: SaveServiceInvoice): Observable<ServiceInvoice>
    {
        return this.post<ServiceInvoice>(`${WS_BILLING_PAGES.invoices}/price`, body);
    }

    postInvoice(body: SaveServiceInvoice): Observable<ServiceInvoice>
    {
        return this.post<ServiceInvoice>(WS_BILLING_PAGES.invoices, body);
    }

    deliverInvoice(publicId: string): Observable<ServiceInvoice>
    {
        return this.put<ServiceInvoice>(`${WS_BILLING_PAGES.invoices}/${publicId}/deliver`, {});
    }

    //-----------------------------------------------------------
    // Job Closing : the job is priced and billed, no money
    //-----------------------------------------------------------

    getClosingLookups(): Observable<ClosingLookups>
    {
        return this.get<ClosingLookups>(`${WS_BILLING_PAGES.closing}/lookups`);
    }

    // the bills (the heads only)
    getClosedJobs(): Observable<ServiceInvoice[]>
    {
        return this.get<ServiceInvoice[]>(WS_BILLING_PAGES.closing);
    }

    // The whole job before it is closed : the job card, its parts,
    // the issues, the returns, the complaints and observations
    getClosingJob(publicId: string): Observable<ClosingDetail>
    {
        return this.get<ClosingDetail>(`${WS_BILLING_PAGES.closing}/job/${publicId}`);
    }

    // The bill of a job as it will be posted, nothing saved
    priceClosing(body: SaveServiceInvoice): Observable<ServiceInvoice>
    {
        return this.post<ServiceInvoice>(`${WS_BILLING_PAGES.closing}/price`, body);
    }

    postClosing(body: SaveServiceInvoice): Observable<ServiceInvoice>
    {
        return this.post<ServiceInvoice>(WS_BILLING_PAGES.closing, body);
    }

    getServiceReturns(): Observable<ServiceReturn[]>
    {
        return this.get<ServiceReturn[]>(WS_BILLING_PAGES.returns);
    }

    getServiceReturn(publicId: string): Observable<ServiceReturn>
    {
        return this.get<ServiceReturn>(`${WS_BILLING_PAGES.returns}/${publicId}`);
    }

    // Posted invoices to pick on the return form
    getReturnableInvoices(): Observable<PartsOption[]>
    {
        return this.get<PartsOption[]>(`${WS_BILLING_PAGES.returns}/invoices`);
    }

    getReturnInvoice(publicId: string): Observable<ServiceInvoice>
    {
        return this.get<ServiceInvoice>(`${WS_BILLING_PAGES.returns}/invoice/${publicId}`);
    }

    postServiceReturn(body: PostServiceReturn): Observable<ServiceReturn>
    {
        return this.post<ServiceReturn>(WS_BILLING_PAGES.returns, body);
    }

    getClaimLookups(): Observable<FreeServiceClaimLookups>
    {
        return this.get<FreeServiceClaimLookups>(`${WS_BILLING_PAGES.claims}/lookups`);
    }

    // The free services of a brand that are on no claim yet
    getClaimOpenLines(brandId: number): Observable<FreeServiceClaimLine[]>
    {
        return this.get<FreeServiceClaimLine[]>(`${WS_BILLING_PAGES.claims}/lines/${brandId}`);
    }

    getClaims(): Observable<FreeServiceClaim[]>
    {
        return this.get<FreeServiceClaim[]>(WS_BILLING_PAGES.claims);
    }

    getClaim(publicId: string): Observable<FreeServiceClaim>
    {
        return this.get<FreeServiceClaim>(`${WS_BILLING_PAGES.claims}/${publicId}`);
    }

    createClaim(body: { BrandManagementId: number; ClaimDate: string; Remarks: string; LineIds: number[] }): Observable<FreeServiceClaim>
    {
        return this.post<FreeServiceClaim>(WS_BILLING_PAGES.claims, body);
    }

    settleClaim(publicId: string, body: { SettledDate: string; LedgerCode: string; LedgerName: string; Reference: string }): Observable<FreeServiceClaim>
    {
        return this.put<FreeServiceClaim>(`${WS_BILLING_PAGES.claims}/${publicId}/settle`, body);
    }

    cancelClaim(publicId: string): Observable<FreeServiceClaim>
    {
        return this.put<FreeServiceClaim>(`${WS_BILLING_PAGES.claims}/${publicId}/cancel`, {});
    }

    // The active ledgers of the chart of accounts (the money accounts
    // a collection goes to)
    getLedgers(): Observable<WsLedger[]>
    {
        return this.http
            .get<any[]>(`${environment.apiUrl}/platform/accounting/ledgers`, { params:new HttpParams().set('activeOnly', 'true') })
            .pipe(map(x => pascal(Array.isArray(x) ? x : []) as WsLedger[]));
    }


    //===========================================================
    // Workshop Dashboard and Service Reports (read-only)
    //===========================================================

    getDashboard(branchId: number | null): Observable<WorkshopDashboard>
    {
        return this.get<WorkshopDashboard>(
            'workshop-management/workshop-dashboard',
            branchId ? new HttpParams().set('branchId', String(branchId)) : undefined);
    }

    // report : service-history, job-card-register,
    // technician-performance, parts-consumption, service-due-list.
    // '' dates : the period the server chooses
    getReport(report: string, from: string, to: string, branchId: number | null, text: string): Observable<WsReport>
    {
        let params = new HttpParams();

        if (from)
        {
            params = params.set('from', from);
        }

        if (to)
        {
            params = params.set('to', to);
        }

        if (branchId)
        {
            params = params.set('branchId', String(branchId));
        }

        if (text)
        {
            params = params.set('text', text);
        }

        return this.get<WsReport>(`service-reports/${report}`, params);
    }
}
