//===============================================================
// First start : when AppCore_Control has no staff user, create the
// Owner "owner" with a one-time password printed ONCE in the API
// window. It must be changed at the first login.
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;

namespace AppCore.Console.API.Security;


public static class StaffBootstrap
{
    public static async Task RunAsync(IServiceProvider services, ILogger logger)
    {
        using IServiceScope scope = services.CreateScope();

        ControlDbContext db = scope.ServiceProvider.GetRequiredService<ControlDbContext>();

        if (await db.StaffUsers.AnyAsync())
        {
            return;
        }

        StaffRole? owner =
            await db.StaffRoles.FirstOrDefaultAsync(x => x.RoleCode == StaffRoles.Owner);

        if (owner is null)
        {
            logger.LogError("Staff role OWNER is missing : run Database\\02_Control_Schema.sql first.");

            return;
        }

        string password = StaffPassword.NewTemporary();

        db.StaffUsers.Add(new StaffUser
        {
            LoginId = "owner",
            FullName = "AppCore Owner",
            StaffRoleId = owner.StaffRoleId,
            PasswordHash = StaffPassword.Hash(password),
            MustChangePassword = true,
            Status = "Active"
        });

        db.AuditLog.Add(new AuditLogEntry { Action = "Staff.Bootstrap", EntityName = "StaffUser", Details = "First Owner created" });

        await db.SaveChangesAsync();

        System.Console.ForegroundColor = ConsoleColor.Yellow;
        System.Console.WriteLine();
        System.Console.WriteLine("==============================================================");
        System.Console.WriteLine(" AppCore Console : first Owner created (shown only this once)");
        System.Console.WriteLine("   Login ID : owner");
        System.Console.WriteLine($"   Password : {password}");
        System.Console.WriteLine(" Change it at the first login.");
        System.Console.WriteLine("==============================================================");
        System.Console.WriteLine();
        System.Console.ResetColor();
    }
}
