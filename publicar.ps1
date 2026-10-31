# Sube a GitHub los archivos nuevos o cambiados y actualiza la pagina publicada.
# Uso:    powershell -ExecutionPolicy Bypass -File publicar.ps1
# Probar sin subir nada:  agregar -Probar
param(
    [string]$Repo = "PatOsk-r1/proyecto-tp",
    [switch]$Probar
)

$gh = "C:\Program Files\GitHub CLI\gh.exe"
$raiz = $PSScriptRoot

# Nunca se publican: el repo es publico y cualquiera puede leerlo.
# Guarda datos privados en la carpeta "privado" o con alguno de estos nombres.
$noPublicar = @("privado/*", "*.env", ".env*", "*.pem", "*.key", "*.p12", "*.pfx", "*secret*", "*password*", "node_modules/*", ".git/*", ".claude/*")
$sha1 = [System.Security.Cryptography.SHA1]::Create()

# Mismo calculo que usa Git para identificar el contenido de un archivo
function ShaGit([byte[]]$bytes) {
    $cabecera = [Text.Encoding]::ASCII.GetBytes("blob $($bytes.Length)`0")
    $hash = $sha1.ComputeHash([byte[]]($cabecera + $bytes))
    ($hash | ForEach-Object { $_.ToString("x2") }) -join ""
}

function ArchivosLocales {
    $lista = @{}
    Get-ChildItem $raiz -Recurse -File -Force | ForEach-Object {
        $rel = $_.FullName.Substring($raiz.Length + 1).Replace('\', '/')
        $nombre = $_.Name
        $excluido = $noPublicar | Where-Object { $rel -like $_ -or $nombre -like $_ }
        if ($excluido) {
            Write-Host "Omitido (privado): $rel"
        } else {
            $lista[$rel] = $_.FullName
        }
    }
    $lista
}

# Frena todo si un archivo parece tener una clave privada o un token adentro
function RevisarSecretos($archivos) {
    $patrones = "PRIVATE KEY-----", "ghp_[A-Za-z0-9]{30,}", "github_pat_[A-Za-z0-9_]{30,}", "sk_live_[A-Za-z0-9]{20,}"
    $encontrados = foreach ($rel in $archivos) {
        if ($rel -eq "publicar.ps1") { continue }
        $texto = [IO.File]::ReadAllText($locales[$rel])
        foreach ($p in $patrones) { if ($texto -match $p) { $rel; break } }
    }
    if ($encontrados) {
        Write-Host "PUBLICACION CANCELADA: posible dato secreto en:"
        $encontrados | ForEach-Object { Write-Host "  $_" }
        Write-Host "Sacalo del archivo o movelo a la carpeta 'privado'."
        exit 1
    }
}

# Archivos que ya estan en GitHub (ruta -> sha)
$rama = & $gh api "repos/$Repo" --jq .default_branch
if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo leer el repo. Revisa 'gh auth status'."; exit 1 }
$remotos = @{}
$arbol = (& $gh api "repos/$Repo/git/trees/${rama}?recursive=1") -join "`n" | ConvertFrom-Json
$arbol.tree | Where-Object { $_.type -eq "blob" } | ForEach-Object { $remotos[$_.path] = $_.sha }

$locales = ArchivosLocales
$cambiados = @($locales.Keys | Where-Object { $remotos[$_] -ne (ShaGit ([IO.File]::ReadAllBytes($locales[$_]))) } | Sort-Object)

if ($cambiados.Count -eq 0) { Write-Host "No hay cambios para publicar."; exit 0 }
RevisarSecretos $cambiados

# Sin la configuracion de Firebase nadie podria entrar a la pagina publicada
if ([IO.File]::ReadAllText((Join-Path $raiz "js/firebase-config.js")) -match "firebaseConfig = null") {
    Write-Host "PUBLICACION CANCELADA: falta completar js/firebase-config.js."
    exit 1
}

# Sube la VERSION del service worker para que el iPhone baje lo nuevo
$sw = Join-Path $raiz "sw.js"
$texto = [IO.File]::ReadAllText($sw)
if ($texto -match 'const VERSION = "v(\d+)";') {
    $nueva = "v$([int]$Matches[1] + 1)"
    Write-Host "VERSION del service worker: v$($Matches[1]) -> $nueva"
    if (-not $Probar) {
        [IO.File]::WriteAllText($sw, ($texto -replace 'const VERSION = "v\d+";', "const VERSION = `"$nueva`";"))
    }
    if ($cambiados -notcontains "sw.js") { $cambiados += "sw.js" }
}

Write-Host "Archivos a subir ($($cambiados.Count)):"
$cambiados | ForEach-Object { Write-Host "  $_" }
if ($Probar) { Write-Host "Modo prueba: no se subio nada."; exit 0 }

$tmp = Join-Path $env:TEMP "publicar-proyecto-tp.json"
$errores = 0
foreach ($rel in $cambiados) {
    $cuerpo = @{
        message = "Actualizar $rel"
        content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($locales[$rel]))
        branch = $rama
    }
    if ($remotos[$rel]) { $cuerpo.sha = $remotos[$rel] }
    [IO.File]::WriteAllText($tmp, ($cuerpo | ConvertTo-Json -Compress))
    & $gh api -X PUT "repos/$Repo/contents/$([Uri]::EscapeUriString($rel))" --input $tmp --silent
    if ($LASTEXITCODE -ne 0) { Write-Host "FALLO: $rel"; $errores++ }
}
Remove-Item $tmp -ErrorAction SilentlyContinue

if ($errores -gt 0) { Write-Host "$errores archivo(s) no se pudieron subir."; exit 1 }
$url = & $gh api "repos/$Repo/pages" --jq .html_url
Write-Host "Listo. En 1-2 minutos se ve en $url"
