//===============================================================
// Attendance Management routes (hand-written pages : NEVER run
// Code Sync for them). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   daily-attendance      list / add / edit/:id / view/:id
//                         (the sheet : By Month or By Day)
//   leave-applications    list / add / edit/:id / view/:id
//   monthly-attendance    the month of a branch
//===============================================================

import
{
    Routes
}
from '@angular/router';

const dailySheet =
    () =>
        import('../pages/daily-attendance/daily-attendance')
            .then(m => m.DailyAttendancePage);

const leaveList =
    () =>
        import('../pages/leave-applications/list/leave-applications-list')
            .then(m => m.LeaveApplicationsList);

const leaveForm =
    () =>
        import('../pages/leave-applications/form/leave-applications-form')
            .then(m => m.LeaveApplicationsForm);

export const AttendanceManagementRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            {
                path:'daily-attendance',
                data:{ breadcrumb:'Daily Attendance' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Daily Attendance' },
                        loadComponent:() =>
                            import('../pages/daily-attendance/list/daily-attendance-list')
                                .then(m => m.DailyAttendanceList)
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Add Attendance' },
                        loadComponent:dailySheet
                    },
                    // :id = <employee id>-<yyyy>-<MM>
                    {
                        path:'edit/:id',
                        data:{ breadcrumb:'Edit Attendance' },
                        loadComponent:dailySheet
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Attendance' },
                        loadComponent:dailySheet
                    }
                ]
            },
            {
                path:'monthly-attendance',
                data:{ breadcrumb:'Monthly Attendance' },
                loadComponent:() =>
                    import('../pages/monthly-attendance/monthly-attendance')
                        .then(m => m.MonthlyAttendancePage)
            },
            {
                path:'leave-applications',
                data:{ breadcrumb:'Leave Applications' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Leave Applications' },
                        loadComponent:leaveList
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Add Leave Application' },
                        loadComponent:leaveForm
                    },
                    {
                        path:'edit/:id',
                        data:{ breadcrumb:'Edit Leave Application' },
                        loadComponent:leaveForm
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Leave Application' },
                        loadComponent:leaveForm
                    }
                ]
            }
        ]
    }
];
