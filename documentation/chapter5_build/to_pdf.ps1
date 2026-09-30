param(
    [string]$Docx = "C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_5_System_Implementation_CODE_TESTING.docx",
    [string]$Pdf  = "C:\Users\SAI\Desktop\Raksha\documentation\CHAPTER_5_System_Implementation_CODE_TESTING.pdf"
)

$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Docx, $false, $true)
    $doc.Repaginate()
    $pages = $doc.ComputeStatistics(2)   # wdStatisticPages
    $words = $doc.ComputeStatistics(0)   # wdStatisticWords
    $doc.SaveAs([ref]$Pdf, [ref]17)      # wdFormatPDF
    $doc.Close($false)
    "pages: $pages"
    "words: $words"
    "pdf:   $Pdf"
} finally {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
