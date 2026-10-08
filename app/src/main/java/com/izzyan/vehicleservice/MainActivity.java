package com.izzyan.vehicleservice;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
  WebView view;
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().setNavigationBarColor(Color.rgb(243,246,251));
    if (Build.VERSION.SDK_INT >= 26) {
      getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }
    FrameLayout root = new FrameLayout(this);
    view = new WebView(this);
    view.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        String scheme = req.getUrl().getScheme();
        if ("https".equals(scheme) || "http".equals(scheme)) {
          try {
            startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl()));
            return true;
          } catch (Exception ignored) { return false; }
        }
        return false;
      }
    });
    view.setWebChromeClient(new WebChromeClient());
    view.getSettings().setJavaScriptEnabled(true);
    view.getSettings().setDomStorageEnabled(true);
    view.getSettings().setAllowFileAccess(true);
    view.getSettings().setDefaultTextEncodingName("UTF-8");
    root.addView(view, new FrameLayout.LayoutParams(-1, -1));
    if (Build.VERSION.SDK_INT >= 30) {
      root.setOnApplyWindowInsetsListener((v, insets) -> {
        int bottom = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
        v.setPadding(0, 0, 0, bottom);
        return insets;
      });
    } else {
      root.setFitsSystemWindows(true);
    }
    setContentView(root);
    view.loadUrl("file:///android_asset/index.html");
  }
  @Override public void onBackPressed() { if(view.canGoBack()) view.goBack(); else super.onBackPressed(); }
}
