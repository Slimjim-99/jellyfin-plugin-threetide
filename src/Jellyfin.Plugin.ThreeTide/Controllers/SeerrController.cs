using Jellyfin.Plugin.ThreeTide.Services.Seerr;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Nodes;

namespace Jellyfin.Plugin.ThreeTide.Controllers;

/// <summary>
/// Provides the internal 3Tide API for Seerr.
/// </summary>
[ApiController]
[Authorize]
[Route("ThreeTide/Seerr")]
[Produces("application/json")]
public sealed class SeerrController : ControllerBase
{
    private readonly ISeerrService _seerrService;

    /// <summary>
    /// Initializes a new instance of the
    /// <see cref="SeerrController"/> class.
    /// </summary>
    public SeerrController(
        ISeerrService seerrService)
    {
        _seerrService = seerrService;
    }

    /// <summary>
    /// Tests the configured Seerr connection.
    /// </summary>
    [HttpGet("Status")]
    [ProducesResponseType(
        typeof(SeerrConnectionResult),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<SeerrConnectionResult>>
        GetStatusAsync(
            CancellationToken cancellationToken)
    {
        SeerrConnectionResult result =
            await _seerrService.TestConnectionAsync(
                cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// Returns trending movies and series from Seerr.
    /// </summary>
    [HttpGet("Trending")]
    [ProducesResponseType(
        typeof(JsonObject),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        typeof(ThreeTideApiError),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        typeof(ThreeTideApiError),
        StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<JsonObject>>
        GetTrendingAsync(
            [FromQuery] string mediaType = "all",
            [FromQuery] int page = 1,
            CancellationToken cancellationToken = default)
    {
        try
        {
            JsonObject result =
                await _seerrService.GetTrendingAsync(
                    mediaType,
                    page,
                    cancellationToken);

            return Ok(result);
        }
        catch (SeerrConfigurationException exception)
        {
            return BadRequest(
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (SeerrApiException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new ThreeTideApiError(
                    "Zeitüberschreitung beim Abrufen der Seerr-Daten."));
        }
    }

    /// <summary>
    /// Searches movies and series through Seerr.
    /// </summary>
    [HttpGet("Search")]
    [ProducesResponseType(
        typeof(JsonObject),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        typeof(ThreeTideApiError),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        typeof(ThreeTideApiError),
        StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<JsonObject>>
        SearchAsync(
            [FromQuery] string query,
            [FromQuery] int page = 1,
            CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query) ||
                query.Trim().Length < 2)
            {
                return BadRequest(
                    new ThreeTideApiError(
                        "Die Suche muss mindestens zwei Zeichen enthalten."));
            }

            JsonObject result =
                await _seerrService.SearchAsync(
                    query,
                    page,
                    cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (SeerrConfigurationException exception)
        {
            return BadRequest(
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (SeerrApiException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new ThreeTideApiError(
                    "Zeitüberschreitung beim Durchsuchen von Seerr."));
        }
    }

    /// <summary>
    /// Submits a media request to Seerr.
    /// </summary>
    [HttpPost("Request")]
    [ProducesResponseType(
        typeof(JsonObject),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        typeof(ThreeTideApiError),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        typeof(ThreeTideApiError),
        StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<JsonObject>>
        RequestMediaAsync(
            [FromBody] SeerrRequestBody body,
            CancellationToken cancellationToken = default)
    {
        try
        {
            JsonObject result =
                await _seerrService.RequestMediaAsync(
                    body.MediaId,
                    body.MediaType,
                    body.Seasons,
                    cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (SeerrConfigurationException exception)
        {
            return BadRequest(
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (SeerrApiException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new ThreeTideApiError(
                    exception.Message));
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(
                StatusCodes.Status504GatewayTimeout,
                new ThreeTideApiError(
                    "Zeitüberschreitung beim Anfragen bei Seerr."));
        }
    }
}

/// <summary>
/// Standard error response for the internal 3Tide API.
/// </summary>
public sealed record ThreeTideApiError(
    string Message);

/// <summary>
/// Request body for submitting a Seerr media request.
/// </summary>
public sealed class SeerrRequestBody
{
    /// <summary>
    /// Gets or sets the TMDB id of the movie or series.
    /// </summary>
    public int MediaId { get; set; }

    /// <summary>
    /// Gets or sets the media type ("movie" or "tv").
    /// </summary>
    public string MediaType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional season numbers to request (TV only).
    /// </summary>
    public int[]? Seasons { get; set; }
}