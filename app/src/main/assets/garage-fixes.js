/* Keeps photo, variant, and fuel data when using the existing edit/import forms. */
(function() {
'use strict';
document.addEventListener('submit',function(ev){
 if(ev.target && ev.target.id==='vehicleForm'){
  const idx=slot;
  const original=state.vehicles[idx]||{};
  const pic=original.photo||'';
  const variant=document.getElementById('gVariant')?.value?.trim()||original.variant||'';
  setTimeout(function(){
   if(!state.vehicles[idx])return;
   state.vehicles[idx].photo=pic;
   state.vehicles[idx].variant=variant;
   try{save();}catch(err){alert('Could not save the vehicle photo due to storage limits.');}
   if(typeof window.garageGoBack==='function')window.garageGoBack();
  },0);
 }
},true);
document.addEventListener('click',function(ev){
 const target=ev.target.closest('button');
 if(!target||!target.textContent.trim().match(/^Import backup$/i))return;
 const fileInput=document.getElementById('importFile');
 if(!fileInput||!fileInput.files||!fileInput.files[0])return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
 const fr=new FileReader();
 fr.onload=function(){
  try{
    const incoming=JSON.parse(fr.result);
    if(!Array.isArray(incoming.vehicles)||incoming.vehicles.length>5||!Array.isArray(incoming.records))throw Error('Invalid backup format');
    if(!confirm('Import will replace the current offline records. Continue?'))return;
    state={
      vehicles:incoming.vehicles.concat(Array(5).fill(null)).slice(0,5).map((v,i)=>v?Object.assign({},v,{slot:i}):null),
      records:incoming.records,
      customIntervals:incoming.customIntervals||{},
      manualSchedules:incoming.manualSchedules||{},
      fuelRecords:Array.isArray(incoming.fuelRecords)?incoming.fuelRecords:[],
      profile:incoming.profile&&typeof incoming.profile==='object'?incoming.profile:{}
    };
    save();alert('Backup restored.');if(typeof window.garageGoBack==='function')window.garageGoBack();
  }catch(error){alert('Could not import backup: '+error.message);}
 };
 fr.readAsText(fileInput.files[0]);
},true);
})();
