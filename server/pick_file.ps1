Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Title = "选择要链接到工作台的本地文件"
$dlg.Filter = "常用文件 (*.xlsx;*.xlsm;*.xls;*.docx;*.doc;*.pptx;*.pdf;*.txt;*.csv;*.json;*.png;*.jpg)|*.xlsx;*.xlsm;*.xls;*.docx;*.doc;*.pptx;*.pdf;*.txt;*.csv;*.json;*.png;*.jpg|所有文件 (*.*)|*.*"
$dlg.Multiselect = $false
$dlg.RestoreDirectory = $true
$res = $dlg.ShowDialog()
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Write-Output $dlg.FileName
}
