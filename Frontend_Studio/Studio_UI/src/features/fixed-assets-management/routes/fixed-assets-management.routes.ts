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
            {
                path:'depreciation-of-fixed-assets',
                data:{ breadcrumb:'Depreciation of Fixed Assets' },
                children:page('Depreciation of Fixed Assets', () => import('../pages/depreciation-of-fixed-assets/depreciation-of-fixed-assets').then(m => m.DepreciationOfFixedAssetsPage))
            },
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
    // Asset Register
    //===========================================================

    {
        path:'asset-register',

        data:
        {
            breadcrumb:'Asset Register'
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
            }
        ]
    },

    //===========================================================
    // Depreciation
    //===========================================================

    {
        path:'depreciation',

        data:
        {
            breadcrumb:'Depreciation'
        },

        children:
        [
            {
                path:'depreciation-runs',
                data:{ breadcrumb:'Depreciation Runs' },
                children:page('Depreciation Runs', () => import('../pages/depreciation-runs/depreciation-runs').then(m => m.DepreciationRunsPage))
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
            {
                path:'asset-verification',
                data:{ breadcrumb:'Asset Verification' },
                children:page('Asset Verification', () => import('../pages/asset-verification/asset-verification').then(m => m.AssetVerificationPage))
            }
        ]
    }
];
