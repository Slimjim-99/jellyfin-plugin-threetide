namespace Jellyfin.Plugin.ThreeTide.Services.Seerr;

/// <summary>
/// Represents an invalid or incomplete Seerr configuration.
/// </summary>
public sealed class SeerrConfigurationException : Exception
{
    public SeerrConfigurationException(
        string message)
        : base(message)
    {
    }
}