# 3Tide Plugin for Jellyfin

Target: **Jellyfin Server 10.11.11**

3Tide provides:

- custom 3Tide branding
- optional player-safe styling
- optional Live TV styling
- optional Seerr button
- Seerr button position: sidebar, header, or both
- File Transformation based frontend injection

## Requirements

- Jellyfin Server 10.11.11
- File Transformation compatible with 10.11.11
- .NET 9 SDK for local builds

File Transformation repository:

```text
https://www.iamparadox.dev/jellyfin/plugins/manifest.json
```

## Local build

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\build.ps1
```

Output:

```text
Jellyfin.Plugin.ThreeTide\bin\Release\net9.0\Jellyfin.Plugin.ThreeTide.dll
artifacts\ThreeTide-0.1.0.zip
```

## Create the GitHub repository

1. Sign in to GitHub.
2. Create a new empty repository named `jellyfin-plugin-threetide`.
3. Do not add a README, license, or `.gitignore` on GitHub because these files already exist here.
4. Open PowerShell in this project folder.

```powershell
git init
git add .
git commit -m "Initial 3Tide plugin"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/jellyfin-plugin-threetide.git
git push -u origin main
```

Replace `YOUR-NAME` with your GitHub username.

## Automatic builds

Every push to `main` or `develop` runs:

```text
.github/workflows/build.yml
```

The workflow uploads:

- `ThreeTide-DLL`
- `ThreeTide-Plugin`

Open the GitHub repository and select:

```text
Actions → latest Build → Artifacts
```

## Create a release

Update the version in:

- `Directory.Build.props`
- `build.yaml`

Then create and push a tag:

```powershell
git add .
git commit -m "Release 0.1.0"
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

GitHub automatically builds and creates a release containing:

```text
ThreeTide-0.1.0.zip
ThreeTide-0.1.0.sha256
```

## Manual installation

1. Stop Jellyfin.
2. Create a plugin folder named `3Tide`.
3. Copy `Jellyfin.Plugin.ThreeTide.dll` into the folder.
4. Start Jellyfin.
5. Open Dashboard → Plugins → My Plugins → 3Tide.
6. Configure the theme and optional Seerr button.
7. Restart Jellyfin after frontend setting changes.

## Important testing order

1. Confirm the plugin loads.
2. Confirm the settings page opens.
3. Test only the Seerr button.
4. Enable the base theme.
5. Test iPad video playback.
6. Enable the player theme.
7. Enable Live TV last.

## Jellyfin 12

This branch is for Jellyfin 10.11.11 only. Create a separate `jellyfin-12` branch when Jellyfin 12 is released.
