#target photoshop

var inputFolder, outputFolder;
var processedFiles = [];

function main() {
    inputFolder = Folder.selectDialog("処理する画像が含まれるフォルダを選択してください。");
    outputFolder = Folder.selectDialog("出力先フォルダを選択してください。");

    if (inputFolder != null && outputFolder != null) {
        var fileList = inputFolder.getFiles(/\.(jpg|jpeg|png|tif|tiff|psd)$/i);

        for (var i = 0; i < fileList.length; i++) {
            if (!isFileProcessed(fileList[i].name)) {
                processFile(fileList[i]);
                processedFiles.push(fileList[i].name);
            }

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
    
    doc.resizeImage(undefined, undefined, 350, ResampleMethod.NONE);
    
    if (doc.width > 4000 || doc.height > 4000) {
        if (doc.width > doc.height) {
            doc.resizeImage(4000, null, 350, ResampleMethod.BICUBIC);
        } else {
            doc.resizeImage(null, 4000, 350, ResampleMethod.BICUBIC);
        }
    }
    
    var baseName = doc.name.split('.')[0];
    var fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === "png, eps, gif") {
        if (doc.mode != DocumentMode.CMYK) {
            doc.changeMode(ChangeMode.CMYK);
        }
        saveAsTIFF(doc, outputFolder + "/" + baseName + ".tif");
    }
    
    if (doc.layers.length > 1) {
        doc.flatten();
    }
    
    if (doc.mode != DocumentMode.CMYK) {
        doc.changeMode(ChangeMode.CMYK);
    }
    
    saveAsJPEG(doc, outputFolder + "/" + baseName + ".jpg");
    
    doc.close(SaveOptions.DONOTSAVECHANGES);
}

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
