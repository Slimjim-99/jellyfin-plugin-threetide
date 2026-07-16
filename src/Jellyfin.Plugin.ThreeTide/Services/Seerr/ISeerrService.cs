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

    /// <summary>
    /// Submits a media request to Seerr.
    /// </summary>
    /// <param name="mediaId">The TMDB id of the movie or series.</param>
    /// <param name="mediaType">Either "movie" or "tv".</param>
    /// <param name="seasons">
    /// Optional season numbers to request (TV only). Pass null to let
    /// Seerr use its default behaviour (typically all seasons).
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<JsonObject> RequestMediaAsync(
        int mediaId,
        string mediaType,
        int[]? seasons = null,
        CancellationToken cancellationToken = default);
}