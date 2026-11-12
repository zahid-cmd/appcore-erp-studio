//===============================================================
// The visitor's real address. Behind the Cloudflare tunnel every
// request reaches the API from 127.0.0.1; Cloudflare puts the
// visitor's address in CF-Connecting-IP. That header is trusted
// only when the request itself comes from this machine (the
// tunnel), never from outside.
//===============================================================

using System.Net;

namespace AppCore.Console.API.Security;


public static class VisitorIp
{
    public static string Of(HttpContext http)
    {
        IPAddress? remote = http.Connection.RemoteIpAddress;

        if (remote is not null && IPAddress.IsLoopback(remote))
        {
            string header = http.Request.Headers["CF-Connecting-IP"].ToString();

            if (!string.IsNullOrWhiteSpace(header) && IPAddress.TryParse(header.Trim(), out IPAddress? visitor))
            {
                return visitor.ToString();
            }
        }

        return remote?.ToString() ?? "unknown";
    }
}
