#target photoshop

var inputFolder, outputFolder;
var processedFiles = [];
var maxDepth = 2; // 最大階層の深さ

function main() {
    // 自動化で実行される場合、引数なしで実行されるとダイアログが出るが
    // シェルスクリプトから引数渡しはできないため、従来通りのダイアログ方式
    inputFolder = Folder.selectDialog("処理する画像が含まれるフォルダを選択してください。");
    outputFolder = Folder.selectDialog("出力先フォルダを選択してください。");

    if (inputFolder != null && outputFolder != null) {
        processFolder(inputFolder, 0);
        alert("処理が完了しました。");
    }
}

// フォルダを再帰的に処理する関数
function processFolder(folder, depth) {
    if (depth > maxDepth) {
        return;
    }
    
    // 画像ファイルを検索
    var fileList = folder.getFiles(/\.(jpg|jpeg|png|tif|tiff|psd|eps|svg|gif|jfif|webp|bmp|heic|avif|jpf|~tmp|CR|K25|KDC|CRW|CR2|CR3|ERF|NEF|NRW|ORF|PEF|RW2|ARW|SRF|SR2|X3F|RWL|BAY|DNG)$/i);
    
    for (var i = 0; i < fileList.length; i++) {
        var f = fileList[i];
        
        // Macの隠しファイル（._で始まるもの）や隠し属性ファイルを無視する
        if (f.name.indexOf("._") === 0 || f.name.indexOf(".") === 0 || f.hidden) {
            continue;
        }

        if (!isFileProcessed(f.name)) {
            // ファイル単位でエラーが起きても止まらないようにする
            try {
                processFile(f, folder);
                processedFiles.push(f.name);
            } catch (e) {
                // エラーログをコンソールに出して続行（必要ならalert有効化）
                $.writeln("エラースキップ: " + f.name + " / " + e);
            }
        }
    }
    
    var subFolders = folder.getFiles(function(file) {
        return file instanceof Folder;
    });
    
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
    
    // リサイズ処理
    try {
        doc.resizeImage(undefined, undefined, 350, ResampleMethod.NONE);
        
        if (doc.width > 4000 || doc.height > 4000) {
            if (doc.width > doc.height) {
                doc.resizeImage(4000, null, 350, ResampleMethod.BICUBIC);
            } else {
                doc.resizeImage(null, 4000, 350, ResampleMethod.BICUBIC);
            }
        }
        
        var baseName = doc.name.split('.')[0];
        // 拡張子の取得方法を少し安全に
        var fileExtension = "";
        if (file.name.lastIndexOf('.') > -1) {
            fileExtension = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
        }
        
        var relativePath = getRelativePath(inputFolder, sourceFolder);
        // パスの結合時のスラッシュ重複などを防ぐ簡易処理
        var outPathStr = outputFolder.fsName + relativePath; 
        // outputFolderがFolderオブジェクトの場合、fsNameかabsoluteURIを使う方が安全ですが
        // 既存ロジックに合わせて結合します（absoluteURI同士の結合だと%20などが混ざるため注意）
        // ここでは単純に文字列結合として処理
        
        var targetFolder = new Folder(outputFolder + relativePath);
        
        if (!targetFolder.exists) {
            targetFolder.create();
        }
        
        // PNG/GIFの場合のTIFF保存
        if (fileExtension === "png" || fileExtension === "gif") {
            if (doc.mode != DocumentMode.CMYK) {
                // GIFなどは一度RGBにしないとCMYKにできない場合があるため安全策
                if (doc.mode == DocumentMode.INDEXEDCOLOR || doc.mode == DocumentMode.BITMAP) {
                     doc.changeMode(ChangeMode.RGB);
                }
                doc.changeMode(ChangeMode.CMYK);
            }
            saveAsTIFF(doc, outputFolder + "/" + baseName + ".tif");
        }
        
        if (doc.layers.length > 1) {
            doc.flatten();
        }
        
        if (doc.mode != DocumentMode.CMYK) {
             // 上記同様の安全策
            if (doc.mode == DocumentMode.INDEXEDCOLOR || doc.mode == DocumentMode.BITMAP) {
                 doc.changeMode(ChangeMode.RGB);
            }
            doc.changeMode(ChangeMode.CMYK);
        }
        
        saveAsJPEG(doc, outputFolder + "/" + baseName + ".jpg");

    } catch(e) {
        // 処理中のエラー（保存できない等）
        throw e; 
    } finally {
        // 成功しても失敗しても閉じる
        if (doc) {
            doc.close(SaveOptions.DONOTSAVECHANGES);
        }
    }
}

function getRelativePath(baseFolder, currentFolder) {
    var basePath = baseFolder.absoluteURI;
    var currentPath = currentFolder.absoluteURI;
    
    if (currentPath.indexOf(basePath) === 0) {
        return currentPath.substring(basePath.length);
    }
    return "";
}

function saveAsJPEG(doc, filePath) {
    var jpegOptions = new JPEGSaveOptions();
    jpegOptions.quality = 8; 
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
