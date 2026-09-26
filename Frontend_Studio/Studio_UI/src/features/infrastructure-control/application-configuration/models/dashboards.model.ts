/* ============================================================
   Dashboards
============================================================ */

export interface Dashboards
{
    id:
        number;

    code:
        string;

    name:
        string;

    dashboardKey:
        string;

    dashboardType:
        string;

    roleProfileId:
        number | null;

    roleProfileName:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Create Dashboards
============================================================ */

export interface CreateDashboards
{
    name:
        string;

    dashboardKey:
        string;

    dashboardType:
        string;

    roleProfileId:
        number | null;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Update Dashboards
============================================================ */

export interface UpdateDashboards
{
    id:
        number;

    name:
        string;

    dashboardKey:
        string;

    dashboardType:
        string;

    roleProfileId:
        number | null;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Dashboards Defaults
============================================================ */

export interface DashboardsDefaults
{
    code:
        string;
}