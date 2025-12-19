<#
.SYNOPSIS
    Resizes the main extension icon into 16x16, 48x48, and 128x128 versions.

.DESCRIPTION
    This script takes 'Thoughtful_Voice_icon.png' as source and generates the required
    browser extension icons with high-quality scaling.

.USAGE
    Open PowerShell in this directory and run:
    powershell -ExecutionPolicy Bypass -File resize-icons.ps1
#>

Add-Type -AssemblyName System.Drawing

$sourceImage = "Thoughtful_Voice_icon.png"
$sizes = @(16, 48, 128)

$img = [System.Drawing.Image]::FromFile((Resolve-Path $sourceImage))

foreach ($size in $sizes) {
    $resized = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($img, 0, 0, $size, $size)
    
    $outputFile = "icon$size.png"
    $resized.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $resized.Dispose()
    
    Write-Host "Created $outputFile ($size x $size)"
}

$img.Dispose()
Write-Host "All icons resized successfully!"
