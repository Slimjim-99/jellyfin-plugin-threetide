using Jellyfin.Plugin.ThreeTide.Services;

namespace Jellyfin.Plugin.ThreeTide.Services.Branding;

/// <summary>
/// Verwaltet das aktive Branding.
/// </summary>
public sealed class BrandingService : IBrandingService
{
    private readonly IConfigurationService _configuration;
    private readonly LogoManager _logoManager;

    public BrandingService(
        IConfigurationService configuration,
        LogoManager logoManager)
    {
        _configuration = configuration;
        _logoManager = logoManager;
    }

    public bool Enabled =>
        _configuration.Configuration.EnableTheme;

    public string BrandName =>
        BrandAssets.DefaultName;

    public string BrandColor =>
        string.IsNullOrWhiteSpace(
            _configuration.Configuration.BrandColor)
            ? BrandAssets.DefaultColor
            : _configuration.Configuration.BrandColor.Trim();

    public string LogoUrl =>
        _logoManager.NormalizeLogoUrl(
            _configuration.Configuration.LogoUrl);

    public string BuildCss()
    {
        if (!Enabled)
        {
            return string.Empty;
        }

        return BrandingInjector.BuildCss(
            BrandColor,
            LogoUrl);
    }
}