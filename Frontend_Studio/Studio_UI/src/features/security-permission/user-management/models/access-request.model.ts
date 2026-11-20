//===============================================================
// Access Requests (2026-11-20)
//===============================================================

export type AccessRequestStatus =
    'Pending' | 'Approved' | 'Rejected' | 'All';

export interface AccessRequestItem
{
    publicId: string;
    userName: string;
    displayName: string;
    fullName: string;
    email: string;
    mobileNo: string;
    userPhotoPath: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    requestedDate: string;
    decidedByName: string;
    decidedDate: string | null;
    decisionNote: string;
}

export interface AccessRequestList
{
    canDecide: boolean;
    pending: number;
    approved: number;
    rejected: number;
    items: AccessRequestItem[];
}

export interface AccessRequestOption
{
    id: number;
    code: string;
    name: string;
}

export interface AccessRequestOptions
{
    roles: AccessRequestOption[];
    branches: AccessRequestOption[];
}
