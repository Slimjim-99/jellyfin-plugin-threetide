using Jellyfin.Plugin.ThreeTide.Services.Seerr;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.ThreeTide.Services;

/// <summary>
/// Registers 3Tide services.
/// </summary>
public sealed class ServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(
        IServiceCollection serviceCollection,
        IServerApplicationHost applicationHost)
    {
        serviceCollection.AddHostedService<
            ThreeTideHostedService>();

        serviceCollection.AddHttpClient<
            ISeerrService,
            SeerrService>();
    }
}