namespace Jellyfin.Plugin.ThreeTide.Services.Seerr;

/// <summary>
/// Result of a Seerr connectivity test.
/// </summary>
public sealed record SeerrConnectionResult(
    bool Success,
    string Message,
    string? Version = null);