
(function(){
'use strict';
const overlay=document.createElement('div');overlay.id='geOverlay';overlay.style.display='none';document.body.appendChild(overlay);
const photo=document.createElement('input');photo.type='file';photo.accept='image/*';photo.className='geInputFile';document.body.appendChild(photo);
const cam=document.createElement('input');cam.type='file';cam.accept='image/*';cam.setAttribute('capture','environment');cam.className='geInputFile';document.body.appendChild(cam);
let editCategory='compact', pendingPhoto=null, originSlot=0;
const $ge=(id)=>overlay.querySelector('#'+id);
const fmt=(v)=>esc(v==null?'':v);
const isOpen=()=>overlay.style.display!=='none';
function types(cat){
 const arr=[['compact','🚙','Compact'],['sedan','🚘','Sedan'],['suv','🚙','SUV'],['mpv','🚐','MPV'],['motorcycle','🏍️','Motorcycle']];
 return arr.map(x=>'<button type="button" class="geType '+(cat===x[0]?'selected':'')+'" data-ge="type" data-type="'+x[0]+'"><b>'+x[1]+'</b><span>'+x[2]+'</span></button>').join('');
}
function brands(type,current){
 const a=type==='moto'?motoBrands:carBrands;return a.map(b=>'<option value="'+fmt(b)+'" '+(current===b?'selected':'')+'>'+fmt(b)+'</option>').join('');
}
function mods(brand,type,current){
 const items=(models[brand]||[]).filter(v=>{
  if(type==='moto')return /^(RS|Wave|EX5|Dash|Vario|ADV|PCX|CBR|CB650|Forza|Y|LC|NVX|NMAX|Ego|Lagend|MT|R15|XMAX|Kriss|Elegan|Pulsar|Dominar|Karisma|Z15|VF3i|Husky|Jet|Cruisym|Ninja|Z250|Z650|Versys|ZX|Raider|GSX|V-Strom|Burgman)/i.test(v);
  return !/^(RS150|RS-X|Wave|EX5|Dash|Vario|ADV 160|PCX|CBR|CB650|Forza)/i.test(v);
 });
 const list=items.includes(current)?items:[...items,...(current?[current]:[])];
 return [...new Set(list)].map(m=>'<option value="'+fmt(m)+'" '+(m===current?'selected':'')+'>'+fmt(m)+'</option>').join('')+'<option value="__custom__">Other model / Enter manually</option>';
}
function field(id,label,value,opts={}){
 const type=opts.type||'text';const extras=(opts.min!==undefined?' min="'+opts.min+'"':'')+(opts.max!==undefined?' max="'+opts.max+'"':'');
 return '<div class="geField"><label for="ge_'+id+'">'+fmt(label)+'</label><input id="ge_'+id+'" type="'+type+'" value="'+fmt(value||'')+'" placeholder="'+fmt(opts.placeholder||'')+'"'+extras+'></div>';
}
function showEditor(){
 const current=state.vehicles[slot];originSlot=slot;
 editCategory=current?.category||(current?.type==='moto'?'motorcycle':'compact');
 pendingPhoto=current?.photo||'';
 overlay.style.display='flex';document.getElementById('gBottom').style.display='none';
 document.getElementById('gFab').style.display='none';document.getElementById('gFabMenu').style.display='none';
 const v=current||{};
 const ph=pendingPhoto?'<img class="gePhoto" id="geCurrentPhoto" alt="Vehicle photo" src="'+fmt(pendingPhoto)+'">':'<div class="gePlaceholder">🚗</div>';
 overlay.innerHTML=
 '<header class="geHeader"><button class="geHeadBtn" type="button" data-ge="back">‹</button><h2>'+ (current?'Edit Vehicle':'Add Vehicle')+'</h2><button class="geHeadBtn" data-ge="back" type="button">×</button></header>'+
 '<form id="geForm" class="geScroll">'+
 '<p class="geSectionLabel">Photo</p>'+
 '<button type="button" class="geCard gePhotoCard" data-ge="photo"><span class="gePhotoHolder">'+ph+'<span class="geCamera">📷</span></span><span class="gePhotoText">Vehicle photo<small>Tap to change or remove</small></span></button>'+
 '<p class="geSectionLabel">Vehicle Type</p><div class="geTypes">'+types(editCategory)+'</div>'+
 '<p class="geSectionLabel">Vehicle Details</p><div class="geCard">'+
 '<div class="geField"><label>Brand</label><select id="ge_brand">'+brands(editCategory==='motorcycle'?'moto':'car',v.brand||'')+'</select></div>'+
 '<div class="geField"><label>Model</label><select id="ge_model">'+mods(v.brand||carBrands[0],editCategory==='motorcycle'?'moto':'car',v.model||'')+'</select><input id="ge_customModel" style="display:none;margin-top:9px" placeholder="Enter model" aria-label="Custom model"></div>'+
 field('variant','Variant',v.variant||'',{placeholder:'e.g. 1.0 G / Premium'})+
 '<div class="geCols">'+field('year','Year',v.year||'',{type:'number',min:1950,max:2100})+field('plate','Registration / Plate No.',v.plate||'',{placeholder:'JXX 1234'})+'</div>'+
 '</div><p class="geSectionLabel">Mileage and Service</p><div class="geCard">'+
 '<div class="geCols">'+field('currentKm','Current odometer (km)',v.currentKm??'',{type:'number',min:0})+field('lastKm','Last service odometer (km)',v.lastKm??'',{type:'number',min:0})+'</div>'+
 '<div class="geCols">'+field('lastDate','Last service date',v.lastDate||'',{type:'date'})+field('nextDate','Next service date',v.nextDate||'',{type:'date'})+'</div>'+
 field('nextKm','Next service mileage (km)',v.nextKm||'',{type:'number',min:0})+'</div>'+
 '<p class="geSectionLabel">Vehicle Documents</p><div class="geCard"><div class="geCols">'+field('roadTaxExpiry','Road tax expiry',v.roadTaxExpiry||'',{type:'date'})+field('insuranceExpiry','Insurance expiry',v.insuranceExpiry||'',{type:'date'})+'</div>'+
 field('manualUrl','Official service manual URL',v.manualUrl||'',{type:'url',placeholder:'Optional'})+
 '<p class="geHelp">Maintenance and renewal reminders are saved locally. Use the manufacturer handbook for accurate service intervals.</p></div>'+
 '</form><footer class="geActionBar">'+(current?'<button class="geDelete" type="button" data-ge="delete">Delete</button>':'')+'<button class="geSave" type="button" data-ge="save">Save Vehicle</button></footer>';
 setTimeout(()=>{
  let b=$ge('ge_brand');
  if(v.brand&&Array.from(b.options).some(x=>x.value===v.brand))b.value=v.brand;
  b.dispatchEvent(new Event('change'));
  let m=$ge('ge_model');if(v.model){if(Array.from(m.options).some(x=>x.value===v.model))m.value=v.model;else {m.value='__custom__';$ge('ge_customModel').value=v.model;}}
  checkOther();
 },0);
}
function updateBrands(){
 const type=editCategory==='motorcycle'?'moto':'car';
 const select=$ge('ge_brand');
 select.innerHTML=brands(type,'');
 const choice=select.value;
 $ge('ge_model').innerHTML=mods(choice,type,'');
 checkOther();
}
function updateModels(){
 $ge('ge_model').innerHTML=mods($ge('ge_brand').value,editCategory==='motorcycle'?'moto':'car','');
 checkOther();
}
function checkOther(){
 const input=$ge('ge_customModel');const custom=$ge('ge_model').value==='__custom__';input.style.display=custom?'block':'none';
 if(custom&&!input.value)input.focus();
}
function saveEditor(){
 const r=id=>$ge('ge_'+id)?.value?.trim()||'';
 const type=editCategory==='motorcycle'?'moto':'car';
 const brand=r('brand'),model=r('model')==='__custom__'?r('customModel'):r('model');
 const year=r('year'),currentKm=r('currentKm'),lastKm=r('lastKm');
 if(!brand||!model||!year||currentKm===''){alert('Please fill in brand, model, year and current mileage.');return;}
 if(!/^\d{4}$/.test(year)||Number(year)<1950||Number(year)>2100){alert('Enter a valid vehicle year.');return;}
 if(Number(currentKm)<0||lastKm!==''&&Number(lastKm)>Number(currentKm)){alert('Last service mileage must not exceed the current mileage.');return;}
 const old=state.vehicles[originSlot]||{};
 state.vehicles[originSlot]={...old,slot:originSlot,type,category:editCategory,brand,model,variant:r('variant'),year,plate:r('plate'),currentKm:Number(currentKm),lastKm:lastKm===''?'':Number(lastKm),lastDate:r('lastDate'),nextDate:r('nextDate'),nextKm:r('nextKm'),roadTaxExpiry:r('roadTaxExpiry'),insuranceExpiry:r('insuranceExpiry'),manualUrl:r('manualUrl'),photo:pendingPhoto||''};
 try{save();}catch(err){state.vehicles[originSlot]=Object.keys(old).length?old:null;alert('Unable to save. The vehicle image might be too large.');return;}
 closeEditor();window.garageShow?.('garage');
}
function deleteEditor(){
 if(!confirm('Delete this vehicle, service history, fuel records and reminders?'))return;
 const idx=originSlot;state.vehicles[idx]=null;
 state.records=state.records.filter(x=>Number(x.slot)!==idx);
 state.fuelRecords=(state.fuelRecords||[]).filter(x=>Number(x.slot)!==idx);
 for(const key of Object.keys(state.customIntervals||{}))if(key.startsWith(idx+'|'))delete state.customIntervals[key];
 for(const key of Object.keys(state.manualSchedules||{}))if(key.startsWith(idx+'|'))delete state.manualSchedules[key];
 save();closeEditor();window.garageShow?.('garage');
}
function closeEditor(){
 overlay.innerHTML='';overlay.style.display='none';
 const b=document.getElementById('gBottom');if(b)b.style.display='';
 const f=document.getElementById('gFab');if(f)f.style.display='';
}
function photoDialog(){
 const wrapper=document.createElement('div');wrapper.className='geDialogBackdrop';wrapper.id='geDlg';
 wrapper.innerHTML='<div class="geDialog"><h3>Vehicle Photo</h3><p>Shown on your garage card and service history report.</p><div class="geDialogActions">'+
 '<button data-ge="take" type="button">TAKE PHOTO</button><button data-ge="choose" type="button">CHOOSE FROM LIBRARY</button><button data-ge="remove" type="button">REMOVE PHOTO</button></div></div>';
 overlay.appendChild(wrapper);
 wrapper.addEventListener('click',event=>{if(event.target===wrapper)wrapper.remove()});
}
function photoChosen(file){
 if(!file||!file.type.startsWith('image/'))return;
 const reader=new FileReader();
 reader.onload=()=>{
  const image=new Image();
  image.onload=()=>{
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#eff2f6';ctx.fillRect(0,0,480,480);
   const scale=Math.min(480/image.width,480/image.height);const w=Math.round(scale*image.width),h=Math.round(scale*image.height);
   ctx.drawImage(image,(480-w)/2,(480-h)/2,w,h);
   pendingPhoto=canvas.toDataURL('image/jpeg',0.65);
   const p=overlay.querySelector('.gePhotoHolder');
   if(p)p.innerHTML='<img class="gePhoto" alt="Vehicle photo" src="'+fmt(pendingPhoto)+'"><span class="geCamera">📷</span>';
  };
  image.src=reader.result;
 };
 reader.readAsDataURL(file);
}
photo.addEventListener('change',()=>{photoChosen(photo.files?.[0]);photo.value='';});
cam.addEventListener('change',()=>{photoChosen(cam.files?.[0]);cam.value='';});
overlay.addEventListener('click',function(ev){
 const b=ev.target.closest('[data-ge]');if(!b)return;
 ev.preventDefault();const a=b.dataset.ge;
 if(a==='back')closeEditor();
 else if(a==='photo')photoDialog();
 else if(a==='take'){overlay.querySelector('#geDlg')?.remove();cam.click();}
 else if(a==='choose'){overlay.querySelector('#geDlg')?.remove();photo.click();}
 else if(a==='remove'){pendingPhoto=null;overlay.querySelector('#geDlg')?.remove();const p=overlay.querySelector('.gePhotoHolder');if(p)p.innerHTML='<div class="gePlaceholder">🚗</div><span class="geCamera">📷</span>';}
 else if(a==='save')saveEditor();
 else if(a==='delete')deleteEditor();
 else if(a==='type'){
   editCategory=b.dataset.type;
   overlay.querySelectorAll('.geType').forEach(x=>x.classList.toggle('selected',x===b));
   updateBrands();
 }
});
overlay.addEventListener('change',ev=>{
 if(ev.target.id==='ge_brand')updateModels();
 if(ev.target.id==='ge_model')checkOther();
});
document.addEventListener('click',function(ev){
 const b=ev.target.closest('[data-ga]');if(!b||!['edit','newVehicle','odometer'].includes(b.dataset.ga))return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
 if(b.dataset.ga==='newVehicle'){
   const available=state.vehicles.findIndex(x=>!x);
   if(available<0){alert('All 5 vehicle slots are occupied.');return;}
   slot=available;
 }
 showEditor();if(b.dataset.ga==='odometer')setTimeout(()=>$ge('ge_currentKm')?.focus(),60);
},true);
window.openGarageVehicleEditor=showEditor;
window.closeGarageVehicleEditor=closeEditor;
window.garageEditorIsOpen=isOpen;
})();
