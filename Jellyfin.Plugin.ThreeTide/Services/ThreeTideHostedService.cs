using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Jellyfin.Plugin.ThreeTide.Transformations;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.ThreeTide.Services;

/// <summary>
/// Registers the File Transformation callback at startup.
/// </summary>
public sealed class ThreeTideHostedService : IHostedService
{
    private static readonly Guid TransformationId =
        Guid.Parse("48a89e55-5b72-48a4-ae14-a1572be3b4ad");

    private readonly ILogger<ThreeTideHostedService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ThreeTideHostedService"/> class.
    /// </summary>
    /// <param name="logger">Logger.</param>
    public ThreeTideHostedService(ILogger<ThreeTideHostedService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            Assembly? fileTransformationAssembly = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(assembly =>
                    assembly.FullName?.Contains(
                        ".FileTransformation",
                        StringComparison.OrdinalIgnoreCase) == true);

            if (fileTransformationAssembly is null)
            {
                _logger.LogWarning(
                    "File Transformation is not loaded. 3Tide frontend injection is inactive.");
                return Task.CompletedTask;
            }

            Type? pluginInterfaceType = fileTransformationAssembly.GetType(
                "Jellyfin.Plugin.FileTransformation.PluginInterface");

            MethodInfo? registerMethod = pluginInterfaceType?.GetMethod(
                "RegisterTransformation",
                BindingFlags.Public | BindingFlags.Static);

            if (registerMethod is null)
            {
                _logger.LogError(
                    "File Transformation RegisterTransformation method was not found.");
                return Task.CompletedTask;
            }

            string payload = JsonSerializer.Serialize(new
            {
                id = TransformationId,
                fileNamePattern = @"index\.html$",
                callbackAssembly = typeof(IndexHtmlTransformation).Assembly.FullName,
                callbackClass = typeof(IndexHtmlTransformation).FullName,
                callbackMethod = nameof(IndexHtmlTransformation.Transform)
            });

            registerMethod.Invoke(null, [payload]);
            _logger.LogInformation("3Tide frontend transformation registered.");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unable to register the 3Tide transformation.");
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
