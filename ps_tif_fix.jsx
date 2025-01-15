#target photoshop

var inputFolder, outputFolder;
var processedFiles = [];

function main() {
    inputFolder = Folder.selectDialog("処理する画像が含まれるフォルダを選択してください。");
    outputFolder = Folder.selectDialog("出力先フォルダを選択してください。");

    if (inputFolder != null && outputFolder != null) {
        var fileList = inputFolder.getFiles(/\.(jpg|jpeg|png|tif|tiff|psd)$/i);

        for (var i = 0; i < fileList.length; i++) {
            // ライン14の修正
            if (!isFileProcessed(fileList[i].name)) {
                processFile(fileList[i]);
                processedFiles.push(fileList[i].name);
            }

            // 追加する関数
            function isFileProcessed(fileName) {
                for (var i = 0; i < processedFiles.length; i++) {
                    if (processedFiles[i] === fileName) {
                        return true;
                    }
                }
                return false;
            }
        }

        alert("処理が完了しました。");
    }
}

function processFile(file) {
    app.open(file);
    var doc = app.activeDocument;
    
    // 白い余白のトリミング
    trimWhiteSpace(doc);
    
    // 解像度を350に設定（サイズは変更しない）
    doc.resizeImage(undefined, undefined, 350, ResampleMethod.NONE);
    
    // 画像サイズの調整（4000pxを超える場合のみ）
    if (doc.width > 4000 || doc.height > 4000) {
        if (doc.width > doc.height) {
            doc.resizeImage(4000, null, 350, ResampleMethod.BICUBIC);
        } else {
            doc.resizeImage(null, 4000, 350, ResampleMethod.BICUBIC);
        }
    }
    
    var baseName = doc.name.split('.')[0];
    var fileExtension = file.name.split('.').pop().toLowerCase();
    
    // PNGファイルの場合、TIFFで保存
    if (fileExtension === "png") {
        saveAsTIFF(doc, outputFolder + "/" + baseName + ".tif");
    }
    
    // レイヤーの統合
    if (doc.layers.length > 1) {
        doc.flatten();
    }
    
    // カラーモードをCMYKに変換
    if (doc.mode != DocumentMode.CMYK) {
        doc.changeMode(ChangeMode.CMYK);
    }
    
    // JPEGで保存（すべてのファイル）
    saveAsJPEG(doc, outputFolder + "/" + baseName + ".jpg");
    
    doc.close(SaveOptions.DONOTSAVECHANGES);
}

function trimWhiteSpace(doc) {
    // トリミング処理を実装
    // （この関数の詳細な実装は省略します）
}

// その他の関数（checkTransparency, saveAsJPEG, saveAsTIFF）は前回のスクリプトと同じ

main();

function saveAsJPEG(doc, filePath) {
    var jpegOptions = new JPEGSaveOptions();
    jpegOptions.quality = 8; // 最高品質
    jpegOptions.embedColorProfile = true;
    jpegOptions.formatOptions = FormatOptions.STANDARDBASELINE;
    jpegOptions.matte = MatteType.NONE;
    doc.saveAs(new File(filePath), jpegOptions, true, Extension.LOWERCASE);
}

function saveAsTIFF(doc, filePath) {
    var tiffOptions = new TiffSaveOptions();
    tiffOptions.imageCompression = TIFFEncoding.TIFFLZW;
    tiffOptions.embedColorProfile = true;
    tiffOptions.transparency = true;
    doc.saveAs(new File(filePath), tiffOptions, true, Extension.LOWERCASE);
}
