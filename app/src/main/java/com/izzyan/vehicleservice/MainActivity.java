package com.izzyan.vehicleservice;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
  WebView view;
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    view = new WebView(this);
    view.setWebViewClient(new WebViewClient());
    view.setWebChromeClient(new WebChromeClient());
    view.getSettings().setJavaScriptEnabled(true);
    view.getSettings().setDomStorageEnabled(true);
    view.getSettings().setAllowFileAccess(true);
    view.getSettings().setDefaultTextEncodingName("UTF-8");
    view.loadUrl("file:///android_asset/index.html");
    setContentView(view);
  }
  @Override public void onBackPressed() { if(view.canGoBack()) view.goBack(); else super.onBackPressed(); }
}
