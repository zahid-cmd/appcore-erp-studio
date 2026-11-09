/* ============================================================
   CKD Documents Status (hand-written page, no Code Sync)

   Inventory Management > Inventory Status. CKD documents = the
   distributor's import document set of a chassis (BRTA
   registration and the customer file). One row per chassis :
     Unit  a bike on record (purchase, receiving, opening stock)
     File  an opening customer file without a bike record
   Status : Yes (in hand / on the portal) / No (default).
============================================================ */

export type CkdStatus =
    | 'Yes'
    | 'No';

export type CkdRowKind =
    | 'Unit'
    | 'File';


export interface CkdDocumentRow
{
    Kind:CkdRowKind;
    // MotorBikeUnitId (Unit) or CustomerFileId (File)
    Id:number;
    // File rows : the customer file's PublicId
    PublicId:string;
    ChassisNo:string;
    EngineNo:string;
    ProductName:string;
    // Purchase / Opening Stock / Opening File
    Source:string;
    SourceNo:string;
    BranchId:number;
    BranchName:string;
    WarehouseName:string;
    StockStatus:string;
    // yyyy-MM-dd
    StockInDate:string;
    CustomerFileNo:string;
    CustomerName:string;
    CkdStatus:CkdStatus;
    CkdCheckedDate:string;
    CkdCheckedByName:string;
    CkdRemarks:string;
    // Year of manufacture (BRTA Form-17); null = not known
    ManufactureYear:number | null;
}


export interface CkdDocumentsPage
{
    Rows:CkdDocumentRow[];
    Today:string;
}


export interface SetCkdStatus
{
    CkdStatus:CkdStatus;
    Remarks:string;
    // Year of manufacture : null = unchanged
    ManufactureYear?:number | null;
}
