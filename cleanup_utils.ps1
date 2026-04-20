$keepList = @("currency.js", "date.js", "form-helpers.js", "guest-search.js", "haptic.js", "locale-detector.js", "md-to-html.js", "message-templates.js", "misc.js", "orientation.js", "phone.js", "qr-code.js", "sanitize.js", "undo.js", "rsvp-deadline.js")
$utilsDir = "src/utils"
$testsDir = "tests/unit"
$deletedUtils = 0
$deletedTests = 0
Get-ChildItem -Path $utilsDir -Filter *.js | ForEach-Object {
    if ($keepList -notcontains $_.Name) {
        $baseName = $_.BaseName
        $testFile = Join-Path $testsDir "$baseName.test.mjs"
        Remove-Item $_.FullName -Force
        $deletedUtils++
        if (Test-Path $testFile) {
            Remove-Item $testFile -Force
            $deletedTests++
        }
    }
}
Write-Output "Deleted Utils: $deletedUtils"
Write-Output "Deleted Tests: $deletedTests"
