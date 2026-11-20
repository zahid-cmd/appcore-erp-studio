import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { TenantDetail, TenantPrefill } from '../../core/models';
import { PageHeader } from '../../ui/page-header';
import { ToastService } from '../../ui/toast';
import { TenantFormComponent } from './tenant-form';

// Register a tenant (/tenants/new) or edit one (/tenants/:publicId/edit) as a full page (2026-11-20)
@Component({
    selector: 'ac-tenant-edit',
    imports: [RouterLink, PageHeader, TenantFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    template: `
        <ac-page-header icon="fas fa-server"
            [eyebrow]="publicId() ? 'Tenant ' + (t()?.TenantCode ?? '') : 'Clients'"
            [title]="publicId() ? 'Edit tenant' : 'Register a tenant'"
            [subtitle]="publicId() ? (t()?.DisplayName ?? 'One moment...') : 'One per customer and product : its own database and web address'">
            <a pageHeaderRight class="ac-btn" [routerLink]="backLink()"><i class="fas fa-arrow-left"></i> {{ publicId() ? 'Tenant' : 'Tenants' }}</a>
        </ac-page-header>

        @if (error())
        {
            <div class="ac-error">{{ error() }}</div>
        }
        @else if (!publicId() || t())
        {
            <ac-tenant-form [tenant]="t()" [prefill]="prefill" [asPage]="true" (closed)="done($event)" />
        }
    `
})
export class TenantEditPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    // from the route (withComponentInputBinding); empty for a new tenant
    readonly publicId = input<string>();

    readonly t = signal<TenantDetail | null>(null);
    readonly error = signal('');

    // filled in from a converted website request (Requests > Convert to customer)
    readonly prefill: TenantPrefill | null = (history.state?.prefill as TenantPrefill | undefined) ?? null;

    ngOnInit(): void
    {
        const id = this.publicId();

        if (id)
        {
            this.api.tenant(id).then(t => this.t.set(t), e => this.error.set(apiMessage(e)));
        }
    }

    backLink(): string[]
    {
        const id = this.publicId();

        return id ? ['/tenants', id] : ['/tenants'];
    }

    done(saved: boolean): void
    {
        if (saved)
        {
            this.toast.success(this.publicId() ? 'Tenant saved' : 'Tenant registered');
        }

        void this.router.navigate(this.backLink());
    }
}
