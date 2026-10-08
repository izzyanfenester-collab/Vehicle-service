/* Vehicle-scoped custom maintenance reminders shown exclusively on Garage. */
(function(){
'use strict';
const ITEMS=[
 {id:'wheel_alignment',name:'Wheel Alignment',icon:'🛞',estimate:[40,100],note:'Inspect or align when tyre wear, pulling or suspension work indicates a need.'},
 {id:'ac_flush',name:'A/C Flushing',icon:'❄️',estimate:[180,480],note:'Only when needed after diagnosis; not mandatory at fixed service intervals.'}
];
let editingKey='';
const formatKm=n=>Number(n).toLocaleString('en-MY')+' km';
const displayDate=value=>{
 if(!value)return '';
 const p=String(value).split('-');
 return p.length===3?new Date(Number(p[0]),Number(p[1])-1,Number(p[2])).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):String(value);
};
function vehicle(){return state.vehicles[slot]||null;}
function key(v,id){return String(v.slot)+'|'+id;}
function savedFor(v,id){return state.manualSchedules?.[key(v,id)]||{};}
function status(v,item){
 const data=savedFor(v,item.id);
 const nextDate=data.nextDate||'';
 const nextKm=(data.nextKm===null||data.nextKm===undefined||data.nextKm==='')?null:Number(data.nextKm);
 const days=nextDate?dayDiff(nextDate):null;
 const kms=nextKm===null?null:nextKm-Number(v.currentKm||0);
 if(days===null&&kms===null)return {id:'not-set',label:'Not Set',detail:'Add next service date or mileage'};
 let id='planned',label='Scheduled';
 if((days!==null&&days<=0)||(kms!==null&&kms<=0)){id='overdue';label='Service Due';}
 else if((days!==null&&days<=30)||(kms!==null&&kms<=1000)){id='soon';label='Due Soon';}
 const parts=[];
 if(nextDate)parts.push(displayDate(nextDate));
 if(nextKm!==null)parts.push(formatKm(nextKm));
 return {id,label,detail:parts.join(' · ')};
}
function field(id,name,value,type,placeholder){
 return '<div class="gm-field"><label for="'+id+'">'+name+'</label>'+
 '<input id="'+id+'" type="'+type+'" min="'+(type==='number'?'0':'')+'" value="'+esc(value===undefined||value===null?'':value)+'"'+(placeholder?' placeholder="'+esc(placeholder)+'"':'')+'></div>';
}
function form(v,item){
 const s=savedFor(v,item.id), id=item.id, base=(name)=>id+'_'+name;
 return '<div class="gm-form" data-gm-for="'+esc(key(v,id))+'"><h3>'+item.icon+' '+item.name+' · '+esc(v.brand+' '+v.model)+'</h3>'+
 '<p class="gm-sub">'+item.note+' This reminder applies only to this vehicle.</p>'+
 '<div class="gm-formgrid">'+
 field(base('lastDate'),'Last service date',s.lastDate,'date')+
 field(base('lastKm'),'Last service mileage (km)',s.lastKm,'number')+
 field(base('nextDate'),'Next service date',s.nextDate,'date')+
 field(base('nextKm'),'Next service mileage (km)',s.nextKm,'number')+
 field(base('intervalMonths'),'Repeat every months (optional)',s.intervalMonths,'number','0 = manual only')+
 field(base('intervalKm'),'Repeat every km (optional)',s.intervalKm,'number','0 = manual only')+
 '</div>'+field(base('estimatedCost'),'Estimated cost (RM, optional)',s.estimatedCost,'number',item.estimate[0]+' – '+item.estimate[1])+
 '<p class="gm-estimate">Typical estimate: RM '+item.estimate[0]+' – '+item.estimate[1]+'. Your entry overrides this estimate.</p>'+
 '<div class="gm-actions"><button type="button" data-gm="suggest" data-id="'+id+'">Suggest Next</button>'+
 '<button type="button" class="gm-primary" data-gm="save" data-id="'+id+'">Save Reminder</button>'+
 '<button type="button" data-gm="complete" data-id="'+id+'">Mark Completed</button></div></div>';
}
function render(){
 const root=document.getElementById('gCustomRemindersAnchor');
 if(!root)return;
 const v=vehicle();
 if(!v||v.type!=='car'){root.innerHTML='';return;}
 const caption=(v.year?String(v.year)+' ':'')+v.brand+' '+v.model+(v.plate?' · '+v.plate:'');
 root.innerHTML='<div class="gm-head"><div><h2>Custom Maintenance Reminders</h2>'+
 '<p>For '+esc(caption)+' only · '+formatKm(v.currentKm)+'</p></div></div>'+
 '<div class="g-card">'+ITEMS.map(item=>{
   const st=status(v,item),active=editingKey===key(v,item.id);
   const s=savedFor(v,item.id);
   const cost=s.estimatedCost!=null?'RM '+Number(s.estimatedCost).toFixed(2):'Est. RM '+item.estimate.join(' – ');
   return '<div class="gm-item"><span class="gm-icon">'+item.icon+'</span>'+
    '<div class="gm-details"><strong>'+item.name+'</strong><small>'+esc(st.detail)+'</small><small>'+esc(cost)+'</small></div>'+
    '<span class="gm-status '+st.id+'">'+st.label+'</span>'+
    '<button class="gm-edit" type="button" data-gm="edit" data-id="'+item.id+'">'+(active?'Close':'Edit')+'</button></div>'+
    (active?form(v,item):'');
 }).join('')+
 '<div class="gm-note">Checks use your saved date or odometer target, whichever arrives first. Each car has independent dates, mileage and costs. Alignment and A/C flushing are performed only when needed.</div></div>';
}
function open(itemId){
 const v=vehicle();
 if(!v||v.type!=='car')return;
 const id=ITEMS.find(x=>x.id===itemId)?.id||ITEMS[0].id;
 editingKey=key(v,id);
 render();
 const formNode=document.querySelector('.gm-form');
 if(formNode)formNode.scrollIntoView({behavior:'smooth',block:'nearest'});
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-gm]');
 if(!b)return;
 const v=vehicle();
 if(!v||v.type!=='car')return;
 const id=b.dataset.id,operation=b.dataset.gm;
 if(!ITEMS.some(x=>x.id===id))return;
 event.preventDefault();
 if(operation==='edit'){
  editingKey=editingKey===key(v,id)?'':key(v,id);
  render();
 }else if(operation==='suggest'){
  window.calculateManualReminder?.(id);
 }else if(operation==='save'){
  window.saveManualReminder?.(id);
 }else if(operation==='complete'){
  window.completeManualReminder?.(id);
 }
});
window.renderGarageCustomMaintenance=render;
window.openGarageCustomMaintenance=open;
})();
