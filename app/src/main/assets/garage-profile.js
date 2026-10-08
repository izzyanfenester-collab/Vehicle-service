
(function(){
'use strict';
const profile=document.createElement('div');profile.id='gProfile';profile.style.display='none';
const bottom=document.getElementById('gBottom');bottom.parentNode.insertBefore(profile,bottom);
let open=false;
const ed=(x)=>esc(x==null?'':x);
const displayName=()=>state.profile?.displayName||'Garage Owner';
const garageName=()=>state.profile?.garageName||'Izzyan’s Garage';
const fmtCost=n=>'RM '+Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
function row(icon,title,subtitle,action){
 return '<button class="gpRow" data-gp="'+action+'"><span class="gpRowIcon">'+icon+'</span>'+
 '<span class="gpRowTitle"><strong>'+ed(title)+'</strong><small>'+ed(subtitle)+'</small></span><span class="gpArrow">›</span></button>';
}
function filled(){return (state.vehicles||[]).filter(Boolean);}
function build(){
 const vehicles=filled().length,recs=(state.records||[]).length,fuels=(state.fuelRecords||[]).length;
 const spending=(state.records||[]).reduce((t,x)=>t+Number(x.cost||0),0);
 return '<div class="gpNamecard"><span class="gpAvatar">👤</span>'+
 '<div class="gpName"><strong>'+ed(displayName())+'</strong><small>'+ed(garageName())+'</small></div>'+
 '<button data-gp="edit" class="gpPill">Edit Profile</button></div>'+
 '<div class="gpStats">'+
 '<div class="gpStat"><strong>'+vehicles+'/5</strong><small>Vehicles</small></div>'+
 '<div class="gpStat"><strong>'+recs+'</strong><small>Services</small></div>'+
 '<div class="gpStat"><strong>'+fuels+'</strong><small>Fuel logs</small></div></div>'+
 '<div class="gpSection">My Garage</div><div class="gpGroup">'+
 row('🚗','My Vehicles','Manage vehicles, photos and registration','vehicles')+
 row('🛠️','Maintenance Settings','Service intervals, alignment and A/C reminders','maintenance')+
 row('📅','Reminders','Road tax, insurance and service due dates','reminders')+
 row('📋','Service History','Review maintenance and cost records','history')+
 '</div><div class="gpSection">Data and Preferences</div><div class="gpGroup">'+
 row('💾','Backup & Restore','Export or import your offline records','backup')+
 row('💰','Total Maintenance Spending',fmtCost(spending)+' recorded','history')+
 row('⚙️','Settings','Configure reminder intervals and maintenance checklist','maintenance')+
 '</div><div class="gpSection">About</div><div class="gpGroup">'+
 row('ℹ️','Izzyan’s Garage','Version 1.5 · Offline vehicle maintenance','about')+
 '</div><p class="gpNote">Data is saved locally on your device. No account or cloud service is required. Back up your records before uninstalling the application.</p>';
}
function setBottom(){
 const buttons=bottom.querySelectorAll('button[data-ga]');
 buttons.forEach(b=>b.classList.toggle('active',b.dataset.ga==='settings'));
}
function show(){
 if(window.garageEditorIsOpen?.())window.closeGarageVehicleEditor?.();
 open=true;
 if(typeof window.garageShow==='function')window.garageShow('garage');
 const page=document.getElementById('gPage');page.style.display='none';
 const main=document.querySelector('main');main.style.display='none';
 profile.style.display='block';profile.innerHTML=build();
 const h=document.querySelector('#gHeader .g-title');if(h)h.textContent='Profile';
 const fab=document.getElementById('gFab');fab.style.display='none';
 document.getElementById('gFabMenu').style.display='none';
 setBottom();window.scrollTo(0,0);
}
function close(restore){
 if(!open)return;
 open=false;profile.style.display='none';profile.innerHTML='';
 document.getElementById('gPage').style.display='';
 if(restore&&window.garageShow)window.garageShow('garage');
}
function editDialog(){
 const bg=document.createElement('div');bg.className='gpDialogBg';bg.id='gpEditDlg';
 bg.innerHTML='<div class="gpDialog"><h3>Edit Profile</h3>'+
 '<form id="gpForm"><label>Display name</label><input name="displayName" value="'+ed(state.profile?.displayName||'')+'" placeholder="Your name">'+
 '<label>Garage name</label><input name="garageName" value="'+ed(state.profile?.garageName||'Izzyan’s Garage')+'" required maxlength="70">'+
 '<div class="gpDialogActions"><button class="gpCancel" type="button" data-gp="cancel">Cancel</button><button class="gpSave" type="submit">Save</button></div></form></div>';
 profile.appendChild(bg);
 bg.addEventListener('click',ev=>{if(ev.target===bg)bg.remove();});
}
function about(){
 const bg=document.createElement('div');bg.className='gpDialogBg';
 bg.innerHTML='<div class="gpDialog"><h3>Izzyan’s Garage v1.5</h3><p>Keep up to five vehicles, maintenance plans, fuel records, renewal dates and costs in one offline app. Manual schedules may not match the manufacturer handbook; confirm work with your vehicle service centre.</p><div class="gpDialogActions"><button type="button" class="gpSave" data-gp="dismiss">Close</button></div></div>';
 profile.appendChild(bg);
}
profile.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-gp]');if(!b)return;ev.preventDefault();
 const action=b.dataset.gp;
 if(action==='edit'){editDialog();return;}
 if(action==='cancel'||action==='dismiss'){b.closest('.gpDialogBg')?.remove();return;}
 if(action==='vehicles'){close(true);return;}
 if(action==='reminders'){close();window.garageShow?.('reminders');return;}
 if(action==='history'){close();window.garageShow?.('history');return;}
 if(action==='maintenance'||action==='backup'){close();window.garageOpenLegacy?.('settingsPage');return;}
 if(action==='about')about();
});
profile.addEventListener('submit',ev=>{
 if(ev.target.id!=='gpForm')return;
 ev.preventDefault();
 const fd=new FormData(ev.target);
 const name=String(fd.get('displayName')||'').trim();
 const garage=String(fd.get('garageName')||'').trim();
 if(!garage){alert('Please enter a garage name.');return;}
 state.profile={...(state.profile||{}),displayName:name,garageName:garage};
 try{save();}catch(e){alert('Could not save profile settings.');return;}
 show();
});
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-ga]');if(!b)return;
 if(b.dataset.ga==='settings'){
   ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();show();return;
 }
 if(open&&['garage','reminders','history','fuel','edit','newVehicle','record'].includes(b.dataset.ga))close(false);
},true);
const previousBack=window.garageGoBack;
window.garageGoBack=function(){
 if(open){close(true);return true;}
 if(window.garageEditorIsOpen?.()){window.closeGarageVehicleEditor?.();return true;}
 return previousBack?.()||false;
};
window.openGarageProfile=show;
window.garageProfileIsOpen=()=>open;
})();
