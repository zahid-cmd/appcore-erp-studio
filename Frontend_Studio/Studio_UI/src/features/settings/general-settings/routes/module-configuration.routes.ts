//===============================================================
// Module Configuration routes (2026-11-20)
//===============================================================
//
// Every module keeps its own switches on a page "Configuration"
// in its setup menu :
//
//     /<module>/<setup menu>/configuration
//
// The page is the System Configurations page, locked to the
// module (route data configurationModule = the module's code).
// Nothing is stored anew : a switch already knows its module.
//
// In a module's routes file, BEFORE the setup menu's own route :
//
//     ...moduleConfigurationRoutes(
//         'sales-setup', 'Sales Setup', 'MOD-008', 'Sales Configuration'),
//
// The setup menu's other pages keep opening through the menu's
// own route that follows (the router goes on to it when the
// address is not .../configuration).
//
// The navigation rows (menu + page) come from
// Backend_Studio\Database\ModuleConfiguration_Navigation.sql.
// NEVER run Menu / Submenu / Code Sync for these pages.
//
//===============================================================

import
{
    Routes
}
from '@angular/router';


export function moduleConfigurationRoutes
(
    setupPath:
        string,

    setupName:
        string,

    moduleCode:
        string,

    title:
        string
):
    Routes
{
    return [
        {
            path:setupPath,

            data:
            {
                breadcrumb:setupName
            },

            children:
            [
                {
                    path:'configuration',

                    data:
                    {
                        breadcrumb:'Configuration',

                        configurationModule:moduleCode,

                        configurationTitle:title
                    },

                    loadComponent:() =>
                        import(
                            '../pages/system-configurations/list/system-configurations-list'
                        )
                        .then(
                            m =>
                                m.SystemConfigurationsList
                        )
                }
            ]
        }
    ];
}
