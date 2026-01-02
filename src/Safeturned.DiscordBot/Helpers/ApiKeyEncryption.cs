using System.Security.Cryptography;
using System.Text;

namespace Safeturned.DiscordBot.Helpers;

public static class ApiKeyEncryption
{
    public static string Encrypt(string apiKey, byte[]? encryptionKey)
    {
        if (encryptionKey == null)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(apiKey));
        }

        using var aes = Aes.Create();
        aes.Key = encryptionKey;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(apiKey);
        var encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var result = new byte[aes.IV.Length + encryptedBytes.Length];
        aes.IV.CopyTo(result, 0);
        encryptedBytes.CopyTo(result, aes.IV.Length);

        return Convert.ToBase64String(result);
    }

    public static string? Decrypt(string encryptedApiKey, byte[]? encryptionKey)
    {
        var data = Convert.FromBase64String(encryptedApiKey);

        if (encryptionKey == null)
        {
            return Encoding.UTF8.GetString(data);
        }

        using var aes = Aes.Create();
        aes.Key = encryptionKey;

        var iv = new byte[16];
        var cipherText = new byte[data.Length - 16];
        Array.Copy(data, 0, iv, 0, 16);
        Array.Copy(data, 16, cipherText, 0, cipherText.Length);

        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor();
        var decryptedBytes = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);

        return Encoding.UTF8.GetString(decryptedBytes);
    }
}
