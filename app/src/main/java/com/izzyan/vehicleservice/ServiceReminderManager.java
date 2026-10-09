package com.izzyan.vehicleservice;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Schedules independent date-based reminders for each of five vehicle slots. */
public final class ServiceReminderManager {
  static final String CHANNEL = "vehicle_deadlines_v1";
  static final String PREFS = "vehicle_notification_schedules";
  static final String LAST_STATE = "latest_vehicle_data";
  static final int WINDOW_DAYS = 7;
  static final String[] LABELS = {
    "Service", "Road Tax", "Insurance", "Wheel Alignment", "A/C Flushing"
  };
  private ServiceReminderManager(){}

  public static void createChannel(Context ctx){
    if(Build.VERSION.SDK_INT>=26){
      NotificationManager mgr=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
      NotificationChannel channel=new NotificationChannel(CHANNEL,"Vehicle service and renewal reminders",
        NotificationManager.IMPORTANCE_DEFAULT);
      channel.setDescription("Notifications seven days before service, road tax and insurance deadlines.");
      mgr.createNotificationChannel(channel);
    }
  }
  public static boolean isAllowed(Context ctx){
    if(Build.VERSION.SDK_INT>=33&&ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
      !=PackageManager.PERMISSION_GRANTED)return false;
    NotificationManager mgr=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
    return Build.VERSION.SDK_INT<24||mgr.areNotificationsEnabled();
  }
  public static void saveAndSchedule(Context ctx,String json){
    if(json==null||json.length()>3000000)return;
    try{
      JSONObject data=new JSONObject(json);
      JSONArray vehicles=data.optJSONArray("vehicles");
      if(vehicles==null)return;
      ctx.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(LAST_STATE,json).apply();
      schedule(ctx,data);
    }catch(Exception ignored){}
  }
  public static void refresh(Context ctx){
    String s=ctx.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(LAST_STATE,null);
    if(s!=null)try{schedule(ctx,new JSONObject(s));}catch(Exception ignored){}
  }
  private static int alarmId(int slot,int kind){return 21000+(slot*10)+kind;}
  private static PendingIntent intentFor(Context ctx,int slot,int kind,JSONObject vehicle,String date,long when){
    Intent intent=new Intent(ctx,ServiceReminderReceiver.class);
    int id=alarmId(slot,kind);
    intent.setAction("com.izzyan.vehicleservice.REMINDER_"+id);
    intent.putExtra("notificationId",id);
    intent.putExtra("slot",slot);
    intent.putExtra("kind",kind);
    intent.putExtra("dueDate",date);
    intent.putExtra("vehicle",vehicle.optString("brand","")+" "+vehicle.optString("model",""));
    intent.putExtra("plate",vehicle.optString("plate",""));
    intent.putExtra("triggerAt",when);
    intent.putExtra("marker","sent_"+slot+"_"+kind+"_"+date);
    return PendingIntent.getBroadcast(ctx,id,intent,
      PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }
  private static void cancel(Context ctx,int slot,int kind){
    AlarmManager alarms=(AlarmManager)ctx.getSystemService(Context.ALARM_SERVICE);
    Intent i=new Intent(ctx,ServiceReminderReceiver.class);
    int id=alarmId(slot,kind);i.setAction("com.izzyan.vehicleservice.REMINDER_"+id);
    PendingIntent pi=PendingIntent.getBroadcast(ctx,id,i,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
    if(pi!=null){alarms.cancel(pi);pi.cancel();}
  }
  private static Date day(String value){
    if(value==null||!value.matches("\\d{4}-\\d{2}-\\d{2}"))return null;
    try{
      SimpleDateFormat fmt=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
      fmt.setLenient(false);
      return fmt.parse(value);
    }catch(Exception e){return null;}
  }
  public static void schedule(Context ctx,JSONObject data){
    createChannel(ctx);
    JSONArray list=data.optJSONArray("vehicles");
    if(list==null)return;
    JSONObject custom=data.optJSONObject("manualSchedules");
    AlarmManager alarms=(AlarmManager)ctx.getSystemService(Context.ALARM_SERVICE);
    SharedPreferences pref=ctx.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    for(int slot=0;slot<5;slot++){
      JSONObject v=list.optJSONObject(slot);
      for(int kind=0;kind<LABELS.length;kind++)cancel(ctx,slot,kind);
      if(v==null)continue;
      for(int kind=0;kind<LABELS.length;kind++){
        String date="";
        if(kind==0)date=v.optString("nextDate","");
        else if(kind==1)date=v.optString("roadTaxExpiry","");
        else if(kind==2)date=v.optString("insuranceExpiry","");
        else if(custom!=null){
          String service=kind==3?"wheel_alignment":"ac_flush";
          JSONObject setting=custom.optJSONObject(slot+"|"+service);
          if(setting!=null)date=setting.optString("nextDate","");
        }
        Date deadline=day(date);
        if(deadline==null)continue;
        Calendar due=Calendar.getInstance();
        due.setTime(deadline);due.set(Calendar.HOUR_OF_DAY,23);
        due.set(Calendar.MINUTE,59);due.set(Calendar.SECOND,59);due.set(Calendar.MILLISECOND,999);
        long now=System.currentTimeMillis();
        if(now>due.getTimeInMillis())continue;
        String marker="sent_"+slot+"_"+kind+"_"+date;
        if(pref.getBoolean(marker,false))continue;
        Calendar target=Calendar.getInstance();
        target.setTime(deadline);
        target.add(Calendar.DAY_OF_MONTH,-WINDOW_DAYS);
        target.set(Calendar.HOUR_OF_DAY,9);target.set(Calendar.MINUTE,0);
        target.set(Calendar.SECOND,0);target.set(Calendar.MILLISECOND,0);
        long when=target.getTimeInMillis();
        // If already inside the seven-day window, show once shortly after synchronization.
        if(when<=now)when=now+45000;
        PendingIntent pi=intentFor(ctx,slot,kind,v,date,when);
        if(Build.VERSION.SDK_INT>=23)alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        else alarms.set(AlarmManager.RTC_WAKEUP,when,pi);
      }
    }
  }
}
