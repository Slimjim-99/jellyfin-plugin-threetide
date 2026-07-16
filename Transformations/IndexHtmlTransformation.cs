using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Jellyfin.Plugin.ThreeTide.Configuration;

namespace Jellyfin.Plugin.ThreeTide.Transformations;

/// <summary>
/// Injects the 3Tide frontend assets into Jellyfin Web.
/// </summary>
public static class IndexHtmlTransformation
{
    /// <summary>
    /// Applies the 3Tide transformation to Jellyfin's index.html.
    /// File Transformation 2.5.x expects a string as return value.
    /// </summary>
    /// <param name="state">Transformation state.</param>
    /// <returns>The transformed HTML string.</returns>
    public static object Transform(object state)
    {
        string html = ExtractContents(state);

        if (string.IsNullOrWhiteSpace(html))
        {
            return html;
        }

        /*
         * File Transformation may also match Webpack chunks whose
         * filenames contain "index-html".
         *
         * Those files are JavaScript and must never receive HTML,
         * CSS or script tags appended to them.
         */
        if (!IsHtmlDocument(html))
        {
            return html;
        }

        PluginConfiguration config =
            Plugin.Instance?.Configuration ??
            new PluginConfiguration();

        if (!config.EnableTheme)
        {
            return html;
        }

        if (html.Contains(
                "id=\"threetide-bootstrap\"",
                StringComparison.OrdinalIgnoreCase))
        {
            return html;
        }

        List<string> styles =
        [
            Plugin.ReadEmbeddedText("theme.css"),
            Plugin.ReadEmbeddedText("header.css"),
            Plugin.ReadEmbeddedText("hero.css"),
            Plugin.ReadEmbeddedText("home.css"),
            Plugin.ReadEmbeddedText("search.css"),
            Plugin.ReadEmbeddedText("ui.css"),
            Plugin.ReadEmbeddedText("discover.css"),
            Plugin.ReadEmbeddedText("catalog.css")
        ];

        string brandingCss =
            Plugin.BrandingService.BuildCss();

        if (!string.IsNullOrWhiteSpace(brandingCss))
        {
            styles.Add(brandingCss);
        }

        string browserConfig =
            JsonSerializer.Serialize(
                new
                {
                    enableSeerrButton =
                        config.EnableSeerrButton,

                    seerrUrl =
                        NormalizeUrl(config.SeerrUrl),

                    label =
                        string.IsNullOrWhiteSpace(
                            config.SeerrButtonLabel)
                            ? "Anfragen"
                            : config.SeerrButtonLabel.Trim(),

                    position =
                        NormalizePosition(
                            config.SeerrButtonPosition),

                    openInNewTab =
                        config.OpenSeerrInNewTab,

                    brandName =
                        Plugin.BrandingService.BrandName,

                    brandColor =
                        Plugin.BrandingService.BrandColor,

                    logoUrl =
                        Plugin.BrandingService.LogoUrl
                });

        string apiScript =
            Plugin.ReadEmbeddedText("api.js");

        string uiScript =
            Plugin.ReadEmbeddedText("ui.js");

        string catalogScript =
            Plugin.ReadEmbeddedText("catalog.js");

        string discoverScript =
            Plugin.ReadEmbeddedText("discover.js");

        string headerScript =
            Plugin.ReadEmbeddedText("header.js");

        string heroScript =
            Plugin.ReadEmbeddedText("hero.js");

        string homeScript =
            Plugin.ReadEmbeddedText("home.js");

        string searchScript =
            Plugin.ReadEmbeddedText("search.js");

        string runtimeScript =
            Plugin.ReadEmbeddedText("runtime.js");

        string injection =
$"""
<style id="threetide-theme">
{string.Join(Environment.NewLine, styles)}
</style>

<script id="threetide-bootstrap">
window.__THREETIDE_CONFIG__ = {browserConfig};
</script>

<script id="threetide-api-script">
{apiScript}
</script>

<script id="threetide-ui-script">
{uiScript}
</script>

<script id="threetide-catalog-script">
{catalogScript}
</script>

<script id="threetide-discover-script">
{discoverScript}
</script>

<script id="threetide-header-script">
{headerScript}
</script>

<script id="threetide-hero-script">
{heroScript}
</script>

<script id="threetide-home-script">
{homeScript}
</script>

<script id="threetide-search-script">
{searchScript}
</script>

<script id="threetide-runtime-script">
{runtimeScript}
</script>
""";

        int bodyIndex =
            html.LastIndexOf(
                "</body>",
                StringComparison.OrdinalIgnoreCase);

        /*
         * Never append the injection to arbitrary content.
         * If no closing body tag exists, return the original file.
         */
        if (bodyIndex < 0)
        {
            return html;
        }

        return html.Insert(
            bodyIndex,
            injection);
    }

    private static bool IsHtmlDocument(string contents)
    {
        if (string.IsNullOrWhiteSpace(contents))
        {
            return false;
        }

        bool hasHtmlRoot =
            contents.Contains(
                "<html",
                StringComparison.OrdinalIgnoreCase);

        bool hasHead =
            contents.Contains(
                "<head",
                StringComparison.OrdinalIgnoreCase);

        bool hasBody =
            contents.Contains(
                "<body",
                StringComparison.OrdinalIgnoreCase);

        bool hasClosingBody =
            contents.Contains(
                "</body>",
                StringComparison.OrdinalIgnoreCase);

        return
            hasHtmlRoot &&
            hasHead &&
            hasBody &&
            hasClosingBody;
    }

    private static string ExtractContents(object? state)
    {
        if (state is null)
        {
            return string.Empty;
        }

        if (state is string text)
        {
            return text;
        }

        if (state is JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                return element.GetString() ??
                       string.Empty;
            }

            if (
                element.ValueKind == JsonValueKind.Object &&
                element.TryGetProperty(
                    "contents",
                    out JsonElement contentsElement))
            {
                return contentsElement.GetString() ??
                       string.Empty;
            }
        }

        if (state is JsonObject jsonObject)
        {
            return jsonObject["contents"]
                       ?.GetValue<string>() ??
                   string.Empty;
        }

        PropertyInfo? property =
            state.GetType().GetProperty(
                "contents",
                BindingFlags.Instance |
                BindingFlags.Public |
                BindingFlags.IgnoreCase);

        if (property is not null)
        {
            return property.GetValue(state)
                       ?.ToString() ??
                   string.Empty;
        }

        PropertyInfo? indexer =
            state.GetType().GetProperty(
                "Item",
                [typeof(string)]);

        if (indexer is not null)
        {
            object? value =
                indexer.GetValue(
                    state,
                    ["contents"]);

            return value?.ToString() ??
                   string.Empty;
        }

        return state.ToString() ??
               string.Empty;
    }

    private static string NormalizeUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        string trimmed =
            value.Trim();

        if (
            Uri.TryCreate(
                trimmed,
                UriKind.Absolute,
                out Uri? uri) &&
            (
                uri.Scheme == Uri.UriSchemeHttp ||
                uri.Scheme == Uri.UriSchemeHttps
            ))
        {
            return uri
                .ToString()
                .TrimEnd('/');
        }

        return string.Empty;
    }

    private static string NormalizePosition(string? value)
    {
        string normalized =
            value?.Trim().ToLowerInvariant() ??
            "sidebar";

        return normalized switch
        {
            "header" => "header",
            "both" => "both",
            _ => "sidebar"
        };
    }
}