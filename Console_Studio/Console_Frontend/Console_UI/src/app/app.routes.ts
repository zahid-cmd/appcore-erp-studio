import { Routes } from '@angular/router';

import { authGuard, signedInGuard } from '../core/auth.guard';

export const routes: Routes =
[
    {
        path: 'login',
        loadComponent: () => import('../pages/login/login').then(m => m.LoginPage)
    },
    {
        path: 'change-password',
        canActivate: [signedInGuard],
        loadComponent: () => import('../pages/login/change-password').then(m => m.ChangePasswordPage)
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('../pages/shell/shell').then(m => m.ShellPage),
        children:
        [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', loadComponent: () => import('../pages/dashboard/dashboard').then(m => m.DashboardPage) },
            { path: 'customers', loadComponent: () => import('../pages/customers/customers').then(m => m.CustomersPage) },
            { path: 'customers/new', loadComponent: () => import('../pages/customers/customer-edit').then(m => m.CustomerEditPage) },
            { path: 'customers/:publicId/edit', loadComponent: () => import('../pages/customers/customer-edit').then(m => m.CustomerEditPage) },
            { path: 'tenants', loadComponent: () => import('../pages/tenants/tenants').then(m => m.TenantsPage) },
            { path: 'tenants/new', loadComponent: () => import('../pages/tenants/tenant-edit').then(m => m.TenantEditPage) },
            { path: 'tenants/:publicId/edit', loadComponent: () => import('../pages/tenants/tenant-edit').then(m => m.TenantEditPage) },
            { path: 'tenants/:publicId', loadComponent: () => import('../pages/tenants/tenant-detail').then(m => m.TenantDetailPage) },
            { path: 'requests/:publicId', loadComponent: () => import('../pages/requests/request-detail').then(m => m.RequestDetailPage) },
            { path: 'requests', loadComponent: () => import('../pages/requests/requests').then(m => m.RequestsPage) },
            { path: 'onboarding', loadComponent: () => import('../pages/onboarding/onboarding-guide').then(m => m.OnboardingGuidePage) },
            { path: 'settings/website', loadComponent: () => import('../pages/settings/website-settings').then(m => m.WebsiteSettingsPage) },
            { path: 'deployments', loadComponent: () => import('../pages/deployments/deployments').then(m => m.DeploymentsPage) }
        ]
    },
    { path: '**', redirectTo: '' }
];
