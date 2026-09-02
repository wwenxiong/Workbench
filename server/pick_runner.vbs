Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\pick_dialog.ps1"
cmd = "powershell.exe -Sta -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & psScript & """"
shell.Run cmd, 0, False
