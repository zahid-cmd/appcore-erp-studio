/* ============================================================
   Customer Files (hand-written page, no Code Sync)

   One record per chassis : the landing station of every
   customer after a sale. Tabs :
     File Register   the files (opening files typed here :
                     CF-OPEN-0001; invoice files come from
                     Sales Invoice - MB : <invoice no>/<line>)
     Name Transfer   transfers before registration
     Fees Collection fees through the Payment Desk (next stage)
============================================================ */

export type CustomerFilesTab =
    | 'FileRegister'
    | 'NameTransfer'
    | 'FeesCollection';

export type CustomerFileStatus =
    | 'Open'
    | 'ReadyForDelivery'
    | 'Delivered'
    | 'Cancelled';


export const CUSTOMER_FILE_STATUS_LABELS:
    Record<CustomerFileStatus, string> =
{
    Open:'Open',
    ReadyForDelivery:'Ready for Delivery',
    Delivered:'Delivered',
    Cancelled:'Cancelled'
};


// Dot colour of a status in the list
export const CUSTOMER_FILE_STATUS_DOTS:
    Record<CustomerFileStatus, string> =
{
    Open:'#2563eb',
    ReadyForDelivery:'#d97706',
    Delivered:'#16a34a',
    Cancelled:'#94a3b8'
};


export interface CustomerFile
{
    CustomerFileId:number;
    PublicId:string;
    CustomerFileNo:string;
    // Invoice / Opening
    Source:string;
    // yyyy-MM-dd
    FileDate:string;
    BranchId:number;
    BranchName:string;
    SalesInvoiceNo:string;
    SalesInvoiceDate:string;
    SalesmanName:string;
    MotorBikeId:number;
    BikeName:string;
    ChassisNo:string;
    EngineNo:string;
    // Fuel / Electric
    VehiclePower:string;
    OriginalCustomerId:number;
    OriginalCustomerName:string;
    CurrentCustomerId:number;
    CurrentCustomerName:string;
    CurrentCustomerPhone:string;
    CurrentCustomerNid:string;
    // Dealer / Customer
    RegistrationBy:string;
    RegistrationFileNo:string;
    TransferCount:number;
    FileReadyDate:string;
    CollectedDate:string;
    Status:CustomerFileStatus;
    Remarks:string;
}


export interface CustomerFileTransfer
{
    NameTransferId:number;
    PublicId:string;
    TransferNo:string;
    CustomerFileId:number;
    CustomerFilePublicId:string;
    CustomerFileNo:string;
    ChassisNo:string;
    TransferDate:string;
    FromCustomerId:number;
    FromCustomerName:string;
    ToCustomerId:number;
    ToCustomerName:string;
    FeeAmount:number;
    // 'NTD-001,NTD-003'
    DocumentCodes:string;
    Remarks:string;
    IsLatest:boolean;
}


export interface CustomerFilesPage
{
    Files:CustomerFile[];
    Transfers:CustomerFileTransfer[];
    Today:string;
}


export interface CustomerFileLookupItem
{
    Id:number;
    Code:string;
    Name:string;
    // Bikes : Fuel / Electric; customers : phone;
    // documents : Required / Optional
    Extra:string;
}


export interface CustomerFilesDefaults
{
    NextOpeningNo:string;
    NextTransferNo:string;
    Bikes:CustomerFileLookupItem[];
    Customers:CustomerFileLookupItem[];
    TransferDocuments:CustomerFileLookupItem[];
}


export interface NameTransferQuote
{
    Allowed:boolean;
    Message:string;
    TransfersAllowed:number;
    TransfersMade:number;
    FeePerTransfer:number;
    PolicyCode:string;
}


export interface SaveOpeningFile
{
    FileDate:string;
    SalesInvoiceNo:string;
    SalesInvoiceDate:string;
    SalesmanName:string;
    MotorBikeId:number;
    ChassisNo:string;
    EngineNo:string;
    CustomerId:number;
    RegistrationBy:string;
    Remarks:string;
}


export interface SetCustomerFileStatus
{
    Status:CustomerFileStatus;
    // yyyy-MM-dd (ready / collected date)
    Date:string;
}


export interface SaveNameTransfer
{
    CustomerFilePublicId:string;
    TransferDate:string;
    ToCustomerId:number;
    DocumentCodes:string[];
    Remarks:string;
}
