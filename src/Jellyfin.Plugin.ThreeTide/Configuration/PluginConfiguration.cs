using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.ThreeTide.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    // Theme
    public bool EnableTheme { get; set; } = true;

    // Kompatibilität mit bestehendem Code
    public bool EnablePlayerTheme { get; set; } = true;

    public bool EnableLiveTvTheme { get; set; } = true;

    // Player
    public bool EnablePlayer { get; set; } = true;

    // Live TV
    public bool EnableLiveTv { get; set; } = true;

    // Seerr
    public bool EnableSeerr { get; set; } = true;

    public bool EnableSeerrButton { get; set; } = true;

    public string SeerrUrl { get; set; } = "https://request.3tide.com";

    public string SeerrButtonLabel { get; set; } = "Anfragen";

    public string SeerrButtonLocation { get; set; } = "Sidebar";

    // Alias für den bestehenden Code
    public string SeerrButtonPosition
    {
        get => SeerrButtonLocation;
        set => SeerrButtonLocation = value;
    }

    public bool OpenSeerrInNewTab { get; set; } = true;

    // Branding
    public string BrandColor { get; set; } = "#E50914";

    public string LogoUrl { get; set; } = "/web/assets/logo/3tide.png";
}