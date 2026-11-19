//===============================================================
// Menu Order (Settings > Application Configuration, 2026-11-20)
//
// The API answers in camelCase : these are the shapes the page
// uses after the service has read the answer.
//===============================================================

export interface MenuOrderPage
{
    id: number;
    name: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
    locked: boolean;
}

export interface MenuOrderMenu extends MenuOrderPage
{
    pages: MenuOrderPage[];
}

export interface MenuOrderModule extends MenuOrderPage
{
    menus: MenuOrderMenu[];
}

export interface MenuOrderTree
{
    canUpdate: boolean;
    modules: MenuOrderModule[];
}

export interface MenuOrderSaveItem
{
    Kind: 'module' | 'menu' | 'page';
    Id: number;
    DisplayOrder: number;
    IsActive: boolean;
}
