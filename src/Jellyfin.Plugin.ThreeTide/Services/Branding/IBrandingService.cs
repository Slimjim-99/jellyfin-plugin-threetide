namespace Jellyfin.Plugin.ThreeTide.Services.Branding;

/// <summary>
/// Stellt die aktuell konfigurierte 3Tide-Marke bereit.
/// </summary>
public interface IBrandingService
{
    bool Enabled { get; }

    string BrandName { get; }

    string BrandColor { get; }

    string LogoUrl { get; }

    string BuildCss();
}