# dev.ps1 - local static server for Threadedminds
$port = 8000

Write-Host "Serving on http://localhost:$port/ (Ctrl+C to stop)"
py -m http.server $port
