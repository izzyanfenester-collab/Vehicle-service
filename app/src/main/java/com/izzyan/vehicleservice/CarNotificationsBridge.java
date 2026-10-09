package com.izzyan.vehicleservice;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

/** Safe Android bridge for English-only notification permission and scheduling. */
public class CarNotificationsBridge {
  private final MainActivity activity;
  CarNotificationsBridge(MainActivity activity){this.activity=activity;}
  @JavascriptInterface public void syncSchedules(String stateJson){
    ServiceReminderManager.saveAndSchedule(activity.getApplicationContext(),stateJson);
  }
  @JavascriptInterface public String getStatus(){
    if(Build.VERSION.SDK_INT>=33&&activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
      !=PackageManager.PERMISSION_GRANTED)return "permission_required";
    return ServiceReminderManager.isAllowed(activity)?"enabled":"disabled";
  }
  @JavascriptInterface public void requestPermission(){
    activity.runOnUiThread(()->{
      if(Build.VERSION.SDK_INT>=33&&activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
          !=PackageManager.PERMISSION_GRANTED){
        activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},MainActivity.NOTIFICATION_REQUEST);
      }else{
        ServiceReminderManager.refresh(activity);
        Toast.makeText(activity,"Vehicle reminders are enabled.",Toast.LENGTH_SHORT).show();
      }
    });
  }
  @JavascriptInterface public void openSettings(){
    activity.runOnUiThread(()->{
      try{
        Intent intent=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE,activity.getPackageName());
        activity.startActivity(intent);
      }catch(Exception err){
        Intent settings=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        settings.setData(Uri.parse("package:"+activity.getPackageName()));
        activity.startActivity(settings);
      }
    });
  }
  @JavascriptInterface public void testNotification(){
    activity.runOnUiThread(()->{
      if(!ServiceReminderManager.isAllowed(activity)){
        Toast.makeText(activity,"Please enable notifications first.",Toast.LENGTH_LONG).show();
        return;
      }
      ServiceReminderManager.createChannel(activity);
      Intent app=new Intent(activity,MainActivity.class);
      PendingIntent pi=PendingIntent.getActivity(activity,45000,app,
        PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      Notification.Builder b=Build.VERSION.SDK_INT>=26?
        new Notification.Builder(activity,ServiceReminderManager.CHANNEL):
        new Notification.Builder(activity);
      b.setSmallIcon(android.R.drawable.ic_dialog_info)
       .setContentTitle("Çar Service test reminder")
       .setContentText("Notifications are working. You will be reminded 7 days before saved deadlines.")
       .setAutoCancel(true).setContentIntent(pi);
      ((NotificationManager)activity.getSystemService(Activity.NOTIFICATION_SERVICE)).notify(45000,b.build());
    });
  }
}
