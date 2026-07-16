using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.ThreeTide.Configuration;

/// <summary>
/// Stores the 3Tide plugin configuration.
/// </summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    // Theme
    public bool EnableTheme { get; set; } = true;

    public bool EnablePlayerTheme { get; set; } = true;

    public bool EnableLiveTvTheme { get; set; } = true;

    // Compatibility aliases
    public bool EnablePlayer { get; set; } = true;

    public bool EnableLiveTv { get; set; } = true;

    // Seerr
    public bool EnableSeerr { get; set; } = true;

    public bool EnableSeerrButton { get; set; } = true;

    public string SeerrUrl { get; set; } =
        "https://request.3tide.com";

    /// <summary>
    /// Seerr administrator API key.
    /// This value must never be exposed to frontend JavaScript.
    /// </summary>
    public string SeerrApiKey { get; set; } =
        string.Empty;

    public string SeerrButtonLabel { get; set; } =
        "Anfragen";

    public string SeerrButtonLocation { get; set; } =
        "Sidebar";

    public string SeerrButtonPosition
    {
        get => SeerrButtonLocation;
        set => SeerrButtonLocation = value;
    }

    public bool OpenSeerrInNewTab { get; set; } = true;

    /// <summary>
    /// Language used for Seerr discovery and search results.
    /// </summary>
    public string SeerrLanguage { get; set; } =
        "de";

    /// <summary>
    /// Number of discovery results returned to the frontend.
    /// </summary>
    public int SeerrDiscoveryLimit { get; set; } = 20;

    /// <summary>
    /// Automatically approve requests when supported.
    /// Keep disabled initially.
    /// </summary>
    public bool SeerrAutoApproveRequests { get; set; } =
        false;

    // Branding
    public string BrandColor { get; set; } =
        "#E50914";

    public string LogoUrl { get; set; } =
        "/web/assets/logo/3tide.png";
}