using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.ThreeTide.Configuration;

/// <summary>
/// Plugin configuration.
/// </summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets a value indicating whether the frontend theme is enabled.</summary>
    public bool EnableTheme { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether player styling is enabled.</summary>
    public bool EnablePlayerTheme { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether Live TV styling is enabled.</summary>
    public bool EnableLiveTvTheme { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether the Seerr button is enabled.</summary>
    public bool EnableSeerrButton { get; set; }

    /// <summary>Gets or sets the Seerr URL.</summary>
    public string SeerrUrl { get; set; } = string.Empty;

    /// <summary>Gets or sets the Seerr button label.</summary>
    public string SeerrButtonLabel { get; set; } = "Anfragen";

    /// <summary>Gets or sets the Seerr button position.</summary>
    public SeerrButtonPosition SeerrButtonPosition { get; set; } = SeerrButtonPosition.Sidebar;

    /// <summary>Gets or sets a value indicating whether Seerr opens in a new tab.</summary>
    public bool OpenSeerrInNewTab { get; set; } = true;
}

/// <summary>
/// Seerr button positions.
/// </summary>
public enum SeerrButtonPosition
{
    /// <summary>Sidebar only.</summary>
    Sidebar = 0,

    /// <summary>Header only.</summary>
    Header = 1,

    /// <summary>Sidebar and header.</summary>
    Both = 2
}
