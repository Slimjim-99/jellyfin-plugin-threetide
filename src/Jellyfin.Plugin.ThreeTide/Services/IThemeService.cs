namespace Jellyfin.Plugin.ThreeTide.Services;

public interface IThemeService
{
    bool Enabled { get; }

    string BrandColor { get; }

    string Logo { get; }
}