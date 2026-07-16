using Jellyfin.Plugin.ThreeTide.Configuration;
using Jellyfin.Plugin.ThreeTide.Services;
using Jellyfin.Plugin.ThreeTide.Services.Branding;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using System.Globalization;
using System.Reflection;

namespace Jellyfin.Plugin.ThreeTide;

/// <summary>
/// The main 3Tide plugin.
/// </summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Application paths.</param>
    /// <param name="xmlSerializer">XML serializer.</param>
    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;

        ConfigurationService = new ConfigurationService();

        ThemeService = new ThemeService(
            ConfigurationService);

        LogoManager logoManager = new();

        BrandingService = new BrandingService(
            ConfigurationService,
            logoManager);
    }

    /// <inheritdoc />
    public override string Name => "3Tide";

    /// <inheritdoc />
    public override string Description =>
        "3Tide branding, player-safe theme, Live TV styling and optional Seerr navigation.";

    /// <inheritdoc />
    public override Guid Id =>
        Guid.Parse("7f91b8a5-0cd1-4e71-a379-70d820dcdac5");

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// Gets the configuration service.
    /// </summary>
    public static IConfigurationService ConfigurationService
    {
        get;
        private set;
    } = null!;

    /// <summary>
    /// Gets the theme service.
    /// </summary>
    public static IThemeService ThemeService
    {
        get;
        private set;
    } = null!;

    /// <summary>
    /// Gets the branding service.
    /// </summary>
    public static IBrandingService BrandingService
    {
        get;
        private set;
    } = null!;

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}.Configuration.configPage.html",
                    GetType().Namespace)
            }
        ];
    }

    /// <summary>
    /// Reads an embedded frontend asset.
    /// </summary>
    /// <param name="fileName">Asset file name.</param>
    /// <returns>Asset text.</returns>
    public static string ReadEmbeddedText(string fileName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);

        Assembly assembly =
            typeof(Plugin).Assembly;

        string? resourceName =
            assembly
                .GetManifestResourceNames()
                .FirstOrDefault(
                    name =>
                        name.EndsWith(
                            $".{fileName}",
                            StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            return string.Empty;
        }

        using Stream? stream =
            assembly.GetManifestResourceStream(
                resourceName);

        if (stream is null)
        {
            return string.Empty;
        }

        using StreamReader reader =
            new(
                stream,
                System.Text.Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true);

        return reader.ReadToEnd();
    }
}