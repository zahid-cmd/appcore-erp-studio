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
//===============================================================

using System.Security.Cryptography;
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

            // the public half is (re)written every start : harmless
            File.WriteAllText(PublicFile, rsa.ExportSubjectPublicKeyInfoPem());

            _rsa = rsa;
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
