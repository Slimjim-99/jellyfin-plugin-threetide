using System.Text.Json.Nodes;

namespace Jellyfin.Plugin.ThreeTide.Services.Seerr;

public interface ISeerrService
{
    Task<SeerrConnectionResult> TestConnectionAsync(
        CancellationToken cancellationToken = default);

    Task<JsonObject> GetTrendingAsync(
        string mediaType = "all",
        int page = 1,
        CancellationToken cancellationToken = default);

    Task<JsonObject> SearchAsync(
        string query,
        int page = 1,
        CancellationToken cancellationToken = default);
}