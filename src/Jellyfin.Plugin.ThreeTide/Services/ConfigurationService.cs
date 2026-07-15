using Jellyfin.Plugin.ThreeTide.Configuration;

namespace Jellyfin.Plugin.ThreeTide.Services;

/// <summary>
/// Zugriff auf die Plugin-Konfiguration.
/// </summary>
public sealed class ConfigurationService
{
    public PluginConfiguration Configuration =>
        Plugin.Instance!.Configuration;

    public void Save()
    {
        Plugin.Instance!.SaveConfiguration();
    }
}