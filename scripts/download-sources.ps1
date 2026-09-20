$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force 'sources' | Out-Null
$names = '乾 坤 屯 蒙 需 訟 師 比 小畜 履 泰 否 同人 大有 謙 豫 隨 蠱 臨 觀 噬嗑 賁 剝 復 无妄 大畜 頤 大過 坎 離 咸 恒 遯 大壯 晉 明夷 家人 睽 蹇 解 損 益 夬 姤 萃 升 困 井 革 鼎 震 艮 漸 歸妹 豐 旅 巽 兌 渙 節 中孚 小過 既濟 未濟 序卦 雜卦'.Split(' ')
$root = (Get-Location).Path
$names | ForEach-Object -Parallel {
  $name = $_
  $path = Join-Path $using:root "sources/$name.json"
  if (!(Test-Path $path)) {
    $prefix = if ($name -in @('序卦','雜卦')) { '易傳' } else { '周易' }
    $title = [uri]::EscapeDataString("$prefix/$name")
    $url = "https://zh.wikisource.org/w/api.php?action=query&prop=revisions&rvprop=ids%7Ctimestamp%7Ccontent&rvslots=main&format=json&titles=$title"
    Start-Sleep -Seconds 5
    & curl.exe --silent --show-error --fail --retry 5 --retry-all-errors --retry-delay 5 --max-time 60 -L $url -o $path
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $name" }
  }
  Write-Output $name
} -ThrottleLimit 1

