
/* Izzyan's Garage v1.4 dashboard. Uses existing offline vehicle and service data. */
(function(){
'use strict';
if(!Array.isArray(state.fuelRecords))state.fuelRecords=[];
let mode='garage', menuOpen=false, fuelGrade='RON95', fuelStation='', fuelKind='Petrol', photoTarget=0;
const currency=n=>'RM'+Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const niceKm=v=>Number(v||0).toLocaleString('en-MY')+' km';
const niceDate=s=>{if(!s)return 'Not set';const p=s.split('-');return p.length===3?new Date(Number(p[0]),Number(p[1])-1,Number(p[2])).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):s};
const e=x=>esc(x==null?'':x);
const itemIcon={engine_oil:'🛢️',oil_filter:'🧰',wheel_alignment:'🛞',ac_flush:'❄️',brake_fluid:'⚙️',brake_check:'🛑',tyre_check:'🛞',gear_oil:'⚙️',spark_plug:'⚡',coolant:'💧',battery:'🔋',chain:'⛓️'};
const garages=document.createElement('div');garages.id='gPage';document.querySelector('main').insertAdjacentElement('beforebegin',garages);
const gHeader=document.createElement('div');gHeader.id='gHeader';document.body.insertBefore(gHeader,document.body.firstChild);
const gBottom=document.createElement('div');gBottom.id='gBottom';document.body.appendChild(gBottom);
const fab=document.createElement('button');fab.id='gFab';fab.className='g-fab';fab.setAttribute('data-ga','menu');fab.setAttribute('aria-label','Add');fab.textContent='+';document.body.appendChild(fab);
const fabMenu=document.createElement('div');fabMenu.id='gFabMenu';fabMenu.style.display='none';fabMenu.innerHTML='<button data-ga="record">🔧 Log Service</button><button data-ga="fuel">⛽ Log Fuel</button><button data-ga="newVehicle">🚗 Add Vehicle</button>';document.body.appendChild(fabMenu);
const photoInput=document.createElement('input');photoInput.id='gPhotoFile';photoInput.type='file';photoInput.accept='image/*';photoInput.className='g-photo-input';document.body.appendChild(photoInput);
const main=document.querySelector('main');
const filled=()=>state.vehicles.filter(Boolean);
const vehicle=()=>state.vehicles[slot];
function selectFilled(){
 if(!vehicle()&&filled().length){slot=state.vehicles.findIndex(v=>!!v);}
}
function statDate(date){
 if(!date)return {style:'plain',label:'Not Set',detail:'Set a date'};
 const n=dayDiff(date);
 if(n===null)return {style:'plain',label:'Not Set',detail:'Set a date'};
 if(n<=0)return {style:'due',label:n===0?'Expires Today':'Expired',detail:n===0?'Expires today':Math.abs(n)+' days overdue'};
 if(n<=30)return {style:'soon',label:'Expiring Soon',detail:n+' days remaining'};
 return {style:'ok',label:'Valid',detail:n+' days remaining'};
}
function detailStatus(v,id){
 const custom=state.manualSchedules||{};
 const s=custom[String(v.slot)+'|'+id]||{};
 const d=s.nextDate?dayDiff(s.nextDate):null;
 const k=s.nextKm===null||s.nextKm===undefined||s.nextKm===''?null:Number(s.nextKm)-Number(v.currentKm||0);
 if(d===null&&k===null)return {kind:'manual',label:'Set Reminder',desc:'No schedule set'};
 if((d!==null&&d<=0)||(k!==null&&k<=0))return {kind:'due',label:'Due',desc:'Your custom target reached'};
 if((d!==null&&d<=30)||(k!==null&&k<=1000))return {kind:'soon',label:'Due Soon',desc:'Your custom target is approaching'};
 return {kind:'ok',label:'Scheduled',desc:[s.nextDate&&niceDate(s.nextDate),s.nextKm!=null&&niceKm(s.nextKm)].filter(Boolean).join(' / ')};
}
function lastService(v){
 return state.records.filter(r=>Number(r.slot)===Number(v.slot)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(b.km||0)-Number(a.km||0))[0]||null;
}
function plannedDate(v){return v.nextDate?niceDate(v.nextDate):'Date not set'}
function nextServiceText(v){
 return [v.nextKm?niceKm(v.nextKm):'',v.nextDate?niceDate(v.nextDate):''].filter(Boolean).join(' or ')||'Set your next service date / mileage';
}
function serviceStatus(v,item){
 if(item[0]==='wheel_alignment'||item[0]==='ac_flush')return detailStatus(v,item[0]);
 const data=due(v,item);
 const hasRecords=state.records.some(r=>Number(r.slot)===Number(v.slot)&&Array.isArray(r.items)&&r.items.includes(item[0]));
 const hasBase=hasRecords||!!v.lastDate||(v.lastKm!==''&&v.lastKm!==undefined&&v.lastKm!==null);
 if(!hasBase||(!data.date&&data.mileage===null))return {kind:'plain',label:'Check',desc:'Confirm interval in the vehicle manual'};
 if(data.overdue)return {kind:'due',label:'Due',desc:[data.date?niceDate(data.date):'',data.mileage!=null?niceKm(data.mileage):''].filter(Boolean).join(' or ')};
 if(data.soon)return {kind:'soon',label:'Due Soon',desc:[data.date?niceDate(data.date):'',data.mileage!=null?niceKm(data.mileage):''].filter(Boolean).join(' or ')};
 return {kind:'ok',label:'Scheduled',desc:[data.date?niceDate(data.date):'',data.mileage!=null?niceKm(data.mileage):''].filter(Boolean).join(' or ')};
}
function servicePreview(v){
 const ids=v.type==='moto'?['engine_oil','brake_check','tyre_check','chain','spark_plug']:['engine_oil','oil_filter','wheel_alignment','ac_flush','brake_fluid'];
 return ids.map(id=>catalog.find(x=>x[0]===id)).filter(Boolean).map(item=>({item,st:serviceStatus(v,item)}));
}
function badge(status){return '<span class="g-badge '+e(status.kind)+'">'+e(status.label)+'</span>'}
function secTitle(txt,action,label){return '<div class="g-title-row"><h2 class="g-heading">'+e(txt)+'</h2>'+(action?'<button class="g-link" data-ga="'+e(action)+'">'+e(label||'View All')+' ›</button>':'')+'</div>'}
function vehicleCard(v){
 const photo=v.photo?'<img class="g-avatar" src="'+e(v.photo)+'" alt="Vehicle photo">':'<div class="g-avatar-empty">🚗</div>';
 return '<div class="g-card g-vehicle"><button class="g-photo-button" data-ga="photo" aria-label="Add vehicle photo">'+photo+'<span class="g-camera">📷</span></button>'+
 '<button data-ga="edit" class="g-vinfo" style="background:transparent;color:inherit;padding:0"><h2>'+e(v.year?v.year+' ':'')+e(v.brand+' '+v.model)+'</h2><small>'+e(v.variant||(v.type==='moto'?'Motorcycle':'Car'))+'</small><strong>'+e(v.plate||'No registration number')+'</strong></button>'+
 '<button class="g-odo" data-ga="odometer"><span><small>Odometer</small><b>'+e(niceKm(v.currentKm))+'</b></span><span class="g-chevron">›</span></button></div>';
}
function tiles(v){
 const last=lastService(v);
 const recommended=guessMajor(v).startsWith('Major')?'Major Service':'Minor Service';
 const t=[
 ['Road Tax',niceDate(v.roadTaxExpiry),statDate(v.roadTaxExpiry).detail,'📄','blue','edit'],
 ['Insurance',niceDate(v.insuranceExpiry),statDate(v.insuranceExpiry).detail,'🛡️','green','edit'],
 ['Next Service',recommended,nextServiceText(v),'🔧','gold','reminders'],
 ['Last Service',last?last.items.map(id=>catalog.find(c=>c[0]===id)?.[1]||id).slice(0,2).join(' + ')||last.type:'No service yet',last?niceKm(last.km)+' · '+niceDate(last.date):'Log your first service','🕒','purple','history']
 ];
 return '<div class="g-grid">'+t.map(([title,val,sub,icon,color,action])=>'<button data-ga="'+action+'" class="g-tile"><span class="g-symbol '+color+'">'+icon+'</span><span class="g-tile-content"><small>'+e(title)+'</small><strong>'+e(val)+'</strong><span class="g-sub">'+e(sub)+'</span></span></button>').join('')+'</div>';
}
function serviceItems(v,all){
 const rows=servicePreview(v);
 if(all){const existing=new Set(rows.map(x=>x.item[0]));list(v).forEach(x=>{if(!existing.has(x.item[0]))rows.push({item:x.item,st:serviceStatus(v,x.item)})});}
 return '<div class="g-card g-list">'+rows.map(({item,st})=>'<button class="g-listrow" data-ga="'+(item[0]==='wheel_alignment'||item[0]==='ac_flush'?'customMaintenance':'record')+'">'+
  '<span class="g-itemicon">'+(itemIcon[item[0]]||'🔧')+'</span><span class="g-rowtext"><strong>'+e(item[1])+'</strong><small>'+e(st.desc||item[4])+'</small></span>'+badge(st)+'<span class="g-chevron">›</span></button>').join('')+'</div>';
}
function historyList(v,limit){
 let rows=state.records.filter(r=>Number(r.slot)===Number(v.slot)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(b.km||0)-Number(a.km||0));
 if(limit)rows=rows.slice(0,limit);
 return rows.length?'<div class="g-card g-list">'+rows.map(r=>'<button data-ga="record" class="g-listrow"><span class="g-historydate"><strong>'+e(niceDate(r.date))+'</strong><small>'+e(niceKm(r.km))+'</small></span><span class="g-itemicon">🔧</span><span class="g-rowtext"><strong>'+e((r.type||'Service')+' Service'.replace(' Service Service',' Service'))+'</strong><small>'+e((r.items||[]).map(id=>catalog.find(c=>c[0]===id)?.[1]||id).slice(0,3).join(', ')||r.notes||'Service recorded')+'</small></span><span class="g-price">'+e(currency(r.cost))+'</span><span class="g-chevron">›</span></button>').join('')+'</div>':
 '<div class="g-card g-empty"><div class="g-empty-icon">📋</div><strong>No service records yet</strong><p>Tap Log Service to record your first maintenance entry.</p></div>';
}
function slotBar(){
 return '<div class="g-slotbar">'+state.vehicles.map((v,i)=>'<button class="g-slot '+(i===slot?'active':'')+'" data-ga="slot" data-slot="'+i+'">'+(i+1)+' · '+(v?e(v.model):'Add')+'</button>').join('')+'</div>';
}
function garageScreen(){
 selectFilled();
 const v=vehicle();
 if(!v)return '<div class="g-card g-empty"><div class="g-empty-icon">🚘</div><strong>Welcome to Çar Service</strong><p>Add your first vehicle to track maintenance, renewal dates, costs and fuel.</p><button class="g-primary" data-ga="newVehicle">+ Add Vehicle</button></div>';
 const top=slotBar()+vehicleCard(v)+tiles(v);
 return top+'<div class="g-section">'+secTitle('Upcoming Service Items','allItems')+serviceItems(v,false)+'</div>'+
 '<div id="gCustomRemindersAnchor"></div>' +
 '<div class="g-section">'+secTitle('Service History','history')+historyList(v,3)+'</div>'+
 '<div class="g-actions"><button class="g-primary" data-ga="record">🔧 Log Service</button><button class="g-secondary" data-ga="fuel">⛽ Log Fuel</button></div>';
}
function remindersScreen(){
 const v=vehicle();if(!v)return garageScreen();
 const exp=[['Road Tax',v.roadTaxExpiry],['Insurance',v.insuranceExpiry]];
 const header=slotBar()+'<div class="g-section">'+secTitle('Renewal Reminders')+'<div class="g-card g-list">'+
 exp.map(([label,date])=>{const st=statDate(date);return '<button data-ga="edit" class="g-listrow"><span class="g-itemicon">📅</span><span class="g-rowtext"><strong>'+label+'</strong><small>'+niceDate(date)+' · '+st.detail+'</small></span>'+badge({kind:st.style,label:st.label})+'<span class="g-chevron">›</span></button>'}).join('')+'</div></div>';
 const custom=v.type==='car'?'<div class="g-section">'+secTitle('Custom Maintenance Reminders')+
 '<div class="g-card g-list">'+['wheel_alignment','ac_flush'].map(id=>{const c=catalog.find(x=>x[0]===id);const st=serviceStatus(v,c);return '<button data-ga="customMaintenance" class="g-listrow"><span class="g-itemicon">'+(itemIcon[id]||'🔧')+'</span><span class="g-rowtext"><strong>'+e(c[1])+'</strong><small>'+e(st.desc)+'</small></span>'+badge(st)+'<span class="g-chevron">›</span></button>'}).join('')+'</div><p class="g-note">Tap to edit the schedule for this vehicle in Garage. A/C flushing and alignment are not mandatory interval-based services.</p></div>':'';
 return header+custom+'<div class="g-section">'+secTitle('All Maintenance Items')+serviceItems(v,true)+'</div>';
}
function historyScreen(){
 const v=vehicle();if(!v)return garageScreen();
 const records=state.records.filter(r=>Number(r.slot)===Number(v.slot));
 const fuels=state.fuelRecords.filter(r=>Number(r.slot)===Number(v.slot));
 const total=records.reduce((n,r)=>n+Number(r.cost||0),0),fuelTotal=fuels.reduce((n,r)=>n+Number(r.total||0),0);
 return slotBar()+'<div class="g-statrow"><div class="g-stat"><small>Maintenance</small><b>'+currency(total)+'</b></div><div class="g-stat"><small>Fuel</small><b>'+currency(fuelTotal)+'</b></div></div>'+
 secTitle('Service History')+historyList(v)+
 '<div class="g-actions"><button data-ga="record" class="g-primary">+ Log Service</button><button data-ga="fuel" class="g-secondary">+ Log Fuel</button></div>'+
 '<div class="g-section">'+secTitle('Fuel History')+fuelHistory(v)+'</div>';
}
function fuelHistory(v){
 const rs=state.fuelRecords.filter(x=>Number(x.slot)===Number(v.slot)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(b.km||0)-Number(a.km||0));
 return rs.length?'<div class="g-card g-list">'+rs.map(r=>'<div class="g-listrow"><span class="g-itemicon">⛽</span><span class="g-rowtext"><strong>'+e(niceDate(r.date))+' · '+e(r.grade)+'</strong><small>'+e(niceKm(r.km))+' · '+e(r.litres)+' L · '+e(r.station||'Fuel station not set')+'</small></span><b class="g-price">'+e(currency(r.total))+'</b><button data-ga="deleteFuel" data-id="'+e(r.id)+'" class="g-ico" style="color:#b64242">×</button></div>').join('')+'</div>':
 '<div class="g-card g-empty"><div class="g-empty-icon">⛽</div><strong>No fuel entries</strong><p>Start logging fill-ups to track fuel spending.</p></div>';
}
function fuelScreen(){
 const v=vehicle();if(!v)return garageScreen();
 const id='gFuel';
 return '<div class="g-card g-pad" style="background:var(--garage-navy);color:white"><strong>'+e((v.year||'')+' '+v.brand+' '+v.model)+'</strong><br><small>'+e(v.plate||'')+'</small></div>'+
 '<form id="'+id+'"><div class="g-card g-pad"><div class="g-grid"><div class="g-field"><label>Date</label><input name="date" type="date" value="'+iso(new Date())+'" required></div><div class="g-field"><label>Odometer (km)</label><input name="km" type="number" min="0" value="'+Number(v.currentKm||0)+'" required></div></div>'+
 '<div class="g-grid"><div class="g-field"><label>Volume (litres)</label><input name="litres" type="number" min="0.01" step="0.01" placeholder="0.00" required></div><div class="g-field"><label>Total (RM)</label><input name="total" type="number" min="0" step="0.01" placeholder="0.00" required></div></div></div>'+
 '<div class="g-card g-pad"><div class="g-field"><label>Fuel station (optional)</label><input id="gFuelStation" name="station" value="'+e(fuelStation)+'" placeholder="Petronas, Shell, Petron, etc"></div>'+
 '<div class="g-chips">'+['Petronas','Shell','Petron','Caltex','BHPetrol'].map(s=>'<button type="button" class="g-chip" data-ga="station" data-value="'+s+'">'+s+'</button>').join('')+'</div>'+
 '<div class="g-field"><label>Fuel grade</label><select name="grade"><option>RON95</option><option>RON97</option><option>Diesel B7</option><option>Diesel B10</option><option>Other</option></select></div>'+
 '<label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input name="full" type="checkbox" checked style="width:20px;height:20px"> Filled the tank</label>'+
 '<label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input name="missed" type="checkbox" style="width:20px;height:20px"> Missed a fill-up before this</label>'+
 '<div class="g-field"><label>Notes (optional)</label><textarea name="notes" rows="2" placeholder="Anything worth remembering"></textarea></div></div>'+
 '<button class="g-primary" type="submit" style="width:100%">Save Fill-Up</button></form>';
}
function show(modeNext,pageNext){
 menuOpen=false;mode=modeNext;
 main.style.display=mode==='legacy'?'block':'none';garages.style.display=mode==='legacy'?'none':'block';
 if(mode==='legacy'){page=pageNext||'vehiclePage';render();decorateLegacy();}
 else {renderGarage();}
 window.scrollTo(0,0);
}
function decorateLegacy(){
 const titleMap={vehiclePage:'Edit Vehicle',recordPage:'Service Records',settingsPage:'Settings',home:'Garage'};
 if(mode==='legacy'){gHeader.querySelector('.g-title').textContent=titleMap[page]||'Çar Service';}
 if(page!=='vehiclePage')return;
 const form=document.getElementById('vehicleForm');if(!form||form.dataset.gDecorated)return;form.dataset.gDecorated='1';
 const v=vehicle();
 const container=document.createElement('div');container.className='g-card g-pad';
 container.innerHTML='<h3>Vehicle Photo</h3><button type="button" class="g-secondary" data-ga="photo">📷 '+(v?.photo?'Change Photo':'Choose from Gallery')+'</button><p class="g-note">Photo is saved offline on this device.</p><div class="g-field"><label>Variant (optional)</label><input id="gVariant" placeholder="e.g. 1.0 G / Premium" value="'+e(v?.variant||'')+'"></div>';
 form.insertBefore(container,form.firstChild);
}
function renderGarage(){
 if(mode==='legacy'){decorateLegacy();return;}
 selectFilled();
 const headings={garage:'Çar Service',reminders:'Reminders',history:'Service Records',fuel:'Log Fuel'};
 gHeader.innerHTML='<div style="display:flex;align-items:center;gap:4px">'+(mode!=='garage'?'<button class="g-ico" data-ga="garage" aria-label="Go back">‹</button>':'')+'<span class="g-title">'+e(headings[mode]||'Çar Service')+'</span></div><div class="g-ctl"><button class="g-ico" data-ga="reminders" aria-label="Reminders">♧</button><button class="g-ico" data-ga="settings" aria-label="Settings">⚙</button></div>';
 garages.innerHTML=mode==='garage'?garageScreen():mode==='reminders'?remindersScreen():mode==='history'?historyScreen():mode==='fuel'?fuelScreen():garageScreen();
 if(mode==='garage'&&typeof window.renderGarageCustomMaintenance==='function')window.renderGarageCustomMaintenance();
 gBottom.innerHTML=[['garage','🚘','Garage'],['reminders','🔔','Reminder'],['history','📋','Service'],['settings','👤','Profile']].map(([id,ic,label])=>'<button class="'+(mode===id?'active':'')+'" data-ga="'+id+'"><span class="g-navico">'+ic+'</span>'+label+'</button>').join('');
 fab.style.display=mode==='fuel'?'none':'grid';fabMenu.style.display=menuOpen?'block':'none';
}
const originalRender=render, oldRenderVehicle=renderVehicle;
render=function(){originalRender();if(mode==='legacy')decorateLegacy();else renderGarage();};
renderVehicle=function(){oldRenderVehicle();if(mode==='legacy')decorateLegacy();};
function openEdit(){show('legacy','vehiclePage');}
function newVehicle(){
 const first=state.vehicles.findIndex(v=>!v);if(first<0){alert('All 5 vehicle slots are occupied.');return;}
 slot=first;openEdit();
}
function handleButton(action,button){
 switch(action){
 case 'garage':show('garage');break;
 case 'slot':slot=Number(button.dataset.slot);if(!vehicle())openEdit();else show('garage');break;
 case 'edit':openEdit();break;
 case 'odometer':openEdit();setTimeout(()=>document.getElementById('currentKm')?.focus(),50);break;
 case 'newVehicle':newVehicle();break;
 case 'record':show('legacy','recordPage');break;
 case 'reminders':show('reminders');break;
 case 'customMaintenance':show('garage');if(typeof window.openGarageCustomMaintenance==='function')window.openGarageCustomMaintenance();break;
 case 'history':show('history');break;
 case 'allItems':show('reminders');break;
 case 'settings':show('legacy','settingsPage');break;
 case 'fuel':show('fuel');break;
 case 'photo':photoTarget=slot;photoInput.click();break;
 case 'menu':menuOpen=!menuOpen;fabMenu.style.display=menuOpen?'block':'none';break;
 case 'station':fuelStation=button.dataset.value||'';const input=document.getElementById('gFuelStation');if(input)input.value=fuelStation;document.querySelectorAll('[data-ga="station"]').forEach(b=>b.classList.toggle('active',b===button));break;
 case 'deleteFuel':
    if(confirm('Delete this fuel record?')){state.fuelRecords=state.fuelRecords.filter(x=>x.id!==button.dataset.id);save();renderGarage();}
    break;
 }
}
document.addEventListener('click',function(ev){
 const b=ev.target.closest('[data-ga]');if(!b)return;ev.preventDefault();handleButton(b.dataset.ga,b);
});
document.addEventListener('submit',function(ev){
 if(ev.target.id!=='gFuel')return;ev.preventDefault();
 const v=vehicle(), form=ev.target, fd=new FormData(form);
 if(!v)return;
 const km=Number(fd.get('km')),litres=Number(fd.get('litres')),total=Number(fd.get('total'));
 if(!Number.isFinite(km)||km<0||!Number.isFinite(litres)||litres<=0||!Number.isFinite(total)||total<0){alert('Please enter valid mileage, litres and total cost.');return;}
 state.fuelRecords.push({id:'f'+Date.now()+Math.random().toString(36).slice(2,5),slot,date:String(fd.get('date')),km,litres,total,station:String(fd.get('station')||''),grade:String(fd.get('grade')||''),full:fd.has('full'),missed:fd.has('missed'),notes:String(fd.get('notes')||'')});
 if(km>Number(v.currentKm||0))v.currentKm=km;
 try{save();}catch(e){alert('Could not save the fuel record. Please free up storage and retry.');return;}
 show('history');
 alert('Fuel record saved.');
});
photoInput.addEventListener('change',function(){
 const file=this.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){alert('Please select an image.');return;}
 const reader=new FileReader();
 reader.onload=function(){
  const image=new Image();
  image.onload=function(){
   const canvas=document.createElement('canvas');
   const size=512,scale=Math.min(size/image.width,size/image.height),w=Math.round(image.width*scale),h=Math.round(image.height*scale);
   canvas.width=size;canvas.height=size;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#f1f5fa';ctx.fillRect(0,0,size,size);ctx.drawImage(image,(size-w)/2,(size-h)/2,w,h);
   const output=canvas.toDataURL('image/jpeg',0.68);
   const v=state.vehicles[photoTarget];if(!v)return;
   const previous=v.photo;v.photo=output;
   try{save();renderGarage();}catch(err){v.photo=previous;alert('Photo is too large to save. Please try a smaller photo.');}
  };
  image.src=reader.result;
 };
 reader.readAsDataURL(file);
 this.value='';
});
const originalSave=save;
window.garageGoBack=function(){if(mode==='legacy'){show('garage');return true;}if(mode!=='garage'){show('garage');return true;}return false;};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&mode!=='garage'){show('garage');}});
window.garageShow=show;
window.garageRefresh=renderGarage;
window.garageOpenLegacy=function(p){show('legacy',p||'settingsPage');};
show('garage');
})();
