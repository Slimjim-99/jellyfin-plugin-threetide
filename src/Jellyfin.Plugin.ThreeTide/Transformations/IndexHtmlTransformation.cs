using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Jellyfin.Plugin.ThreeTide.Configuration;

namespace Jellyfin.Plugin.ThreeTide.Transformations;

/// <summary>
/// Injects the 3Tide frontend assets into jellyfin-web index.html.
/// </summary>
public static class IndexHtmlTransformation
{
    /// <summary>
    /// File Transformation callback.
    /// </summary>
    /// <param name="state">Transformation state.</param>
    /// <returns>Updated transformation state.</returns>
    public static object Transform(object state)
    {
        string contents = ExtractContents(state);
        PluginConfiguration configuration =
            Plugin.Instance?.Configuration ?? new PluginConfiguration();

        if (!configuration.EnableTheme)
        {
            return new { contents };
        }

        List<string> styles = [Plugin.ReadEmbeddedText("theme.css")];

        if (configuration.EnablePlayerTheme)
        {
            styles.Add(Plugin.ReadEmbeddedText("player.css"));
        }

        if (configuration.EnableLiveTvTheme)
        {
            styles.Add(Plugin.ReadEmbeddedText("livetv.css"));
        }

        string browserConfiguration = JsonSerializer.Serialize(new
        {
            enableSeerrButton = configuration.EnableSeerrButton,
            seerrUrl = NormalizeUrl(configuration.SeerrUrl),
            label = string.IsNullOrWhiteSpace(configuration.SeerrButtonLabel)
                ? "Anfragen"
                : configuration.SeerrButtonLabel.Trim(),
            position = configuration.SeerrButtonPosition.ToString().ToLowerInvariant(),
            openInNewTab = configuration.OpenSeerrInNewTab
        });

        string injection =
            "<style id=\"threetide-theme\">" +
            string.Join(Environment.NewLine, styles) +
            "</style><script id=\"threetide-bootstrap\">window.__THREETIDE_CONFIG__=" +
            browserConfiguration +
            ";" +
            Plugin.ReadEmbeddedText("runtime.js") +
            "</script>";

        int bodyEnd = contents.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        string patchedContents = bodyEnd >= 0
            ? contents.Insert(bodyEnd, injection)
            : contents + injection;

        return new { contents = patchedContents };
    }

    private static string ExtractContents(object state)
    {
        if (state is JsonElement element &&
            element.TryGetProperty("contents", out JsonElement contentsElement))
        {
            return contentsElement.GetString() ?? string.Empty;
        }

        if (state is JsonObject jsonObject)
        {
            return jsonObject["contents"]?.GetValue<string>() ?? string.Empty;
        }

        PropertyInfo? property = state.GetType().GetProperty(
            "contents",
            BindingFlags.Instance |
            BindingFlags.Public |
            BindingFlags.IgnoreCase);

        return property?.GetValue(state)?.ToString() ?? string.Empty;
    }

    private static string NormalizeUrl(string value)
    {
        string trimmed = value.Trim();

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out Uri? uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return uri.ToString().TrimEnd('/');
        }

        return string.Empty;
    }
}
