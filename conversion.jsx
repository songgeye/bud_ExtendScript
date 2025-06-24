#target photoshop

var inputFolder, outputFolder;
var processedFiles = [];
var maxDepth = 2; // 最大階層の深さ（1=現在のフォルダ、2=1階層下のサブフォルダまで、3=2階層下のサブフォルダまで）
var globalCounter = 1; // ★追加: グローバル通し番号

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
    // ★改良: 処理済みファイルリストのチェックを削除。getUniqueFileNameで重複回避するため。
    var fileList = folder.getFiles(/\.(jpg|jpeg|png|tif|tiff|psd|eps|svg|gif|jfif|webp|bmp|heic|avif|jpf|~tmp|CR|K25|KDC|CRW|CR2|CR3|ERF|NEF|NRW|ORF|PEF|RW2|ARW|SRF|SR2|X3F|RWL|BAY|DNG)$/i);
    for (var i = 0; i < fileList.length; i++) {
        processFile(fileList[i], folder);
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

// ★削除: isFileProcessed関数はgetUniqueFileNameで重複回避するため不要になりました。

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

    // ★追加・改良: グローバル通し番号、機種依存文字除去、ファイル名重複回避
    var sanitizedBaseName = sanitizeFileName(baseName);
    var uniqueFileNamePrefix = getUniqueFileName(targetFolder, globalCounter + "_" + sanitizedBaseName); // グローバル通し番号とサニタイズされた名前を結合
    globalCounter++; // グローバル通し番号をインクリメント
    
    if (fileExtension === "png" || fileExtension === "gif") {
        if (doc.mode != DocumentMode.CMYK) {
            doc.changeMode(ChangeMode.CMYK);
        }
        // ★改良: 保存ファイル名にuniqueFileNamePrefixを使用
        saveAsTIFF(doc, targetFolder.fsName + "/" + uniqueFileNamePrefix + ".tif");
    }
    
    if (doc.layers.length > 1) {
        doc.flatten();
    }
    
    if (doc.mode != DocumentMode.CMYK) {
        doc.changeMode(ChangeMode.CMYK);
    }
    
    // ★改良: 保存ファイル名にuniqueFileNamePrefixを使用
    saveAsJPEG(doc, targetFolder.fsName + "/" + uniqueFileNamePrefix + ".jpg");
    
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

// ★追加: 機種依存文字を除去する関数
function sanitizeFileName(fileName) {
    var sanitized = fileName;
    // ①〜⑳、㉑〜㉟
    sanitized = sanitized.replace(/[\u2460-\u2473]/g, ""); // 丸数字1-20
    sanitized = sanitized.replace(/[\u3251-\u325F]/g, ""); // 丸数字21-35 (一部範囲外も含むが安全策として)
    // ㈱、㈲、㈹
    sanitized = sanitized.replace(/[\u3231\u3232\u3239]/g, "");
    // ㍾、㍽、㍼、㍻
    sanitized = sanitized.replace(/[\u337E-\u3381]/g, "");
    // ㊤、㊥、㊦、㊧、㊨
    sanitized = sanitized.replace(/[\u3290-\u3294]/g, "");
    // その他の全角記号類（安全策として広めにカット）
    // 参考: 一般的な全角記号のUnicode範囲をいくつか指定。必要に応じて調整。
    sanitized = sanitized.replace(/[\u3000-\u303F]/g, ""); // 日本語記号・句読点
    sanitized = sanitized.replace(/[\uFF01-\uFF0F]/g, ""); // 全角記号 (！〜／)
    sanitized = sanitized.replace(/[\uFF1A-\uFF1F]/g, ""); // 全角記号 (：〜？)
    sanitized = sanitized.replace(/[\uFF3B-\uFF40]/g, ""); // 全角記号 (［〜｀)
    sanitized = sanitized.replace(/[\uFF5B-\uFF65]/g, ""); // 全角記号 (｛〜﹥)
    sanitized = sanitized.replace(/[\u2000-\u206F]/g, ""); // 一般的な記号類
    sanitized = sanitized.replace(/[\u2190-\u21FF]/g, ""); // 矢印
    sanitized = sanitized.replace(/[\u25A0-\u25FF]/g, ""); // 幾何学図形
    
    // ファイル名として不適切な文字も除去（Windows/Mac共通で問題となりやすい文字）
    sanitized = sanitized.replace(/[\/\\:\*\?"<>\|]/g, "");
    
    return sanitized.replace(/\s+/g, "_"); // 連続するスペースをアンダースコアに置換
}

// ★追加: ファイル名の重複を回避する関数
function getUniqueFileName(targetFolder, baseName) {
    var fileName = baseName;
    var counter = 1;
    var jpegFile = new File(targetFolder.fsName + "/" + fileName + ".jpg");
    var tiffFile = new File(targetFolder.fsName + "/" + fileName + ".tif");

    // JPEGまたはTIFFが存在するかをチェック
    while (jpegFile.exists || tiffFile.exists) {
        fileName = baseName + "_" + counter;
        jpegFile = new File(targetFolder.fsName + "/" + fileName + ".jpg");
        tiffFile = new File(targetFolder.fsName + "/" + fileName + ".tif");
        counter++;
    }
    return fileName;
}

main();
