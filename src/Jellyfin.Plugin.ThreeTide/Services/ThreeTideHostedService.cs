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
    /// Initializes a new instance of the
    /// <see cref="ThreeTideHostedService"/> class.
    /// </summary>
    /// <param name="logger">Logger.</param>
    public ThreeTideHostedService(
        ILogger<ThreeTideHostedService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            Assembly? fileTransformationAssembly =
                AssemblyLoadContext.All
                    .SelectMany(context => context.Assemblies)
                    .FirstOrDefault(assembly =>
                        assembly.FullName?.Contains(
                            ".FileTransformation",
                            StringComparison.OrdinalIgnoreCase) == true);

            if (fileTransformationAssembly is null)
            {
                _logger.LogWarning(
                    "File Transformation is not loaded. " +
                    "3Tide frontend injection is inactive.");

                return Task.CompletedTask;
            }

            Type? pluginInterfaceType =
                fileTransformationAssembly.GetType(
                    "Jellyfin.Plugin.FileTransformation.PluginInterface");

            MethodInfo? registerMethod =
                pluginInterfaceType?.GetMethod(
                    "RegisterTransformation",
                    BindingFlags.Public |
                    BindingFlags.Static);

            if (registerMethod is null)
            {
                _logger.LogError(
                    "File Transformation RegisterTransformation " +
                    "method was not found.");

                return Task.CompletedTask;
            }

            string payloadJson = JsonSerializer.Serialize(new
            {
                id = TransformationId,
                fileNamePattern = "index.html",
                callbackAssembly =
                    typeof(IndexHtmlTransformation).Assembly.FullName,
                callbackClass =
                    typeof(IndexHtmlTransformation).FullName,
                callbackMethod =
                    nameof(IndexHtmlTransformation.Transform)
            });

            ParameterInfo[] parameters =
                registerMethod.GetParameters();

            if (parameters.Length != 1)
            {
                _logger.LogError(
                    "Unexpected RegisterTransformation signature: " +
                    "{ParameterCount} parameters.",
                    parameters.Length);

                return Task.CompletedTask;
            }

            Type payloadType = parameters[0].ParameterType;

            MethodInfo? parseMethod = payloadType.GetMethod(
                "Parse",
                BindingFlags.Public | BindingFlags.Static,
                binder: null,
                types: [typeof(string)],
                modifiers: null);

            if (parseMethod is null)
            {
                _logger.LogError(
                    "Unable to locate {PayloadType}.Parse(string).",
                    payloadType.FullName);

                return Task.CompletedTask;
            }

            object? payloadObject =
                parseMethod.Invoke(null, [payloadJson]);

            if (payloadObject is null)
            {
                _logger.LogError(
                    "Unable to create File Transformation payload.");

                return Task.CompletedTask;
            }

            registerMethod.Invoke(null, [payloadObject]);

            _logger.LogInformation(
                "3Tide frontend transformation registered.");
        }
        catch (TargetInvocationException exception)
        {
            _logger.LogError(
                exception.InnerException ?? exception,
                "File Transformation rejected the 3Tide registration.");
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Unable to register the 3Tide transformation.");
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}