import { Routes } from '@angular/router';

export const routes: Routes =
[
    { path: '', loadComponent: () => import('../pages/home').then(m => m.HomePage), title: 'AppCore Technologies : business software for dealers, developers and firms' },
    { path: 'automobiles', loadComponent: () => import('../pages/product').then(m => m.ProductPage), data: { slug: 'automobiles' }, title: 'AppCore Automobiles : car and commercial vehicle dealer software' },
    { path: 'two-wheelers', loadComponent: () => import('../pages/product').then(m => m.ProductPage), data: { slug: 'two-wheelers' }, title: 'AppCore Two Wheelers : motorcycle and scooter dealer software' },
    { path: 'real-estate', loadComponent: () => import('../pages/product').then(m => m.ProductPage), data: { slug: 'real-estate' }, title: 'AppCore Real Estate : property development and sales software' },
    { path: 'consultancy', loadComponent: () => import('../pages/product').then(m => m.ProductPage), data: { slug: 'consultancy' }, title: 'AppCore Consultancy : practice management software' },
    { path: 'two-wheeler', redirectTo: 'two-wheelers' },
    { path: 'pricing', loadComponent: () => import('../pages/pricing').then(m => m.PricingPage), title: 'Pricing : AppCore Technologies' },
    { path: 'security', loadComponent: () => import('../pages/security').then(m => m.SecurityPage), title: 'Security & privacy : AppCore Technologies' },
    { path: 'about', loadComponent: () => import('../pages/about').then(m => m.AboutPage), title: 'About : AppCore Technologies' },
    { path: 'contact', loadComponent: () => import('../pages/contact').then(m => m.ContactPage), title: 'Contact : AppCore Technologies' },
    { path: 'request', loadComponent: () => import('../pages/request').then(m => m.RequestPage), title: 'Book a demo or buy : AppCore Technologies' },
    { path: '**', redirectTo: '' }
];
