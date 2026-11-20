//===============================================================
// First start : when AppCore_Control has no staff user, create the
// Owner "owner" with a one-time password printed ONCE in the API
// window. It must be changed at the first login.
//
// 2026-11-20 : the live Console runs as a Windows service and has
// no window, so the password is ALSO written to the file
// first-owner-password.txt beside the API (the log names the file,
// never the password). Delete the file after the first login.
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

        // the file first : if the owner cannot be saved it is removed
        // again; if the file cannot be written the window still shows
        // the password
        string file = Path.Combine(AppContext.BaseDirectory, "first-owner-password.txt");
        bool written = false;

        try
        {
            await File.WriteAllTextAsync(file,
                "AppCore Console : first Owner (created " + DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC)\r\n" +
                "Login ID : owner\r\n" +
                "Password : " + password + "\r\n" +
                "It must be changed at the first login. Delete this file after that.\r\n");

            written = true;
        }
        catch (Exception ex)
        {
            logger.LogWarning("The first Owner's password could not be written to {File} : {Error}. It is shown only in the API window.", file, ex.Message);
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch
        {
            if (written)
            {
                try { File.Delete(file); } catch { }
            }

            throw;
        }

        if (written)
        {
            logger.LogWarning("First Owner created. Login ID owner; its one-time password is in the file {File}. Sign in, change it, then delete the file.", file);
        }

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
