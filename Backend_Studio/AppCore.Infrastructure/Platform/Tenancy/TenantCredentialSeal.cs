//===============================================================
// Tenant Credential Seal (2026-11-20)
//===============================================================
//
// Opens the client database passwords the Console sealed with
// this server's public key (AppCore_Control Tenants.DbPasswordSealed,
// format 'rsa-oaep-256:' + base64, RSA 3072, OAEP SHA-256).
//
// The key pair is made by this server the first time it is
// needed (Mode Host) and kept OUTSIDE the releases :
//     Tenancy:CredentialKeyFile, default
//     C:\ProgramData\AppCore\keys\tenant-credentials.pem          private
//     C:\ProgramData\AppCore\keys\tenant-credentials.public.pem   public
// The public key goes into AppCore_Control.PlatformKeys once
// (Console_Studio\Database\12_Tenant_Credential_Public_Key.sql).
// Keep a copy of the private file in a safe place : without it the
// sealed logins cannot be opened (the Console can reset them).
//
// The private file is locked every start (2026-11-20, review B12) :
// only SYSTEM, Administrators and the account this service runs as
// may read it. Before, it had the folder's normal rights and every
// Windows user of the server could read it.
//
//===============================================================

using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed class TenantCredentialSeal
{
    public const string Prefix = "rsa-oaep-256:";

    private readonly string _privateFile;

    private readonly object _lock = new();

    private RSA? _rsa;


    public TenantCredentialSeal(string? privateFile)
    {
        _privateFile = string.IsNullOrWhiteSpace(privateFile)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "AppCore", "keys", "tenant-credentials.pem")
            : privateFile;
    }

    public string PublicFile =>
        Path.Combine(Path.GetDirectoryName(_privateFile)!, Path.GetFileNameWithoutExtension(_privateFile) + ".public.pem");


    // makes the key pair if there is none yet (never replaces one)
    public void EnsureKey()
    {
        lock (_lock)
        {
            if (_rsa != null)
            {
                return;
            }

            RSA rsa = RSA.Create();

            if (File.Exists(_privateFile))
            {
                rsa.ImportFromPem(File.ReadAllText(_privateFile));
            }
            else
            {
                rsa.KeySize = 3072;

                Directory.CreateDirectory(Path.GetDirectoryName(_privateFile)!);

                File.WriteAllText(_privateFile, rsa.ExportPkcs8PrivateKeyPem());
            }

            LockPrivateFile();

            // the public half is (re)written every start : harmless
            File.WriteAllText(PublicFile, rsa.ExportSubjectPublicKeyInfoPem());

            _rsa = rsa;
        }
    }


    // Only SYSTEM, Administrators and this service's own account
    // may read the private key (nothing is inherited from the
    // folder). Never stops the start : a problem here leaves the
    // file as it was.
    private void LockPrivateFile()
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        try
        {
            FileSecurity security = new();

            // no rights from the folder
            security.SetAccessRuleProtection(true, false);

            List<IdentityReference> allowed =
            [
                new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
                new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null)
            ];

            if (WindowsIdentity.GetCurrent().User is SecurityIdentifier me && !allowed.Contains(me))
            {
                allowed.Add(me);
            }

            foreach (IdentityReference who in allowed)
            {
                security.AddAccessRule(new FileSystemAccessRule(who, FileSystemRights.FullControl, AccessControlType.Allow));
            }

            new FileInfo(_privateFile).SetAccessControl(security);
        }
        catch (Exception)
        {
            // the key still works; the file keeps its old rights
        }
    }


    public string Open(string sealedText)
    {
        if (string.IsNullOrWhiteSpace(sealedText) || !sealedText.StartsWith(Prefix, StringComparison.Ordinal))
        {
            throw new CryptographicException("Not a sealed password.");
        }

        EnsureKey();

        byte[] data = Convert.FromBase64String(sealedText[Prefix.Length..]);

        return Encoding.UTF8.GetString(_rsa!.Decrypt(data, RSAEncryptionPadding.OaepSHA256));
    }
}
