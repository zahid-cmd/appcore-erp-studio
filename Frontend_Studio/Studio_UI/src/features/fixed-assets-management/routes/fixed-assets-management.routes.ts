//===============================================================
// Fixed Assets Management routes (hand-written module : NEVER run
// Module Sync / Menu Sync / Submenu Sync / Code Sync for it; the
// menus and pages are made by FixedAssets_Navigation.sql).
//
// /fixed-assets-management/<menu>/<page>/list | add | edit/:id |
// view/:id : every page is one component that reads its mode from
// the URL.
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    moduleConfigurationRoutes
}
from '../../settings/general-settings/routes/module-configuration.routes';

// The routes of a page : one component for every mode
function page(name: string, load: () => Promise<any>): Routes
{
    return [
        { path:'', redirectTo:'list', pathMatch:'full' },
        { path:'list', data:{ breadcrumb:name }, loadComponent:load },
        { path:'add', data:{ breadcrumb:`Add ${name}` }, loadComponent:load },
        { path:'edit/:id', data:{ breadcrumb:`Edit ${name}` }, loadComponent:load },
        { path:'view/:id', data:{ breadcrumb:`View ${name}` }, loadComponent:load }
    ];
}

export const fixedAssetsManagementRoutes:
    Routes =
[

    //===========================================================
    // Module Configuration (2026-11-20) : this module's switches.
    // Kept first : the setup menu's own route follows.
    //===========================================================

    ...moduleConfigurationRoutes(
        'asset-setup', 'Asset Setup', 'MOD-017', 'Fixed Assets Configuration'),

    //===========================================================
    // Asset Setup
    //===========================================================

    {
        path:'asset-setup',

        data:
        {
            breadcrumb:'Asset Setup'
        },

        children:
        [
            // the page was first called Asset Categories : an old menu
            // link still opens it
            { path:'asset-categories', redirectTo:'asset-groups', pathMatch:'prefix' },
            {
                path:'asset-groups',
                data:{ breadcrumb:'Asset Groups' },
                children:page('Asset Group', () => import('../pages/asset-groups/asset-groups').then(m => m.AssetGroupsPage))
            },
            // Depreciation of Fixed Assets moved to Depreciations >
            // Depreciation Setup (2026-11-15) : an old link still opens it
            { path:'depreciation-of-fixed-assets', redirectTo:'/fixed-assets-management/depreciation/depreciation-setup', pathMatch:'prefix' },
            {
                path:'asset-locations',
                data:{ breadcrumb:'Asset Locations' },
                children:page('Asset Locations', () => import('../pages/asset-locations/asset-locations').then(m => m.AssetLocationsPage))
            },
            {
                path:'asset-configuration',
                data:{ breadcrumb:'Asset Configuration' },
                children:page('Asset Configuration', () => import('../pages/asset-configuration/asset-configuration').then(m => m.AssetConfigurationPage))
            }
        ]
    },

    //===========================================================
    // Asset Control (was Asset Register; its route key stays
    // asset-register, 2026-11-15) : buying, the cards, the opening
    // assets and the physical count
    //===========================================================

    {
        path:'asset-register',

        data:
        {
            breadcrumb:'Asset Control'
        },

        children:
        [
            {
                path:'asset-acquisitions',
                data:{ breadcrumb:'Asset Acquisitions' },
                children:page('Asset Acquisitions', () => import('../pages/asset-acquisitions/asset-acquisitions').then(m => m.AssetAcquisitionsPage))
            },
            {
                path:'fixed-asset-register',
                data:{ breadcrumb:'Fixed Asset Register' },
                children:page('Fixed Asset Register', () => import('../pages/fixed-asset-register/fixed-asset-register').then(m => m.FixedAssetRegisterPage))
            },
            {
                path:'opening-assets',
                data:{ breadcrumb:'Opening Assets' },
                children:page('Opening Assets', () => import('../pages/opening-assets/opening-assets').then(m => m.OpeningAssetsPage))
            },
            {
                path:'asset-verification',
                data:{ breadcrumb:'Asset Verification' },
                children:page('Asset Verification', () => import('../pages/asset-verification/asset-verification').then(m => m.AssetVerificationPage))
            }
        ]
    },

    //===========================================================
    // Depreciations (2026-11-15 : Depreciation Setup moved here from
    // Asset Setup; Depreciation Runs renamed Charge Depreciation)
    //===========================================================

    {
        path:'depreciation',

        data:
        {
            breadcrumb:'Depreciations'
        },

        children:
        [
            {
                path:'depreciation-setup',
                data:{ breadcrumb:'Depreciation Setup' },
                children:page('Depreciation Setup', () => import('../pages/depreciation-of-fixed-assets/depreciation-of-fixed-assets').then(m => m.DepreciationOfFixedAssetsPage))
            },
            // the page was called Depreciation Runs : an old link still opens it
            { path:'depreciation-runs', redirectTo:'charge-depreciation', pathMatch:'prefix' },
            {
                path:'charge-depreciation',
                data:{ breadcrumb:'Charge Depreciation' },
                children:page('Charge Depreciation', () => import('../pages/depreciation-runs/depreciation-runs').then(m => m.DepreciationRunsPage))
            },
            {
                path:'depreciation-schedule',
                data:{ breadcrumb:'Depreciation Schedule' },
                children:page('Depreciation Schedule', () => import('../pages/depreciation-schedule/depreciation-schedule').then(m => m.DepreciationSchedulePage))
            }
        ]
    },

    //===========================================================
    // Asset Disposal
    //===========================================================

    {
        path:'asset-disposal',

        data:
        {
            breadcrumb:'Asset Disposal'
        },

        children:
        [
            {
                path:'asset-disposals',
                data:{ breadcrumb:'Asset Disposals' },
                children:page('Asset Disposals', () => import('../pages/asset-disposals/asset-disposals').then(m => m.AssetDisposalsPage))
            }
        ]
    },

    //===========================================================
    // Asset Reports
    //===========================================================

    {
        path:'asset-reports',

        data:
        {
            breadcrumb:'Asset Reports'
        },

        children:
        [
            {
                path:'fixed-asset-schedule',
                data:{ breadcrumb:'Fixed Asset Schedule' },
                children:page('Fixed Asset Schedule', () => import('../pages/fixed-asset-schedule/fixed-asset-schedule').then(m => m.FixedAssetSchedulePage))
            },
            {
                path:'asset-tags',
                data:{ breadcrumb:'Asset Tags' },
                children:page('Asset Tags', () => import('../pages/asset-tags/asset-tags').then(m => m.AssetTagsPage))
            },
            // Asset Verification moved to Asset Control (2026-11-15) :
            // an old link still opens it
            { path:'asset-verification', redirectTo:'/fixed-assets-management/asset-register/asset-verification', pathMatch:'prefix' }
        ]
    }
];
