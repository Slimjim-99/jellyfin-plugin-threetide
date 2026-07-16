using System.Net;

namespace Jellyfin.Plugin.ThreeTide.Services.Seerr;

/// <summary>
/// Represents an error returned by the Seerr API.
/// </summary>
public sealed class SeerrApiException : Exception
{
    public SeerrApiException(
        string message,
        HttpStatusCode statusCode,
        Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }

    public HttpStatusCode StatusCode { get; }
}