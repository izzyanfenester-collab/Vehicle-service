package com.izzyan.vehicleservice;

import android.app.Activity;
import android.content.ClipData;
import android.util.Base64;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.BufferedWriter;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.view.Gravity;
import android.widget.EditText;
import android.webkit.JsResult;
import android.webkit.JsPromptResult;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
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
  private static final int BACKUP_SAVE_REQUEST=9192;
  private String pendingBackupJson;
  static final int NOTIFICATION_REQUEST=9300;
  WebView view;
  private ValueCallback<Uri[]> fileCallback;

  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    final int NAVY = Color.rgb(11,66,102);
    getWindow().setStatusBarColor(NAVY);
    getWindow().setNavigationBarColor(Color.WHITE);
    if(Build.VERSION.SDK_INT>=29) getWindow().setNavigationBarContrastEnforced(false);
    // Single source of truth for edge-to-edge safe areas on Android 11+.
    if(Build.VERSION.SDK_INT>=30) getWindow().setDecorFitsSystemWindows(false);
    if (Build.VERSION.SDK_INT >= 26) {
      getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }
    FrameLayout root = new FrameLayout(this);
    root.setBackgroundColor(Color.WHITE);
    FrameLayout content = new FrameLayout(this);
    View statusBackdrop = new View(this);
    statusBackdrop.setBackgroundColor(NAVY);
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
            +"['garage.css','garage-edit.css','garage-profile.css','garage-schedules.css','garage-receipts.css'].forEach(function(u){var l=document.createElement('link');l.rel='stylesheet';l.href=u;if(u==='garage.css')l.id='garage-css';document.head.appendChild(l);});"
            +"var files=['garage.js','garage-fixes.js','garage-edit.js','garage-profile.js','garage-schedules.js','garage-receipts.js','garage-notifications.js'];var i=0;function next(){if(i===files.length)return;var s=document.createElement('script');s.src=files[i++];s.onload=next;document.body.appendChild(s);}next();"
            +"})();";
          v.evaluateJavascript(injection,null);
        }
      }
    });
    view.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onJsAlert(WebView webView, String url, String message, JsResult result) {
        new AlertDialog.Builder(MainActivity.this)
          .setTitle(dialogTitle(message))
          .setMessage(message)
          .setPositiveButton("OK",(dialog,which)->result.confirm())
          .setOnCancelListener(dialog->result.cancel())
          .show();
        return true;
      }
      @Override public boolean onJsConfirm(WebView webView, String url, String message, JsResult result) {
        boolean deletion=message!=null&&message.toLowerCase().contains("delete");
        new AlertDialog.Builder(MainActivity.this)
          .setTitle(dialogTitle(message))
          .setMessage(message)
          .setPositiveButton(deletion?"Delete":"Continue",(dialog,which)->result.confirm())
          .setNegativeButton("Cancel",(dialog,which)->result.cancel())
          .setOnCancelListener(dialog->result.cancel())
          .show();
        return true;
      }
      @Override public boolean onJsPrompt(WebView webView, String url, String message, String defaultValue, JsPromptResult result) {
        EditText input=new EditText(MainActivity.this);
        input.setSingleLine(true);
        input.setText(defaultValue==null?"":defaultValue);
        int pad=(int)(20*getResources().getDisplayMetrics().density);
        FrameLayout wrapper=new FrameLayout(MainActivity.this);
        wrapper.setPadding(pad,0,pad,0);
        wrapper.addView(input,new FrameLayout.LayoutParams(-1,-2));
        new AlertDialog.Builder(MainActivity.this)
          .setTitle(dialogTitle(message))
          .setMessage(message)
          .setView(wrapper)
          .setPositiveButton("Save",(dialog,which)->result.confirm(input.getText().toString()))
          .setNegativeButton("Cancel",(dialog,which)->result.cancel())
          .setOnCancelListener(dialog->result.cancel())
          .show();
        return true;
      }
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
    view.getSettings().setDatabaseEnabled(true);
    view.addJavascriptInterface(new CarNotificationsBridge(this),"CarServiceNotifier");
    view.addJavascriptInterface(new CarBackupBridge(this),"CarServiceBackup");
    view.addJavascriptInterface(new Object() {
      @JavascriptInterface
      public void openReceipt(String encoded, String mime, String name) {
        if (encoded == null || encoded.length() > 17000000) {
          runOnUiThread(() -> Toast.makeText(MainActivity.this,
            "Receipt too large to open.", Toast.LENGTH_LONG).show());
          return;
        }
        runOnUiThread(() -> {
          try {
            byte[] data = Base64.decode(encoded, Base64.DEFAULT);
            String realMime = ("application/pdf".equals(mime)) ? "application/pdf"
              : (mime!=null&&mime.startsWith("image/") ? mime : "application/octet-stream");
            String suffix = "application/pdf".equals(realMime) ? ".pdf"
              : ("image/png".equals(realMime) ? ".png" : ".jpg");
            File file = File.createTempFile("service-receipt-", suffix, getCacheDir());
            try (FileOutputStream stream = new FileOutputStream(file)) {stream.write(data);}
            Uri uri = Uri.parse("content://" + getPackageName() + ".receipts/" + file.getName());
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, realMime);
            intent.setClipData(ClipData.newUri(getContentResolver(), "Service receipt", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(intent, "View service receipt"));
          } catch (Exception error) {
            Toast.makeText(MainActivity.this,
              "No compatible receipt viewer installed.", Toast.LENGTH_LONG).show();
          }
        });
      }
    }, "CarServiceFiles");

    content.addView(view,new FrameLayout.LayoutParams(-1,-1));
    root.addView(content,new FrameLayout.LayoutParams(-1,-1));
    root.addView(statusBackdrop,new FrameLayout.LayoutParams(-1,0,Gravity.TOP));
    if(Build.VERSION.SDK_INT>=30){
      root.setOnApplyWindowInsetsListener((v,insets)->{
        int statusTop=insets.getInsets(WindowInsets.Type.statusBars()).top;
        int navigationBottom=insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
        FrameLayout.LayoutParams contentParams=(FrameLayout.LayoutParams)content.getLayoutParams();
        contentParams.topMargin=statusTop;
        contentParams.bottomMargin=navigationBottom;
        content.setLayoutParams(contentParams);
        FrameLayout.LayoutParams statusParams=(FrameLayout.LayoutParams)statusBackdrop.getLayoutParams();
        statusParams.height=statusTop;
        statusBackdrop.setLayoutParams(statusParams);
        return WindowInsets.CONSUMED;
      });
    }
    setContentView(root);
    view.loadUrl("file:///android_asset/index.html");
  }
  private String dialogTitle(String message) {
    if(message==null)return "Çar Service";
    String m=message.toLowerCase(java.util.Locale.ROOT);
    if(m.contains("backup")||m.contains("import")||m.contains("export"))return "Backup & Restore";
    if(m.contains("alignment")||m.contains("flushing")||m.contains("reminder")||m.contains("service date"))return "Service Reminder";
    if(m.contains("mileage")||m.contains("odometer"))return "Vehicle Mileage";
    if(m.contains("delete")||m.contains("remove"))return "Confirm Deletion";
    if(m.contains("fuel")||m.contains("fill-up"))return "Fuel Log";
    if(m.contains("vehicle"))return "Vehicle Details";
    return "Çar Service";
  }
  @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results) {
    super.onRequestPermissionsResult(requestCode,permissions,results);
    if(requestCode==NOTIFICATION_REQUEST){
      ServiceReminderManager.refresh(this);
      if(view!=null)view.evaluateJavascript(
        "if(window.refreshCarNotificationSettings){window.refreshCarNotificationSettings();}",null);
    }
  }
  @Override protected void onResume(){
    super.onResume();
    ServiceReminderManager.refresh(this);
    if(view!=null)view.evaluateJavascript(
      "if(window.refreshCarNotificationSettings){window.refreshCarNotificationSettings();}",null);
  }
  // Called on the main thread by CarBackupBridge when Export JSON is tapped.
  void startBackupExport(String json,String filename) {
    if(pendingBackupJson!=null) {
      backupFeedback("error","A backup is already awaiting a save location.");
      return;
    }
    if(json==null||json.isEmpty()||json.length()>30000000) {
      backupFeedback("error","Backup is empty or too large to export.");
      return;
    }
    try {
      JSONObject parsed=new JSONObject(json);
      if(parsed.optJSONArray("vehicles")==null||parsed.optJSONArray("records")==null) {
        backupFeedback("error","Backup data is incomplete. No file was created.");
        return;
      }
      String safe=(filename==null?"":filename).replaceAll("[^A-Za-z0-9_.-]","-");
      if(safe.length()>110)safe=safe.substring(safe.length()-110);
      if(safe.isEmpty())safe="Car-Service-Backup.json";
      if(!safe.endsWith(".json"))safe+=".json";
      pendingBackupJson=json;
      Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
      intent.setType("application/json");
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.putExtra(Intent.EXTRA_TITLE,safe);
      startActivityForResult(intent,BACKUP_SAVE_REQUEST);
    } catch(Exception error) {
      pendingBackupJson=null;
      backupFeedback("error","Unable to open Android Save As. Please try again.");
    }
  }
  private void backupFeedback(String status,String message) {
    if("success".equals(status)||"error".equals(status)) {
      Toast.makeText(this,message,Toast.LENGTH_LONG).show();
    }
    if(view!=null) {
      String script="if(window.onCarBackupFinished){window.onCarBackupFinished("
        +JSONObject.quote(status)+","+JSONObject.quote(message)+");}";
      view.evaluateJavascript(script,null);
    }
  }
  private void finishBackupExport(int resultCode,Intent data) {
    String json=pendingBackupJson;
    pendingBackupJson=null;
    if(resultCode!=Activity.RESULT_OK||data==null||data.getData()==null) {
      backupFeedback("canceled","Backup export canceled. No file was saved.");
      return;
    }
    if(json==null) {
      backupFeedback("error","Backup data is unavailable. Please export again.");
      return;
    }
    try(OutputStream stream=getContentResolver().openOutputStream(data.getData());
        BufferedWriter writer=new BufferedWriter(new OutputStreamWriter(stream,StandardCharsets.UTF_8))) {
      if(stream==null)throw new java.io.IOException("Storage destination unavailable.");
      writer.write(json);
      writer.flush();
      backupFeedback("success","JSON backup saved successfully to your chosen location.");
    }catch(Exception error) {
      backupFeedback("error","Could not save the JSON file. Select a different folder and try again.");
    }
  }
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
    super.onActivityResult(requestCode,resultCode,data);
    if(requestCode==BACKUP_SAVE_REQUEST) {
      finishBackupExport(resultCode,data);
      return;
    }
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
