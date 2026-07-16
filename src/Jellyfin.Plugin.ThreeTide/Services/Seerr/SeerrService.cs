using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Jellyfin.Plugin.ThreeTide.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ThreeTide.Services.Seerr;

/// <summary>
/// Secure server-side client for the configured Seerr instance.
/// </summary>
public sealed class SeerrService : ISeerrService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<SeerrService> _logger;

    /// <summary>
    /// Initializes a new instance of the
    /// <see cref="SeerrService"/> class.
    /// </summary>
    public SeerrService(
        HttpClient httpClient,
        ILogger<SeerrService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _httpClient.Timeout =
            TimeSpan.FromSeconds(20);

        _httpClient
            .DefaultRequestHeaders
            .Accept
            .Clear();

        _httpClient
            .DefaultRequestHeaders
            .Accept
            .Add(
                new MediaTypeWithQualityHeaderValue(
                    "application/json"));
    }

    /// <inheritdoc />
    public async Task<SeerrConnectionResult> TestConnectionAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            JsonObject response =
                await SendAsync(
                    HttpMethod.Get,
                    "status",
                    cancellationToken);

            string? version =
                ReadString(
                    response,
                    "version");

            return new SeerrConnectionResult(
                true,
                "Verbindung zu Seerr erfolgreich.",
                version);
        }
        catch (SeerrConfigurationException exception)
        {
            return new SeerrConnectionResult(
                false,
                exception.Message);
        }
        catch (SeerrApiException exception)
        {
            return new SeerrConnectionResult(
                false,
                exception.Message);
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            return new SeerrConnectionResult(
                false,
                "Zeitüberschreitung beim Verbinden mit Seerr.");
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Unexpected error while testing the Seerr connection.");

            return new SeerrConnectionResult(
                false,
                "Die Verbindung zu Seerr ist unerwartet fehlgeschlagen.");
        }
    }

    /// <inheritdoc />
    public Task<JsonObject> GetTrendingAsync(
        string mediaType = "all",
        int page = 1,
        CancellationToken cancellationToken = default)
    {
        PluginConfiguration configuration =
            GetConfiguration();

        string normalizedMediaType =
            NormalizeMediaType(
                mediaType);

        string language =
            NormalizeLanguage(
                configuration.SeerrLanguage);

        int normalizedPage =
            Math.Max(
                1,
                page);

        string path =
            "discover/trending" +
            $"?page={normalizedPage}" +
            $"&language={Uri.EscapeDataString(language)}" +
            $"&mediaType={Uri.EscapeDataString(normalizedMediaType)}" +
            "&timeWindow=week";

        return SendAsync(
            HttpMethod.Get,
            path,
            cancellationToken);
    }

    /// <inheritdoc />
    public Task<JsonObject> SearchAsync(
        string query,
        int page = 1,
        CancellationToken cancellationToken = default)
    {
        string normalizedQuery =
            query?.Trim() ??
            string.Empty;

        if (normalizedQuery.Length < 2)
        {
            throw new ArgumentException(
                "Die Suche muss mindestens zwei Zeichen enthalten.",
                nameof(query));
        }

        PluginConfiguration configuration =
            GetConfiguration();

        string language =
            NormalizeLanguage(
                configuration.SeerrLanguage);

        int normalizedPage =
            Math.Max(
                1,
                page);

        string path =
            "search" +
            $"?query={Uri.EscapeDataString(normalizedQuery)}" +
            $"&page={normalizedPage}" +
            $"&language={Uri.EscapeDataString(language)}";

        return SendAsync(
            HttpMethod.Get,
            path,
            cancellationToken);
    }

    private async Task<JsonObject> SendAsync(
        HttpMethod method,
        string relativePath,
        CancellationToken cancellationToken)
    {
        PluginConfiguration configuration =
            GetConfiguration();

        Uri requestUri =
            BuildRequestUri(
                configuration.SeerrUrl,
                relativePath);

        using HttpRequestMessage request =
            new(
                method,
                requestUri);

        request.Headers.TryAddWithoutValidation(
            "X-Api-Key",
            configuration.SeerrApiKey.Trim());

        using HttpResponseMessage response =
            await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

        string body =
            await response.Content.ReadAsStringAsync(
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw CreateApiException(
                response.StatusCode,
                body);
        }

        if (string.IsNullOrWhiteSpace(body))
        {
            return new JsonObject();
        }

        try
        {
            JsonNode? node =
                JsonNode.Parse(
                    body);

            if (node is JsonObject jsonObject)
            {
                return jsonObject;
            }

            return new JsonObject
            {
                ["data"] = node
            };
        }
        catch (JsonException exception)
        {
            _logger.LogError(
                exception,
                "Seerr returned invalid JSON from {RequestUri}.",
                requestUri);

            throw new SeerrApiException(
                "Seerr hat eine ungültige Antwort geliefert.",
                response.StatusCode,
                exception);
        }
    }

    private static PluginConfiguration GetConfiguration()
    {
        PluginConfiguration configuration =
            Plugin.Instance?.Configuration ??
            new PluginConfiguration();

        if (!configuration.EnableSeerr)
        {
            throw new SeerrConfigurationException(
                "Die Seerr-Integration ist deaktiviert.");
        }

        if (string.IsNullOrWhiteSpace(
                configuration.SeerrUrl))
        {
            throw new SeerrConfigurationException(
                "Es wurde keine Seerr-URL eingetragen.");
        }

        if (string.IsNullOrWhiteSpace(
                configuration.SeerrApiKey))
        {
            throw new SeerrConfigurationException(
                "Es wurde kein Seerr API-Key eingetragen.");
        }

        return configuration;
    }

    private static Uri BuildRequestUri(
        string baseUrl,
        string relativePath)
    {
        string normalizedBaseUrl =
            baseUrl
                .Trim()
                .TrimEnd('/');

        if (!Uri.TryCreate(
                normalizedBaseUrl,
                UriKind.Absolute,
                out Uri? baseUri) ||
            (
                baseUri.Scheme != Uri.UriSchemeHttp &&
                baseUri.Scheme != Uri.UriSchemeHttps
            ))
        {
            throw new SeerrConfigurationException(
                "Die konfigurierte Seerr-URL ist ungültig.");
        }

        Uri apiBaseUri =
            new(
                $"{normalizedBaseUrl}/api/v1/");

        return new Uri(
            apiBaseUri,
            relativePath.TrimStart('/'));
    }

    private static string NormalizeMediaType(
        string? mediaType)
    {
        return mediaType?
            .Trim()
            .ToLowerInvariant() switch
        {
            "movie" => "movie",
            "tv" => "tv",
            _ => "all"
        };
    }

    private static string NormalizeLanguage(
        string? language)
    {
        return language?
            .Trim()
            .ToLowerInvariant() switch
        {
            "en" => "en",
            _ => "de"
        };
    }

    private static string? ReadString(
        JsonObject source,
        string propertyName)
    {
        JsonNode? value =
            source[propertyName];

        if (value is null)
        {
            return null;
        }

        try
        {
            return value.GetValue<string>();
        }
        catch (InvalidOperationException)
        {
            return value.ToJsonString();
        }
    }

    private static SeerrApiException CreateApiException(
        HttpStatusCode statusCode,
        string responseBody)
    {
        string message =
            statusCode switch
            {
                HttpStatusCode.BadRequest =>
                    "Seerr hat die Anfrage als ungültig abgelehnt.",

                HttpStatusCode.Unauthorized =>
                    "Der Seerr API-Key wurde abgelehnt.",

                HttpStatusCode.Forbidden =>
                    "Der Seerr API-Key besitzt nicht die benötigten Rechte.",

                HttpStatusCode.NotFound =>
                    "Der angeforderte Seerr-Endpunkt wurde nicht gefunden.",

                HttpStatusCode.TooManyRequests =>
                    "Seerr hat zu viele Anfragen erhalten. Bitte kurz warten.",

                HttpStatusCode.BadGateway or
                HttpStatusCode.ServiceUnavailable or
                HttpStatusCode.GatewayTimeout =>
                    "Seerr ist momentan nicht erreichbar.",

                _ =>
                    $"Seerr antwortete mit HTTP {(int)statusCode}."
            };

        string details =
            TryReadErrorMessage(
                responseBody);

        if (!string.IsNullOrWhiteSpace(details))
        {
            message =
                $"{message} {details}";
        }

        return new SeerrApiException(
            message,
            statusCode);
    }

    private static string TryReadErrorMessage(
        string responseBody)
    {
        if (string.IsNullOrWhiteSpace(
                responseBody))
        {
            return string.Empty;
        }

        try
        {
            JsonNode? node =
                JsonNode.Parse(
                    responseBody);

            if (node is not JsonObject jsonObject)
            {
                return string.Empty;
            }

            string? message =
                ReadString(
                    jsonObject,
                    "message");

            return message?.Trim() ??
                   string.Empty;
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }
}