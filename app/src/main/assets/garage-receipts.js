
/* Offline PDF and photo receipts for each service history record. */
(function(){
'use strict';
const DB_NAME='car-service-receipts-v1';
const TABLE='receipts';
let currentTarget=null;
let dbPromise=null;
let previewUrl=null;
const picker=document.createElement('input');
picker.type='file';picker.accept='image/*,application/pdf';picker.className='g-receipt-picker';
document.body.appendChild(picker);
function openDb(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error('Local receipt storage is unavailable on this device.'));return;}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{
   const d=req.result;
   if(!d.objectStoreNames.contains(TABLE)){
    const store=d.createObjectStore(TABLE,{keyPath:'id'});
    store.createIndex('recordKey','recordKey',{unique:false});
   }
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Could not open local receipt storage.'));
 });
 return dbPromise;
}
async function storeReceipt(record){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(TABLE,'readwrite');
  tx.objectStore(TABLE).put(record);
  tx.oncomplete=()=>resolve(record);
  tx.onerror=()=>reject(tx.error||new Error('Receipt could not be saved.'));
 });
}
async function listReceipts(recordKey){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(TABLE,'readonly');
  const req=tx.objectStore(TABLE).index('recordKey').getAll(recordKey);
  req.onsuccess=()=>resolve(req.result||[]);
  req.onerror=()=>reject(req.error||new Error('Could not retrieve receipts.'));
 });
}
async function getReceipt(id){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(TABLE,'readonly');
  const req=tx.objectStore(TABLE).get(id);
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Receipt not found.'));
 });
}
async function deleteReceipt(id){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(TABLE,'readwrite');
  tx.objectStore(TABLE).delete(id);
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(tx.error||new Error('Could not delete receipt.'));
 });
}
function locateRecord(slot,recordId){
 return state.records.some(r=>String(r.id)===String(recordId)&&String(r.slot)===String(slot));
}
function safeText(v){
 return esc(String(v??''));
}
function smallName(name){return name.length>45?name.slice(0,42)+'…':name;}
async function compactImage(file){
 if(!file.type.startsWith('image/')||file.type==='image/svg+xml')return file;
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Unable to read receipt image.'));
  reader.onload=()=>{
   const image=new Image();
   image.onerror=()=>reject(new Error('Unable to process receipt photo.'));
   image.onload=()=>{
    const scale=Math.min(1,1600/Math.max(image.width,image.height));
    const cv=document.createElement('canvas');
    cv.width=Math.max(1,Math.round(image.width*scale));
    cv.height=Math.max(1,Math.round(image.height*scale));
    cv.getContext('2d').drawImage(image,0,0,cv.width,cv.height);
    cv.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to compress image.')),'image/jpeg',0.83);
   };
   image.src=reader.result;
  };
  reader.readAsDataURL(file);
 });
}
async function updateSlot(el){
 const key=el.dataset.greceiptVehicle+'|'+el.dataset.greceiptRecord;
 const exists=locateRecord(el.dataset.greceiptVehicle,el.dataset.greceiptRecord);
 if(!exists){el.textContent='';return;}
 try{
  const all=await listReceipts(key);
  if(!el.isConnected||el.dataset.greceiptVehicle+'|'+el.dataset.greceiptRecord!==key)return;
  el.innerHTML='<div class="g-receipt-actions"><button type="button" class="g-receipt-btn" data-receipt="attach" data-key="'+safeText(key)+'">📎 Attach Receipt</button>'+
   '<small class="g-receipt-info">'+(all.length?'Saved offline · '+all.length+' receipt'+(all.length===1?'':'s'):'Image or PDF · saved to this service record')+'</small></div>'+
   all.map(r=>'<div class="g-receipt-entry"><span class="g-receipt-info">📄 '+safeText(smallName(r.name))+'</span>'+
   '<div class="g-receipt-controls"><button type="button" class="g-receipt-btn" data-receipt="view" data-id="'+safeText(r.id)+'">View</button>'+
   '<button type="button" class="g-receipt-btn g-receipt-remove" data-receipt="remove" data-id="'+safeText(r.id)+'">Remove</button></div></div>').join('');
 }catch(err){
  el.innerHTML='<button type="button" class="g-receipt-btn" data-receipt="attach" data-key="'+safeText(key)+'">Attach Receipt</button>'+
   '<small class="g-receipt-info"> '+safeText(err.message)+'</small>';
 }
}
function refresh(){document.querySelectorAll('[data-greceipt-record]').forEach(updateSlot);}
function closePreview(){
 document.getElementById('gReceiptPreview')?.remove();
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
}
function previewImage(record){
 closePreview();
 previewUrl=URL.createObjectURL(record.blob);
 const box=document.createElement('div');
 box.id='gReceiptPreview';box.className='g-receipt-modal';
 box.innerHTML='<div class="g-receipt-dialog"><div class="g-receipt-dialog-header"><strong>'+safeText(record.name)+'</strong>'+
 '<button class="g-receipt-btn" data-receipt="close">Close</button></div><img alt="Service receipt" src="'+previewUrl+'"></div>';
 document.body.appendChild(box);
 box.addEventListener('click',event=>{if(event.target===box)closePreview();});
}
function viewNative(record){
 if(!window.CarServiceFiles||typeof window.CarServiceFiles.openReceipt!=='function'){
  alert('No external PDF viewer is available in this version. Receipt remains safely stored.');
  return;
 }
 const reader=new FileReader();
 reader.onload=()=>{
  const b64=String(reader.result).split(',')[1];
  try{window.CarServiceFiles.openReceipt(b64,record.mime||'application/pdf',record.name);}
  catch(error){alert('Could not open receipt on this device.');}
 };
 reader.onerror=()=>alert('Could not read saved receipt.');
 reader.readAsDataURL(record.blob);
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-receipt]');if(!button)return;
 e.preventDefault();e.stopPropagation();
 const action=button.dataset.receipt;
 if(action==='close'){closePreview();return;}
 if(action==='attach'){
  const key=button.dataset.key;
  const [slot,recordId]=key.split('|');
  if(!locateRecord(slot,recordId)){alert('This service record could not be found.');return;}
  currentTarget=key;
  picker.click();
  return;
 }
 if(action==='view'){
  try{
   const r=await getReceipt(button.dataset.id);
   if(!r){alert('Receipt could not be found.');return;}
   if(r.mime.startsWith('image/'))previewImage(r);else viewNative(r);
  }catch(err){alert('Unable to load receipt: '+err.message);}
  return;
 }
 if(action==='remove'){
  if(!confirm('Remove the saved receipt from this service record?'))return;
  try{await deleteReceipt(button.dataset.id);refresh();}
  catch(err){alert('Could not remove receipt: '+err.message);}
 }
});
picker.addEventListener('change',async()=>{
 const file=picker.files?.[0];picker.value='';
 const target=currentTarget;currentTarget=null;
 if(!file||!target)return;
 if(!(file.type.startsWith('image/')||file.type==='application/pdf')){
  alert('Please select a receipt image or PDF document.');return;
 }
 if(file.size>12*1024*1024){alert('Receipt must be smaller than 12 MB.');return;}
 const [slot,recordId]=target.split('|');
 if(!locateRecord(slot,recordId)){alert('Service record no longer exists.');return;}
 try{
  const blob=await compactImage(file);
  const mime=blob.type||file.type;
  await storeReceipt({
   id:'sr_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
   recordKey:target,recordId,slot,name:file.name,mime,blob,size:blob.size,createdAt:new Date().toISOString()
  });
  refresh();alert('Receipt saved to this service history record.');
 }catch(err){alert('Unable to save receipt: '+err.message);}
});
window.renderServiceReceiptButtons=refresh;
refresh();
})();
