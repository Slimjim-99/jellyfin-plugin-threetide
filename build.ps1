$ErrorActionPreference = "Stop"

dotnet restore .\ThreeTide.Plugin.sln
dotnet build .\ThreeTide.Plugin.sln -c Release --no-restore

$source = ".\Jellyfin.Plugin.ThreeTide\bin\Release\net9.0"
$artifactRoot = ".\artifacts"
$pluginDir = Join-Path $artifactRoot "3Tide"

New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item "$source\Jellyfin.Plugin.ThreeTide.dll" $pluginDir -Force
Copy-Item "$source\Jellyfin.Plugin.ThreeTide.pdb" $pluginDir -Force -ErrorAction SilentlyContinue

Compress-Archive `
    -Path "$pluginDir\*" `
    -DestinationPath "$artifactRoot\ThreeTide-0.1.0.zip" `
    -Force

Write-Host ""
Write-Host "Build erfolgreich:"
Write-Host "  $source\Jellyfin.Plugin.ThreeTide.dll"
Write-Host "  $artifactRoot\ThreeTide-0.1.0.zip"
