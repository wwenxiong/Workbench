using System;
using System.IO;
using System.Text;
using System.Windows.Forms;

static class Program {
    [STAThread]
    static void Main(string[] args) {
        string outputPath = @"C:\Users\Admin\OneDrive\2304~1\work\server\data\picked_file.txt";
        if (args.Length > 0 && !string.IsNullOrWhiteSpace(args[0])) {
            outputPath = args[0];
        }

        try {
            using (var dlg = new OpenFileDialog()) {
                dlg.Title = "请选择要链接到工作台的本地文件";
                dlg.Filter = "常用办公文件 (*.xlsx;*.xlsm;*.xls;*.docx;*.doc;*.pptx;*.pdf;*.txt)|*.xlsx;*.xlsm;*.xls;*.docx;*.doc;*.pptx;*.pdf;*.txt|所有文件 (*.*)|*.*";
                dlg.InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                dlg.Multiselect = false;
                dlg.RestoreDirectory = true;

                using (var form = new Form()) {
                    form.TopMost = true;
                    form.WindowState = FormWindowState.Normal;
                    form.StartPosition = FormStartPosition.CenterScreen;
                    
                    DialogResult res = dlg.ShowDialog(form);
                    if (res == DialogResult.OK) {
                        File.WriteAllText(outputPath, dlg.FileName, Encoding.UTF8);
                    } else {
                        File.WriteAllText(outputPath, "CANCELLED", Encoding.UTF8);
                    }
                }
            }
        } catch (Exception ex) {
            File.WriteAllText(outputPath, "ERROR:" + ex.Message, Encoding.UTF8);
        }
    }
}
