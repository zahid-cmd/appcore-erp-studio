//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement;


//===============================================================
// Navigation Move References
//
// When a submenu moves to another menu, or a menu moves to
// another module, its code changes. Other tables keep that code
// (or the old module / menu Id) and must follow, otherwise the
// sidebar, permissions, page activities, switches and the
// synchronization pages keep pointing at the old place.
//
//   Submenu move :
//     INF_SubmenuSynchronization  SubmenuCode + module / menu labels
//     CodeSynchronizations        SubmenuCode + module / menu labels
//     SystemConfigurations        NavigationSubmenuCode, NavigationMenuCode,
//                                 NavigationModuleId
//     MasterActivityPages         NavigationSubmenuCode
//     ActivityAssignmentDetails   ModuleId, MenuId   (by SubMenuId)
//     SpecialAssignmentDetails    ModuleId, MenuId   (by SubMenuId)
//
//   Menu move (plus every submenu of it, as above) :
//     INF_MenuSynchronization     MenuCode + module labels
//     SystemConfigurations        menu-scope rows : NavigationMenuCode,
//                                 NavigationModuleId
//
// Tables that do not exist yet in a database are skipped. Runs
// inside the caller's transaction. Frontend route files are NOT
// moved here : the page's folder and route registration must
// move by hand (the caller's message says so).
//===============================================================

public static class NavigationMoveReferences
{
    //===========================================================
    // Table Exists
    //===========================================================

    private static async Task<bool> TableExistsAsync
    (
        AppDbContext context,
        string table
    )
    {
        string quoted =
            $"\"{table}\"";

        int found =
            await context.Database
                .SqlQuery<int>
                (
                    $"SELECT CASE WHEN to_regclass({quoted}) IS NULL THEN 0 ELSE 1 END AS \"Value\""
                )
                .SingleAsync();

        return found == 1;
    }


    //===========================================================
    // Submenu Moved
    //===========================================================

    public static async Task SubmenuMovedAsync
    (
        AppDbContext context,
        long submenuId,
        string oldCode,
        string newCode,
        long moduleId,
        string moduleCode,
        string moduleName,
        long menuId,
        string menuCode,
        string menuName
    )
    {
        if
        (
            await TableExistsAsync(
                context,
                "INF_SubmenuSynchronization")
        )
        {
            await context.Database.ExecuteSqlInterpolatedAsync
            ($@"UPDATE ""INF_SubmenuSynchronization""
                SET    ""SubmenuCode"" = {newCode},
                       ""ModuleId"" = {moduleId}, ""ModuleCode"" = {moduleCode}, ""ModuleName"" = {moduleName},
                       ""MenuId"" = {menuId}, ""MenuCode"" = {menuCode}, ""MenuName"" = {menuName}
                WHERE  ""SubmenuId"" = {submenuId}");
        }

        if
        (
            await TableExistsAsync(
                context,
                "CodeSynchronizations")
        )
        {
            await context.Database.ExecuteSqlInterpolatedAsync
            ($@"UPDATE ""CodeSynchronizations""
                SET    ""SubmenuCode"" = {newCode},
                       ""ModuleId"" = {moduleId}, ""ModuleCode"" = {moduleCode}, ""ModuleName"" = {moduleName},
                       ""MenuId"" = {menuId}, ""MenuCode"" = {menuCode}, ""MenuName"" = {menuName}
                WHERE  ""SubmenuId"" = {submenuId}");
        }

        if
        (
            await TableExistsAsync(
                context,
                "SystemConfigurations")
        )
        {
            await context.Database.ExecuteSqlInterpolatedAsync
            ($@"UPDATE ""SystemConfigurations""
                SET    ""NavigationSubmenuCode"" = {newCode},
                       ""NavigationMenuCode"" = {menuCode},
                       ""NavigationModuleId"" = {moduleId}
                WHERE  ""NavigationSubmenuCode"" = {oldCode}");
        }

        if
        (
            await TableExistsAsync(
                context,
                "MasterActivityPages")
        )
        {
            await context.Database.ExecuteSqlInterpolatedAsync
            ($@"UPDATE ""MasterActivityPages""
                SET    ""NavigationSubmenuCode"" = {newCode}
                WHERE  ""NavigationSubmenuCode"" = {oldCode}");
        }

        foreach
        (
            string table
            in new[]
            {
                "ActivityAssignmentDetails",
                "SpecialAssignmentDetails"
            }
        )
        {
            if
            (
                !await TableExistsAsync(
                    context,
                    table)
            )
            {
                continue;
            }

            // Table name comes from the fixed list above, never
            // from input; the values stay parameters.
            await context.Database.ExecuteSqlRawAsync
            (
                $@"UPDATE ""{table}""
                   SET    ""ModuleId"" = {{0}}, ""MenuId"" = {{1}}
                   WHERE  ""SubMenuId"" = {{2}}",
                moduleId,
                menuId,
                submenuId
            );
        }
    }


    //===========================================================
    // Menu Moved (the caller also calls SubmenuMovedAsync for
    // each of its submenus)
    //===========================================================

    public static async Task MenuMovedAsync
    (
        AppDbContext context,
        long menuId,
        string oldMenuCode,
        string newMenuCode,
        string menuName,
        long moduleId,
        string moduleCode,
        string moduleName
    )
    {
        if
        (
            await TableExistsAsync(
                context,
                "INF_MenuSynchronization")
        )
        {
            await context.Database.ExecuteSqlInterpolatedAsync
            ($@"UPDATE ""INF_MenuSynchronization""
                SET    ""MenuCode"" = {newMenuCode}, ""MenuName"" = {menuName},
                       ""ModuleId"" = {moduleId}, ""ModuleCode"" = {moduleCode}, ""ModuleName"" = {moduleName}
                WHERE  ""MenuId"" = {menuId}");
        }

        if
        (
            await TableExistsAsync(
                context,
                "SystemConfigurations")
        )
        {
            // Menu-scope switches (no submenu code)
            await context.Database.ExecuteSqlInterpolatedAsync
            ($@"UPDATE ""SystemConfigurations""
                SET    ""NavigationMenuCode"" = {newMenuCode},
                       ""NavigationModuleId"" = {moduleId}
                WHERE  ""NavigationMenuCode"" = {oldMenuCode}
                AND    COALESCE(""NavigationSubmenuCode"", '') = ''");
        }
    }
}