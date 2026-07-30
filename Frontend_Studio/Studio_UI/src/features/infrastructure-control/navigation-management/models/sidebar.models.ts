/* ============================================================
   SIDEBAR SUBMENU
============================================================ */

export interface SidebarSubmenu
{
    id: number;

    code: string;

    title: string;

    icon: string;

    route: string;

    active: boolean;
}

/* ============================================================
   SIDEBAR MENU
============================================================ */

export interface SidebarMenu
{
    id: number;

    code: string;

    title: string;

    icon: string;

    expanded: boolean;

    submenus: SidebarSubmenu[];
}

/* ============================================================
   SIDEBAR MODULE
============================================================ */

export interface SidebarModule
{
    id: number;

    code: string;

    title: string;

    icon: string;

    expanded: boolean;

    menus: SidebarMenu[];
}