$port = 3000
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Output "SERVER_STARTED: http://localhost:$port"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".webp" = "image/webp"
    ".json" = "application/json"
    ".txt"  = "text/plain"
}

try {
    $hostName = [System.Net.Dns]::GetHostName()
    $ips = [System.Net.Dns]::GetHostAddresses($hostName) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' }
    foreach ($ip in $ips) {
        Write-Output "NETWORK_ACCESS: http://$($ip.IPAddressToString):$port"
    }
} catch {}


while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        $line = $reader.ReadLine()
        if ($line) {
            $tokens = $line.Split(" ")
            if ($tokens.Length -ge 2) {
                $rawPath = $tokens[1].Split("?")[0]
                if ($rawPath -eq "/" -or $rawPath -eq "") { $rawPath = "/index.html" }
                $relPath = $rawPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
                $localPath = Join-Path $PWD $relPath
                
                if (Test-Path $localPath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                    $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                    $bytes = [System.IO.File]::ReadAllBytes($localPath)
                    
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $fallback = Join-Path $PWD "index.html"
                    $bytes = [System.IO.File]::ReadAllBytes($fallback)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                }
            }
        }
        $stream.Flush()
        $client.Close()
    } catch {
        # Loop silently on transient network errors
    }
}
