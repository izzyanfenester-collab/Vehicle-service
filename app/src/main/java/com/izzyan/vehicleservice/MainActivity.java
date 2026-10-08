package com.izzyan.vehicleservice;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;

public class MainActivity extends Activity {
  private static final int FILE_CHOOSE=9191;
  WebView view;
  private ValueCallback<Uri[]> fileCallback;

  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().setNavigationBarColor(Color.rgb(245,247,252));
    if (Build.VERSION.SDK_INT >= 26) {
      getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }
    FrameLayout root = new FrameLayout(this);
    view = new WebView(this);
    view.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        String scheme=req.getUrl().getScheme();
        if ("https".equals(scheme)||"http".equals(scheme)) {
          try {startActivity(new Intent(Intent.ACTION_VIEW,req.getUrl()));return true;}
          catch (Exception ignored){return true;}
        }
        return false;
      }
      @Override public void onPageFinished(WebView v,String url) {
        if (url != null && url.startsWith("file:///android_asset/index.html")) {
          String injection="(function(){"
            +"if(document.getElementById('garage-css'))return;"
            +"var l=document.createElement('link');l.id='garage-css';l.rel='stylesheet';l.href='garage.css';document.head.appendChild(l);"
            +"var s=document.createElement('script');s.src='garage.js';document.body.appendChild(s);"
            +"})();";
          v.evaluateJavascript(injection,null);
        }
      }
    });
    view.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
        if(fileCallback!=null)fileCallback.onReceiveValue(null);
        fileCallback=callback;
        try{
          Intent intent=params.createIntent();
          intent.addCategory(Intent.CATEGORY_OPENABLE);
          startActivityForResult(intent,FILE_CHOOSE);
          return true;
        }catch(Exception e){
          fileCallback=null;
          callback.onReceiveValue(null);
          return false;
        }
      }
    });
    view.getSettings().setJavaScriptEnabled(true);
    view.getSettings().setDomStorageEnabled(true);
    view.getSettings().setAllowFileAccess(true);
    view.getSettings().setDefaultTextEncodingName("UTF-8");
    root.addView(view,new FrameLayout.LayoutParams(-1,-1));
    if(Build.VERSION.SDK_INT>=30){
      root.setOnApplyWindowInsetsListener((v,insets)->{
        int bottom=insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
        v.setPadding(0,0,0,bottom);
        return insets;
      });
    }else{root.setFitsSystemWindows(true);}
    setContentView(root);
    view.loadUrl("file:///android_asset/index.html");
  }
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
    super.onActivityResult(requestCode,resultCode,data);
    if(requestCode==FILE_CHOOSE&&fileCallback!=null){
      Uri[] result=WebChromeClient.FileChooserParams.parseResult(resultCode,data);
      fileCallback.onReceiveValue(result);fileCallback=null;
    }
  }
  @Override public void onBackPressed(){
    view.evaluateJavascript("(window.garageGoBack&&window.garageGoBack())?'handled':'exit'",value->{
      if(value==null||!value.contains("handled"))runOnUiThread(()->MainActivity.super.onBackPressed());
    });
  }
}
