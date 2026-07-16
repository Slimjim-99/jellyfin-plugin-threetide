namespace Jellyfin.Plugin.ThreeTide.Services.Branding;

/// <summary>
/// Prüft und normalisiert Logo-Adressen.
/// </summary>
public sealed class LogoManager
{
    public string NormalizeLogoUrl(string? logoUrl)
    {
        if (string.IsNullOrWhiteSpace(logoUrl))
        {
            return BrandAssets.DefaultLogoUrl;
        }

        string value = logoUrl.Trim();

        if (value.StartsWith("/", StringComparison.Ordinal) ||
            Uri.TryCreate(value, UriKind.Absolute, out _))
        {
            return value;
        }

        return BrandAssets.DefaultLogoUrl;
    }
}