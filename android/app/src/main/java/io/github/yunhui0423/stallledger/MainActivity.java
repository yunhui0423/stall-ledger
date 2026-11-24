package io.github.yunhui0423.stallledger;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int VOICE = 1, IMPORT = 2, EXPORT = 3;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        final View root = new android.widget.FrameLayout(this);
        ((android.widget.FrameLayout) root).addView(web);
        root.setBackgroundColor(Color.rgb(244, 245, 237));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.addJavascriptInterface(new LedgerBridge(), "AndroidLedger");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !allowed(request.getUrl());
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = allowed(request.getUrl())
                    ? assets.shouldInterceptRequest(request.getUrl()) : null;
                return response != null ? response : new WebResourceResponse(
                    "text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), IMPORT); }
                catch (ActivityNotFoundException error) { fileCallback = null; callback.onReceiveValue(null); }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }

    private boolean allowed(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) &&
            "/assets/index.html".equals(uri.getPath());
    }

    private final class LedgerBridge {
        @JavascriptInterface public void startSpeech() {
            runOnUiThread(() -> {
                Intent speech = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                speech.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                speech.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-TW");
                try { startActivityForResult(speech, VOICE); }
                catch (ActivityNotFoundException error) { speechResult(""); }
            });
        }

        @JavascriptInterface public void saveFile(String content, String mime, String name) {
            runOnUiThread(() -> {
                if (pendingExport != null) return;
                pendingExport = content;
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                save.setType(mime.split(";")[0]);
                save.putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(save, EXPORT); }
                catch (ActivityNotFoundException error) { pendingExport = null; showExportFailure(); }
            });
        }
    }

    private void speechResult(String result) {
        web.evaluateJavascript("window.receiveAndroidSpeech(" + JSONObject.quote(result) + ")", null);
    }

    private void showExportFailure() {
        android.widget.Toast.makeText(this, "無法儲存檔案", android.widget.Toast.LENGTH_LONG).show();
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == VOICE) {
            ArrayList<String> results = result == RESULT_OK && data != null
                ? data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS) : null;
            speechResult(results == null || results.isEmpty() ? "" : results.get(0));
        } else if (request == IMPORT && fileCallback != null) {
            ValueCallback<Uri[]> callback = fileCallback;
            fileCallback = null;
            callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
        } else if (request == EXPORT) {
            String content = pendingExport;
            pendingExport = null;
            if (result != RESULT_OK || data == null || data.getData() == null || content == null) return;
            try (OutputStream target = getContentResolver().openOutputStream(data.getData())) {
                if (target == null) throw new java.io.IOException("No file stream");
                target.write(content.getBytes(StandardCharsets.UTF_8));
            } catch (java.io.IOException | SecurityException error) { showExportFailure(); }
        }
    }
}
