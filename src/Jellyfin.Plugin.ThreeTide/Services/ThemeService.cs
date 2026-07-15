using Jellyfin.Plugin.ThreeTide.Configuration;

namespace Jellyfin.Plugin.ThreeTide.Services;

/// <summary>
/// Verwaltet das 3Tide Theme.
/// </summary>
public sealed class ThemeService
{
    private readonly ConfigurationService _configuration;

    public ThemeService(ConfigurationService configuration)
    {
        _configuration = configuration;
    }

    public bool Enabled =>
        _configuration.Configuration.EnableTheme;

    public string BrandColor =>
        _configuration.Configuration.BrandColor;

    public string Logo =>
        _configuration.Configuration.LogoUrl;
}