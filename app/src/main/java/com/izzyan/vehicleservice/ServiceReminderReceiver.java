package com.izzyan.vehicleservice;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Delivers a single English notification for each vehicle / deadline. */
public class ServiceReminderReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context ctx,Intent intent){
    if(!ServiceReminderManager.isAllowed(ctx))return;
    final int kind=intent.getIntExtra("kind",-1),slot=intent.getIntExtra("slot",-1);
    if(kind<0||kind>=ServiceReminderManager.LABELS.length||slot<0||slot>=5)return;
    String due=intent.getStringExtra("dueDate");
    String marker=intent.getStringExtra("marker");
    String model=intent.getStringExtra("vehicle");
    String plate=intent.getStringExtra("plate");
    if(due==null||marker==null)return;
    SharedPreferences prefs=ctx.getSharedPreferences(ServiceReminderManager.PREFS,Context.MODE_PRIVATE);
    if(prefs.getBoolean(marker,false))return;
    long time=System.currentTimeMillis();
    try{
      SimpleDateFormat formatter=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
      formatter.setLenient(false);
      Date target=formatter.parse(due);
      Calendar c=Calendar.getInstance();c.setTime(target);
      c.set(Calendar.HOUR_OF_DAY,23);c.set(Calendar.MINUTE,59);c.set(Calendar.SECOND,59);
      if(time>c.getTimeInMillis())return;
    }catch(Exception e){return;}
    int remaining=daysUntil(due);
    String service=ServiceReminderManager.LABELS[kind];
    String title=(kind==1||kind==2)?(service+" renewal reminder"):(service+" reminder");
    String when=remaining==0?"today":remaining==1?"tomorrow":"in "+remaining+" days";
    String body=(model==null?"Vehicle":model.trim());
    if(plate!=null&&!plate.trim().isEmpty())body+=" ("+plate.trim()+")";
    body+=": "+service+" due "+when+" ("+due+").";
    ServiceReminderManager.createChannel(ctx);
    Intent open=new Intent(ctx,MainActivity.class);
    open.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent content=PendingIntent.getActivity(ctx,30000+slot*10+kind,open,
      PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder builder=Build.VERSION.SDK_INT>=26?
      new Notification.Builder(ctx,ServiceReminderManager.CHANNEL):new Notification.Builder(ctx);
    builder.setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body))
      .setContentIntent(content).setAutoCancel(true).setWhen(time);
    NotificationManager manager=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
    try{
      manager.notify(intent.getIntExtra("notificationId",21000+slot*10+kind),builder.build());
      prefs.edit().putBoolean(marker,true).apply();
    }catch(Exception ignored){}
  }
  private int daysUntil(String due){
    try{
      SimpleDateFormat formatter=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
      Calendar now=Calendar.getInstance(),target=Calendar.getInstance();
      target.setTime(formatter.parse(due));
      now.set(Calendar.HOUR_OF_DAY,12);now.set(Calendar.MINUTE,0);
      target.set(Calendar.HOUR_OF_DAY,12);target.set(Calendar.MINUTE,0);
      return Math.max(0,(int)Math.round((target.getTimeInMillis()-now.getTimeInMillis())/86400000d));
    }catch(Exception e){return 7;}
  }
}
