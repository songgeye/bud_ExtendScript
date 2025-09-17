function checkBackgroundOpacity(doc) {
    try {
        var backgroundLayer = doc.artLayers.getByName('Background');
        return backgroundLayer.opacity;
    } catch (e) {
        // 背景レイヤーが存在しない場合、不透明度を100%とみなす
        return 100;
    }
}