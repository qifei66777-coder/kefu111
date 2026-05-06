# 将客服源码目录重命名为 kefu（与 deploy 脚本、文档中的路径一致）
# 使用前提：关闭 Cursor/VS Code 等占用该目录的程序，或在资源管理器中操作。
# 用法（PowerShell）：  cd d:\kefu
#                      .\rename_project_folder_to_kefu.ps1

$ErrorActionPreference = 'Stop'
$parent = $PSScriptRoot
$reserved = @('deploy', 'docs', 'kefu')

$dirs = Get-ChildItem -LiteralPath $parent -Directory | Where-Object { $reserved -notcontains $_.Name }
if ($dirs.Count -eq 0) {
    Write-Host "未找到需要重命名的目录（可能已名为 kefu）。"
    exit 0
}
if ($dirs.Count -gt 1) {
    Write-Host "发现多个非保留目录，请手动处理："
    $dirs | ForEach-Object { Write-Host " - $($_.FullName)" }
    exit 1
}

$src = $dirs[0].FullName
$dst = Join-Path $parent 'kefu'
if (Test-Path -LiteralPath $dst) {
    Write-Host "目标已存在: $dst"
    exit 1
}

Rename-Item -LiteralPath $src -NewName 'kefu'
Write-Host "已重命名: $src -> $dst"
Write-Host "请在 Cursor 中重新打开工作区文件夹: $dst（或打开 d:\kefu 后确认子目录为 kefu）"
