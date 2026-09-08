Add-Type -AssemblyName System.Drawing

function Create-PwaIcon($size, $isMaskable, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $g.Clear([System.Drawing.Color]::Transparent)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    
    # Background gradient
    $c1 = [System.Drawing.Color]::FromArgb(255, 0, 113, 227)    # #0071E3
    $c2 = [System.Drawing.Color]::FromArgb(255, 22, 119, 255)   # #1677FF
    $c3 = [System.Drawing.Color]::FromArgb(255, 94, 92, 230)    # #5E5CE6
    
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        $c2,
        $c3
    )

    if ($isMaskable) {
        # Maskable fills entire canvas
        $g.FillRectangle($brush, 0, 0, $size, $size)
    } else {
        # Squircle / rounded rectangle
        $radius = [int]($size * 0.22)
        $diameter = $radius * 2
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $margin = [int]($size * 0.04)
        $w = $size - $margin * 2
        $h = $size - $margin * 2
        $d = [int]($w * 0.44)

        $path.AddArc($margin, $margin, $d, $d, 180, 90)
        $path.AddArc($margin + $w - $d, $margin, $d, $d, 270, 90)
        $path.AddArc($margin + $w - $d, $margin + $h - $d, $d, $d, 0, 90)
        $path.AddArc($margin, $margin + $h - $d, $d, $d, 90, 90)
        $path.CloseFigure()

        $g.FillPath($brush, $path)

        # Subtle inner border
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), [float]($size * 0.015))
        $g.DrawPath($borderPen, $path)
        $borderPen.Dispose()
        $path.Dispose()
    }

    # Center Logo Text "W" or "Ai" or checkmark
    $fontSize = [float]($size * 0.42)
    $fontFamily = New-Object System.Drawing.FontFamily("Arial")
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Text offset
    $textRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.02), [float]$size, [float]$size)
    $g.DrawString("Ai", $font, $textBrush, $textRect, $format)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $brush.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
    $format.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

Create-PwaIcon 192 $false "c:\Users\Admin\OneDrive\附件\work\public\pwa-192x192.png"
Create-PwaIcon 512 $false "c:\Users\Admin\OneDrive\附件\work\public\pwa-512x512.png"
Create-PwaIcon 512 $true  "c:\Users\Admin\OneDrive\附件\work\public\pwa-maskable-512x512.png"
Create-PwaIcon 180 $false "c:\Users\Admin\OneDrive\附件\work\public\apple-touch-icon.png"
Create-PwaIcon 64  $false "c:\Users\Admin\OneDrive\附件\work\public\favicon.png"

Write-Host "PWA icons generated successfully!"
