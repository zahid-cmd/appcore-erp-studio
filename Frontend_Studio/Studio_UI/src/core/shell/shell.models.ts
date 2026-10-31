//===============================================================
// App Shell Models
// --------------------------------------------------------------
// Shapes used by the top bar, sidebar, sidebar footer and
// app footer. The *Dto types match api/platform/shell/*.
//===============================================================


//===============================================================
// Page Index
// --------------------------------------------------------------
// One entry per page (sidebar submenu) the user can open.
// Built from the sidebar the moment it loads, so page search,
// favorites and recent pages all use the same list.
//===============================================================

export interface ShellPage
{
    submenuId:
        number;

    code:
        string;

    title:
        string;

    icon:
        string;

    route:
        string;

    moduleTitle:
        string;

    menuTitle:
        string;

    path:
        string;      // "Module › Menu"
}


//===============================================================
// Favorites  (database, per user)
//===============================================================

export interface ShellFavoriteDto
{
    submenuId:
        number;

    code:
        string;

    name:
        string;

    icon:
        string;

    route:
        string;

    menuName:
        string;

    moduleName:
        string;

    sortOrder:
        number;
}


//===============================================================
// Recent Pages  (browser, per user, last 10)
//===============================================================

export interface ShellRecentPage
{
    submenuId:
        number;

    title:
        string;

    route:
        string;

    path:
        string;

    visitedAt:
        number;      // epoch ms
}


//===============================================================
// Notifications
//===============================================================

export type ShellNotificationKind =
    'approval'
    |
    'cheque';


export interface ShellNotificationDto
{
    key:
        string;

    kind:
        ShellNotificationKind;

    title:
        string;

    detail:
        string;

    route:
        string;

    date:
        string;
}


export interface ShellNotification
extends ShellNotificationDto
{
    isRead:
        boolean;
}


//===============================================================
// Context  (business date and financial year)
//===============================================================

export interface ShellContextDto
{
    today:
        string;      // yyyy-MM-dd (Asia/Dhaka)

    financialYearCode:
        string | null;

    financialYearName:
        string | null;

    yearStatus:
        string | null;
}


//===============================================================
// Server Health
//===============================================================

export type ShellServerState =
    'checking'
    |
    'online'
    |
    'degraded'
    |
    'offline';


export interface ShellServerStatus
{
    state:
        ShellServerState;

    responseMs:
        number | null;

    checkedAt:
        number | null;
}


//===============================================================
// Search Result
//===============================================================

export interface ShellTextPart
{
    text:
        string;

    hit:
        boolean;
}


export interface ShellSearchResult
{
    page:
        ShellPage;

    group:
        string;

    titleParts:
        ShellTextPart[];

    badge:
        string;
}


//===============================================================
// Sidebar Footer Panel
//===============================================================

export type ShellPanelTab =
    'favorites'
    |
    'recent';


//===============================================================
// Layout and Appearance (per user, in this browser)
//===============================================================

export type ShellLayoutMode =
    'side'      // sidebar (default)
    |
    'top';      // modules bar under the top bar


export type ShellAppearance =
    'deep'      // navy top bar, sidebar and footer (default)
    |
    'light';    // white / light-blue top bar, sidebar and footer
