package com.izzyan.vehicleservice;

import android.webkit.JavascriptInterface;

/** Android Storage Access Framework export bridge for the offline garage backup. */
public final class CarBackupBridge {
  private final MainActivity activity;
  public CarBackupBridge(MainActivity activity) {
    this.activity=activity;
  }
  @JavascriptInterface public void exportJson(String json, String filename) {
    activity.runOnUiThread(()->activity.startBackupExport(json,filename));
  }
}
