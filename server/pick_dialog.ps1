Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Title = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("6K+36YCJ5oup6KaB6ZO+5o6l5Yiw5bel5L2c5Y+w55qE5pys5Zyw5paH5Lu2"))
$dlg.Filter = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("5bi455So5paH5Lu2ICgqLnhsc3g7Ki54bHNtOyoueGxzOyouZG9jeDsqLmRvYzsqLnBwdHg7Ki5wZGY7Ki50eHQpfCoueGxzeDsqLnhsc207Ki54bHM7Ki5kb2N4OyouZG9jOyoucHB0eDsqLnBkZjsqLnR4dHzmiYDmnInmlofku7YgKCouKil8Ki4q"))
$dlg.InitialDirectory = [Environment]::GetFolderPath("Desktop")
$dlg.Multiselect = $false
$dlg.RestoreDirectory = $true
$topForm = New-Object System.Windows.Forms.Form
$topForm.TopMost = $true
$res = $dlg.ShowDialog($topForm)
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    [System.IO.File]::WriteAllText("C:\Users\Admin\OneDrive\2304~1\work\server\data\picked_file.txt", $dlg.FileName, [System.Text.Encoding]::UTF8)
} else {
    [System.IO.File]::WriteAllText("C:\Users\Admin\OneDrive\2304~1\work\server\data\picked_file.txt", "CANCELLED", [System.Text.Encoding]::UTF8)
}
