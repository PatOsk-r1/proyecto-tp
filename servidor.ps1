# Servidor local para probar la app en la PC: http://localhost:8080
# Uso: powershell -ExecutionPolicy Bypass -File servidor.ps1
param([int]$Puerto = 8080)

$raiz = $PSScriptRoot
$tipos = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".json" = "application/json"
    ".webmanifest" = "application/manifest+json"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".svg" = "image/svg+xml"
    ".mp3" = "audio/mpeg"
    ".wav" = "audio/wav"
}

$servidor = New-Object System.Net.HttpListener
$servidor.Prefixes.Add("http://localhost:$Puerto/")
$servidor.Start()
Write-Host "Sirviendo $raiz en http://localhost:$Puerto (Ctrl+C para cortar)"

try {
    while ($servidor.IsListening) {
        $ctx = $servidor.GetContext()
        try {
            $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
            $archivo = Join-Path $raiz $ruta
            if (Test-Path $archivo -PathType Container) { $archivo = Join-Path $archivo "index.html" }

            $completo = [System.IO.Path]::GetFullPath($archivo)
            if ($completo.StartsWith($raiz) -and (Test-Path $completo -PathType Leaf)) {
                $bytes = [System.IO.File]::ReadAllBytes($completo)
                $ext = [System.IO.Path]::GetExtension($completo).ToLower()
                $ctx.Response.ContentType = $(if ($tipos[$ext]) { $tipos[$ext] } else { "application/octet-stream" })
                $ctx.Response.ContentLength64 = $bytes.Length
                if ($ctx.Request.HttpMethod -ne "HEAD") {
                    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $ctx.Response.StatusCode = 404
            }
        } catch {
            Write-Host "Error en $($ctx.Request.Url): $_"
        } finally {
            $ctx.Response.Close()
        }
    }
} finally {
    $servidor.Stop()
}
