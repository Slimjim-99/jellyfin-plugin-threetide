using System.Text;

namespace Jellyfin.Plugin.ThreeTide.Services.Branding;

/// <summary>
/// Erzeugt das CSS für das 3Tide-Branding.
/// </summary>
public static class BrandingInjector
{
    public static string BuildCss(
        string brandColor,
        string logoUrl)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(brandColor);
        ArgumentException.ThrowIfNullOrWhiteSpace(logoUrl);

        StringBuilder css = new();

        css.AppendLine(":root {");
        css.AppendLine(
            $"    --threetide-brand-color: {brandColor};");
        css.AppendLine("}");

        css.AppendLine(
            $"{BrandAssets.HeaderLogoSelector} {{");

        css.AppendLine(
            $"    background-image: url(\"{EscapeCssUrl(logoUrl)}\") !important;");

        css.AppendLine(
            "    background-repeat: no-repeat !important;");

        css.AppendLine(
            "    background-position: center !important;");

        css.AppendLine(
            "    background-size: contain !important;");

        css.AppendLine(
            "    color: transparent !important;");

        css.AppendLine(
            "    font-size: 0 !important;");

        css.AppendLine("}");

        return css.ToString();
    }

    private static string EscapeCssUrl(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal);
    }
}