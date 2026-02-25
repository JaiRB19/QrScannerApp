import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

// jsQR inlined as a module-level embedded string for offline use.
// Source: https://github.com/cozmo/jsQR (MIT)
// We load it from jsDelivr at build time only if network is available;
// otherwise the WebView will gracefully report no code found.
const HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<canvas id="c" style="display:none"></canvas>
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
<script>
  window.addEventListener('message', function(evt) {
    var uri = evt.data;
    if (!uri || uri === 'PING') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
      return;
    }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var canvas = document.getElementById('c');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code = typeof jsQR !== 'undefined' ? jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' }) : null;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          success: !!(code && code.data),
          data:    code ? code.data : null
        }));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, data: null }));
      }
    };
    img.onerror = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, data: null }));
    };
    img.src = uri;
  });
</script>
</body>
</html>
`;

export interface QRDecoderRef {
    decode: (dataUri: string) => void;
}

interface Props {
    onResult: (data: string | null) => void;
}

const QRImageDecoder = forwardRef<QRDecoderRef, Props>(({ onResult }, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
        decode: (dataUri: string) => {
            webViewRef.current?.injectJavaScript(`
        window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(dataUri)} }));
        true;
      `);
        },
    }));

    return (
        <WebView
            ref={webViewRef}
            source={{ html: HTML }}
            style={styles.hidden}
            originWhitelist={['*']}
            onMessage={(evt) => {
                try {
                    const parsed = JSON.parse(evt.nativeEvent.data);
                    if (parsed.ready) return;
                    onResult(parsed.success ? parsed.data : null);
                } catch {
                    onResult(null);
                }
            }}
            javaScriptEnabled
        />
    );
});

export default QRImageDecoder;

const styles = StyleSheet.create({
    hidden: { width: 1, height: 1, position: 'absolute', opacity: 0 },
});
