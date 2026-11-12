import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../environments/environment';
import { Customer, CustomerRow, CustomerSave, ProductRow, ServerRow, SiteRequest, SiteRequestRow, TenantDetail, TenantPrefill, TenantRow, TenantSave, WebsiteSettings } from './models';

@Injectable({ providedIn: 'root' })
export class ConsoleApi
{
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl;

    products(): Promise<ProductRow[]>
    {
        return firstValueFrom(this.http.get<ProductRow[]>(`${this.base}/products`));
    }

    customers(search = ''): Promise<CustomerRow[]>
    {
        return firstValueFrom(this.http.get<CustomerRow[]>(`${this.base}/customers`, { params: new HttpParams().set('search', search) }));
    }

    customer(publicId: string): Promise<Customer>
    {
        return firstValueFrom(this.http.get<Customer>(`${this.base}/customers/${publicId}`));
    }

    createCustomer(body: CustomerSave): Promise<{ PublicId: string; CustomerCode: string }>
    {
        return firstValueFrom(this.http.post<{ PublicId: string; CustomerCode: string }>(`${this.base}/customers`, body));
    }

    updateCustomer(publicId: string, body: CustomerSave): Promise<void>
    {
        return firstValueFrom(this.http.put<void>(`${this.base}/customers/${publicId}`, body));
    }

    tenants(filter: { product?: string; status?: string; search?: string } = {}): Promise<TenantRow[]>
    {
        let params = new HttpParams();

        for (const [key, value] of Object.entries(filter))
        {
            if (value)
            {
                params = params.set(key, value);
            }
        }

        return firstValueFrom(this.http.get<TenantRow[]>(`${this.base}/tenants`, { params }));
    }

    tenant(publicId: string): Promise<TenantDetail>
    {
        return firstValueFrom(this.http.get<TenantDetail>(`${this.base}/tenants/${publicId}`));
    }

    createTenant(body: TenantSave): Promise<{ PublicId: string; TenantCode: string }>
    {
        return firstValueFrom(this.http.post<{ PublicId: string; TenantCode: string }>(`${this.base}/tenants`, body));
    }

    updateTenant(publicId: string, body: TenantSave): Promise<void>
    {
        return firstValueFrom(this.http.put<void>(`${this.base}/tenants/${publicId}`, body));
    }

    changeTenantStatus(publicId: string, status: string, reason: string): Promise<void>
    {
        return firstValueFrom(this.http.put<void>(`${this.base}/tenants/${publicId}/status`, { status, reason }));
    }

    servers(): Promise<ServerRow[]>
    {
        return firstValueFrom(this.http.get<ServerRow[]>(`${this.base}/tenants/servers`));
    }

    // ---------------- website requests ----------------

    requests(): Promise<SiteRequestRow[]>
    {
        return firstValueFrom(this.http.get<SiteRequestRow[]>(`${this.base}/requests`));
    }

    requestNewCount(): Promise<{ Count: number }>
    {
        return firstValueFrom(this.http.get<{ Count: number }>(`${this.base}/requests/new-count`));
    }

    request(publicId: string): Promise<SiteRequest>
    {
        return firstValueFrom(this.http.get<SiteRequest>(`${this.base}/requests/${publicId}`));
    }

    updateRequest(publicId: string, status: string, staffNotes: string | null): Promise<void>
    {
        return firstValueFrom(this.http.put<void>(`${this.base}/requests/${publicId}`, { Status: status, StaffNotes: staffNotes }));
    }

    convertRequest(publicId: string): Promise<TenantPrefill>
    {
        return firstValueFrom(this.http.post<TenantPrefill>(`${this.base}/requests/${publicId}/convert`, {}));
    }

    // ---------------- settings ----------------

    websiteSettings(): Promise<{ Settings: WebsiteSettings; Saved: boolean; ModifiedDate: string | null }>
    {
        return firstValueFrom(this.http.get<{ Settings: WebsiteSettings; Saved: boolean; ModifiedDate: string | null }>(`${this.base}/settings/website`));
    }

    saveWebsiteSettings(settings: WebsiteSettings): Promise<{ ModifiedDate: string }>
    {
        return firstValueFrom(this.http.put<{ ModifiedDate: string }>(`${this.base}/settings/website`, settings));
    }
}
