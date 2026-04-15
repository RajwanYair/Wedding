# scripts/test-sheets.ps1 — Google Sheets integration test via PowerShell
#
# WHEN TO USE THIS SCRIPT
#   On Windows behind a corporate proxy (e.g. Intel proxy-dmz.intel.com:912),
#   Node.js native fetch (undici) and curl cannot POST to Google Apps Script.
#   PowerShell's Invoke-RestMethod honours the Windows system proxy and works.
#
# USAGE
#   cd <wedding-root>
#   .\scripts\test-sheets.ps1              # run all tests
#   .\scripts\test-sheets.ps1 -Cleanup    # also delete test rows after run
#
# REQUIRES
#   PowerShell 5.1+ (shipped with Windows 10/11)
#   Internet access (via system proxy on Intel machines)
#
# NOTES
#   • Hebrew / RTL values must be Unicode-escaped in single-quoted JSON strings
#     when building bodies inline, OR written to a UTF-8 temp file first.
#   • GViz responses are cached ~30 s by Google; row counts may lag slightly.
#   • Deployed GAS v1.5.0 does NOT support getAll – use GViz for read-back.
#   • GAS v1.5.0 replaceAll on Config silently drops unknown key rows on some
#     deployments; use append as a fallback for name fields (groom/bride etc).

param(
  [switch]$Cleanup   # pass -Cleanup to remove test rows after assertions
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$URL   = "https://script.google.com/macros/s/AKfycbxGYuciHXLurYbZn9s-Gx8uMmBSn1dZ20xOFoZkk3JXg3RrzR741jz2tsIKgLtN8cHQ/exec"
$SHEET_ID = "1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA"

# ── Helpers ───────────────────────────────────────────────────────────────

function Gas-Post($body, [string]$label) {
  Write-Host "`n▶ $label"
  # Write to UTF-8 temp file so Hebrew characters survive JSON serialisation
  $tmp = [System.IO.Path]::GetTempFileName() + ".json"
  $body | ConvertTo-Json -Depth 10 -Compress | Set-Content -Path $tmp -Encoding UTF8
  try {
    $raw = Get-Content $tmp -Raw -Encoding UTF8
    $r   = Invoke-RestMethod -Uri $URL -Method Post -Body $raw -ContentType "application/json; charset=utf-8"
    Write-Host "  ✅ ok=$($r.ok)  rows=$($r.count)  err=$($r.error)"
    return $r
  } catch {
    Write-Host "  ❌ ERROR: $_"
    return $null
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}

function Gas-Get([string]$query, [string]$label) {
  Write-Host "`n▶ $label"
  try {
    $r = Invoke-RestMethod "$URL`?$query"
    Write-Host "  ✅ " ($r | ConvertTo-Json -Depth 3 -Compress)
    return $r
  } catch {
    Write-Host "  ❌ ERROR: $_"
    return $null
  }
}

function GViz-Read([string]$sheet, [string]$label) {
  Write-Host "`n▶ $label"
  try {
    $uri = "https://docs.google.com/spreadsheets/d/$SHEET_ID/gviz/tq?tqx=out:json&sheet=$([uri]::EscapeDataString($sheet))"
    $raw = (Invoke-WebRequest $uri -UseBasicParsing).Content
    $json = $raw -replace '^[^(]+\(|\);?\s*$', ''
    $tbl  = ($json | ConvertFrom-Json).table
    Write-Host "  ✅ $($tbl.rows.Count) data row(s)"
    $tbl.rows | Select-Object -First 5 | ForEach-Object {
      Write-Host "     $($_.c[0].v) = $($_.c[1].v -join '')"
    }
    return $tbl
  } catch {
    Write-Host "  ❌ GViz ERROR: $_"
    return $null
  }
}

# ── Test data ─────────────────────────────────────────────────────────────

$ATTENDEES_HEADER = @("id","firstName","lastName","phone","email","count","children",
                       "status","side","group","relationship","meal","mealNotes",
                       "accessibility","transport","tableId","gift","notes","sent",
                       "rsvpDate","createdAt","updatedAt")

$ATTENDEES_ROWS = @(
  $ATTENDEES_HEADER,
  @("ps-test-001","Alice","Cohen","0545000001","alice@test.com",2,0,"confirmed","bride","friends","friend","regular","",0,"","","","",0,"2026-04-15","2026-04-15T10:00:00Z","2026-04-15T10:00:00Z"),
  @("ps-test-002","Bob","Levi","0545000002","bob@test.com",3,1,"confirmed","groom","family","cousin","kosher","",1,"","","","",1,"2026-04-15","2026-04-15T11:00:00Z","2026-04-15T11:00:00Z")
)

$TABLES_ROWS = @(
  @("id","name","capacity","shape"),
  @("ps-tbl-001","Test Table 1",10,"round"),
  @("ps-tbl-002","Test Table 2",8,"rect")
)

# Config: all 13 Elior & Tova wedding defaults (real data, keep permanently)
$CONFIG_ROWS = @(
  @("key","value"),
  @("date","2026-05-07"),
  @("hebrewDate","כ' באייר התשפ''ו"),
  @("time","18:00"),
  @("ceremonyTime","18:50"),
  @("venue","נוף הירדן"),
  @("address","מצפה יריחו"),
  @("wazeLink","https://ul.waze.com/ul?ll=31.81436241,35.39636135&navigate=yes&zoom=17"),
  @("giftBudget","0"),
  @("rsvpDeadline",""),
  @("groom","אליאור"),
  @("groomEn","Elior"),
  @("bride","טובה"),
  @("brideEn","Tova")
)

# ── Run tests ─────────────────────────────────────────────────────────────

Write-Host "═══════════════════════════════════════════════════"
Write-Host " Google Sheets Integration Test (PowerShell)"
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "═══════════════════════════════════════════════════"

# 1. Connection check
Gas-Get "action=ping" "GET /exec — connection check"

# 2. Ensure all tabs exist
Gas-Post @{ action = "ensureSheets" } "POST ensureSheets — create missing tabs"

# 3. Push test Attendees
Gas-Post @{ action = "replaceAll"; sheet = "Attendees"; rows = $ATTENDEES_ROWS } `
         "POST replaceAll → Attendees (2 test guests)"

# 4. Push test Tables
Gas-Post @{ action = "replaceAll"; sheet = "Tables"; rows = $TABLES_ROWS } `
         "POST replaceAll → Tables (2 test tables)"

# 5. Push Config (real wedding data — permanent)
#
#    NOTE: GAS v1.5.0 replaceAll accepts all rows when written via UTF-8 temp file.
#    If some rows are missing after replaceAll, fall back to individual appends:
#
#      Gas-Post @{ action="replaceAll"; sheet="Config"; rows=($CONFIG_ROWS | Select-Object -First 10) } "replaceAll base rows"
#      $CONFIG_ROWS[10..13] | ForEach-Object {
#        Gas-Post @{ action="append"; sheet="Config"; row=$_ } "append $_[0]"
#      }
Gas-Post @{ action = "replaceAll"; sheet = "Config"; rows = $CONFIG_ROWS } `
         "POST replaceAll → Config (Elior & Tova wedding defaults)"

# 6. Verify via GViz read-back (may show stale cache for ~30 s)
GViz-Read "Attendees" "READ Attendees via GViz"
GViz-Read "Tables"    "READ Tables via GViz"
GViz-Read "Config"    "READ Config via GViz"

# 7. Optional cleanup — remove test-only rows; keep Config permanently
if ($Cleanup) {
  Write-Host "`n── Cleanup ──────────────────────────────────────────"
  Gas-Post @{ action = "deleteRow"; sheet = "Attendees"; id = "ps-test-001" } "DELETE ps-test-001"
  Gas-Post @{ action = "deleteRow"; sheet = "Attendees"; id = "ps-test-002" } "DELETE ps-test-002"
  # Reset Attendees to header-only
  Gas-Post @{ action = "replaceAll"; sheet = "Attendees"; rows = @(,$ATTENDEES_HEADER) } `
           "RESET Attendees → header only"
  # Reset Tables to header-only
  Gas-Post @{ action = "replaceAll"; sheet = "Tables"; rows = @(@("id","name","capacity","shape")) } `
           "RESET Tables → header only"
  Write-Host "  Config left intact (real wedding data)."
}

Write-Host "`n═══════════════════════════════════════════════════"
Write-Host " Done."
Write-Host "═══════════════════════════════════════════════════"
