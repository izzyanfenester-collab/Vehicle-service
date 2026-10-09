/* Synchronize Android notifications from offline vehicle schedules on app launch. */
(function(){
'use strict';
function syncDateNotifications(){
 try{
   if(window.CarServiceNotifier&&Array.isArray(state.vehicles)){
     window.CarServiceNotifier.syncSchedules(JSON.stringify(state));
   }
 }catch(error){console.warn('Could not synchronize deadline notifications',error);}
}
window.syncCarDeadlineNotifications=syncDateNotifications;
syncDateNotifications();
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')syncDateNotifications();
});
})();
