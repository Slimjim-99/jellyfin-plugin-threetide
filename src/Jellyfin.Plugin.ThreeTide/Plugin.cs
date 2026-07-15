using System.Globalization;
using Jellyfin.Plugin.ThreeTide.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

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
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <inheritdoc />
    public override string Name => "3Tide";

    /// <inheritdoc />
    public override string Description =>
        "3Tide branding, player-safe theme, Live TV styling and optional Seerr navigation.";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("7f91b8a5-0cd1-4e71-a379-70d820dcdac5");

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

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
        string suffix = ".Web." + fileName;
        string? resourceName = typeof(Plugin).Assembly
            .GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            throw new InvalidOperationException($"Embedded resource '{fileName}' was not found.");
        }

        using Stream stream = typeof(Plugin).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Unable to open embedded resource '{resourceName}'.");

        using StreamReader reader = new(stream);
        return reader.ReadToEnd();
    }
}
