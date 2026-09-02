Set shell = CreateObject("Shell.Application")
If WScript.Arguments.Count > 0 Then
    Dim fullPath, i
    fullPath = WScript.Arguments(0)
    For i = 1 To WScript.Arguments.Count - 1
        fullPath = fullPath & " " & WScript.Arguments(i)
    Next
    shell.ShellExecute fullPath, "", "", "open", 1
End If
