<#
.SYNOPSIS
  Renames the repo folder from churchapps to machon-haruach.

  Close Cursor/VS Code and any terminals using this path before running.
#>
$ErrorActionPreference = "Stop"
$parent = "c:\Users\Red\Documents\Projects"
$old = Join-Path $parent "churchapps"
$new = Join-Path $parent "machon-haruach"

if (-not (Test-Path $old)) {
  if (Test-Path $new) { Write-Host "Already renamed: $new"; exit 0 }
  throw "Source folder not found: $old"
}
if (Test-Path $new) { throw "Target already exists: $new" }

Rename-Item -LiteralPath $old -NewName "machon-haruach"
Write-Host "Done. Reopen Cursor at: $new"
