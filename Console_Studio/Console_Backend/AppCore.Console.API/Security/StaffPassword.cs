//===============================================================
// Staff passwords : PBKDF2-SHA256, 210,000 rounds, 16-byte salt
// Stored as  pbkdf2$<rounds>$<salt b64>$<hash b64>
//===============================================================

using System.Security.Cryptography;

namespace AppCore.Console.API.Security;


public static class StaffPassword
{
    private const int Rounds = 210_000;

    public static string Hash(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);

        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Rounds, HashAlgorithmName.SHA256, 32);

        return $"pbkdf2${Rounds}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        string[] parts = (stored ?? string.Empty).Split('$');

        if (parts.Length != 4 || parts[0] != "pbkdf2" || !int.TryParse(parts[1], out int rounds))
        {
            return false;
        }

        byte[] salt = Convert.FromBase64String(parts[2]);
        byte[] expected = Convert.FromBase64String(parts[3]);

        byte[] actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, rounds, HashAlgorithmName.SHA256, expected.Length);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    // At least 10 characters with a letter and a digit
    public static string? Weakness(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 10)
        {
            return "The password needs at least 10 characters.";
        }

        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
        {
            return "The password needs letters and digits.";
        }

        return null;
    }

    // Readable one-time password for a new staff user
    public static string NewTemporary()
    {
        const string letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

        Span<char> text = stackalloc char[14];

        for (int i = 0; i < text.Length; i++)
        {
            text[i] = letters[RandomNumberGenerator.GetInt32(letters.Length)];
        }

        return new string(text) + RandomNumberGenerator.GetInt32(10, 99);
    }
}
