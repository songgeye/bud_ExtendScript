#target photoshop

var inputFolder, outputFolder;
var processedFiles = [];
var maxDepth = 2; // 最大階層の深さ（1=現在のフォルダ、2=1階層下のサブフォルダまで、3=2階層下のサブフォルダまで）

function main() {
    inputFolder = Folder.selectDialog("処理する画像が含まれるフォルダを選択してください。");
    outputFolder = Folder.selectDialog("出力先フォルダを選択してください。");

    if (inputFolder != null && outputFolder != null) {
        // 再帰的にフォルダを処理（深さ0から開始）
        processFolder(inputFolder, 0);
        alert("処理が完了しました。");
    }
}

// フォルダを再帰的に処理する関数
function processFolder(folder, depth) {
    // 最大深さを超えた場合は処理しない
    if (depth > maxDepth) {
        return;
    }
    
    // 現在のフォルダ内の画像ファイルを処理
    var fileList = folder.getFiles(/\.(jpg|jpeg|png|tif|tiff|psd|eps|svg|gif|jfif|webp|bmp|heic|NEF|CR2|avif|jpf|~tmp)$/i);
    for (var i = 0; i < fileList.length; i++) {
        if (!isFileProcessed(fileList[i].name)) {
            processFile(fileList[i], folder);
            processedFiles.push(fileList[i].name);
        }
    }
    
    // サブフォルダを取得して処理
    var subFolders = folder.getFiles(function(file) {
        return file instanceof Folder;
    });
    
    // 各サブフォルダを再帰的に処理
    for (var j = 0; j < subFolders.length; j++) {
        processFolder(subFolders[j], depth + 1);
    }
}

function isFileProcessed(fileName) {
    for (var i = 0; i < processedFiles.length; i++) {
        if (processedFiles[i] === fileName) {
            return true;
        }
    }
    return false;
}

function processFile(file, sourceFolder) {
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
    
    // 元フォルダの相対パスを取得して出力先に同じ構造を作成
    var relativePath = getRelativePath(inputFolder, sourceFolder);
    var targetFolder = new Folder(outputFolder + relativePath);
    
    // 出力先フォルダが存在しない場合は作成
    if (!targetFolder.exists) {
        targetFolder.create();
    }
    
    if (fileExtension === "png" || fileExtension === "gif") {
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

// 入力フォルダに対する相対パスを取得する関数
function getRelativePath(baseFolder, currentFolder) {
    // パスを文字列として取得
    var basePath = baseFolder.absoluteURI;
    var currentPath = currentFolder.absoluteURI;
    
    // ベースパスがカレントパスの先頭にある場合、相対パスを返す
    if (currentPath.indexOf(basePath) === 0) {
        return currentPath.substring(basePath.length);
    }
    
    // ベースパス内にない場合は空文字を返す
    return "";
}

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

main();
