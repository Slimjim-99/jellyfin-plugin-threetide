using Jellyfin.Plugin.ThreeTide.Configuration;

namespace Jellyfin.Plugin.ThreeTide.Services;

public interface IConfigurationService
{
    PluginConfiguration Configuration { get; }

    void Save();
}