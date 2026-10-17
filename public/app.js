import {firebaseConfig} from './firebase-config.js';
const $ = id => document.getElementById(id);
let items=[], room='', db, api, auth, editing=null, stop;
const form=$('itemForm');
const notice=message=>{$('notice').textContent=message;};
function failure(error){console.error(error.code||'operation-failed');notice('保存・接続に失敗しました。通信と設定を確認して再試行してください。'+(error.code ? ` (${error.code})`:''));}
function renderLocations(){
 const picker=$('locationPicker');if(!picker)return;
 const locations=[...new Set(items.map(item=>(item.location||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
 picker.replaceChildren();
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=locations.length?'入力済みの場所を選択':'まだ候補はありません';picker.append(placeholder);
 for(const location of locations){const option=document.createElement('option');option.value=location;option.textContent=location;picker.append(option);}
 picker.disabled=!locations.length;picker.value=locations.includes(form.elements.location.value)?form.elements.location.value:'';
}
const locationPicker=$('locationPicker');
if(locationPicker)locationPicker.onchange=()=>{if(locationPicker.value)form.elements.location.value=locationPicker.value;};
form.elements.location.addEventListener('input',()=>{if(locationPicker)locationPicker.value=form.elements.location.value;});
function render(){
 renderLocations();
 const done=items.filter(i=>i.done).length;$('count').textContent=`${done} / ${items.length}`;$('progress').max=items.length||1;$('progress').value=done;
 const shown=items.filter(i=>$('filter').value==='all'||i.done===($('filter').value==='done'));
 $('items').replaceChildren();
 if(!shown.length){const p=document.createElement('p');p.className='empty';p.textContent=items.length?'該当する品目はありません。':'まだ空っぽです。最初の品目を追加しましょう。';$('items').append(p);}
 shown.sort((a,b)=>Number(a.done)-Number(b.done)||a.name.localeCompare(b.name,'ja')).forEach(item=>{
 const row=document.createElement('article');row.className='item'+(item.done?' done':'');
 const check=document.createElement('input');check.type='checkbox';check.checked=item.done;check.setAttribute('aria-label',`${item.name}を購入済みにする`);check.onchange=async()=>{check.disabled=true;try{await api.updateDoc(ref(item.id),{done:check.checked,updatedBy:'',updatedAt:api.serverTimestamp()});}catch(e){check.checked=item.done;failure(e);}finally{check.disabled=false;}};
 const detail=document.createElement('div');detail.className='detail';const title=document.createElement('strong');title.textContent=item.name;const meta=document.createElement('p');meta.textContent=[item.category,item.quantity,item.location?`買い出し場所：${item.location}`:'場所未定',item.note].filter(Boolean).join(' · ');detail.append(title,meta);
 const controls=document.createElement('div');controls.className='controls';for(const [label,action] of [['編集',()=>edit(item)],['削除',async()=>{if(!confirm(`「${item.name}」を削除しますか？`))return;try{await api.deleteDoc(ref(item.id));if(editing===item.id)reset();}catch(e){failure(e);}}]]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',`${item.name}を${label}`);b.onclick=action;controls.append(b);}row.append(check,detail,controls);$('items').append(row);
 });
}
const ref=id=>api.doc(db,'lists',room,'items',id);
function reset(){editing=null;form.reset();$('formTitle').textContent='買うものを追加';form.querySelector('[type=submit]').textContent='追加する';$('cancel').hidden=true;}
function edit(item){editing=item.id;for(const key of ['name','quantity','category','location','note'])form.elements[key].value=item[key]||'';$('formTitle').textContent='品目を編集';form.querySelector('[type=submit]').textContent='変更を保存';$('cancel').hidden=false;renderLocations();form.elements.name.focus();}
$('cancel').onclick=reset;$('filter').onchange=render;
form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;const data={};for(const key of ['name','quantity','category','location','note'])data[key]=form.elements[key].value.trim();if(!data.name){notice('品名を入力してください。');button.disabled=false;return;}try{const common={...data,assignee:'',updatedBy:'',updatedAt:api.serverTimestamp()};if(editing)await api.updateDoc(ref(editing),common);else await api.addDoc(api.collection(db,'lists',room,'items'),{...common,done:false,createdAt:api.serverTimestamp()});reset();notice('');}catch(e){failure(e);}finally{button.disabled=false;}};
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);notice('共有URLをコピーしました。参加者に送ってください。');}catch{notice('アドレスバーのURLをコピーして参加者に送ってください。');}};
async function openRoom(){
 if(stop)stop();reset();items=[];render();room=location.hash.slice(1);$('board').hidden=true;$('welcome').hidden=true;
 if(!room){$('welcome').hidden=false;return;}
 if(!/^[a-f0-9]{48}$/.test(room)){notice('共有URLが正しくありません。送信者に確認してください。');return;}
 try{const snapshot=await api.getDoc(api.doc(db,'lists',room));if(!snapshot.exists()){notice('リストが見つかりません。共有URLを確認してください。');return;}$('board').hidden=false;notice('');stop=api.onSnapshot(api.collection(db,'lists',room,'items'),{includeMetadataChanges:true},snapshot=>{items=snapshot.docs.map(d=>({id:d.id,...d.data()}));$('connection').textContent=snapshot.metadata.hasPendingWrites?'保存中…':snapshot.metadata.fromCache?'接続確認中…':'● 同期済み';render();},e=>{$('connection').textContent='接続エラー';failure(e);});}catch(e){failure(e);}
}
$('create').onclick=async()=>{const b=$('create');b.disabled=true;try{const token=Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');await api.setDoc(api.doc(db,'lists',token),{createdAt:api.serverTimestamp(),createdBy:auth.currentUser.uid});location.hash=token;}catch(e){failure(e);}finally{b.disabled=false;}};
window.addEventListener('offline',()=>{$('connection').textContent='オフライン（未同期）';});
async function start(){if(!firebaseConfig){$('connection').textContent='未接続';notice('Firebaseの接続設定がまだありません。設定完了後に共有リストを作成できます。');return;}
 try{const [appSDK,authSDK,firestoreSDK]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')]);api=firestoreSDK;const app=appSDK.initializeApp(firebaseConfig);auth=authSDK.getAuth(app);await auth.authStateReady();if(!auth.currentUser)await authSDK.signInAnonymously(auth);db=api.getFirestore(app);$('connection').textContent='接続済み';window.addEventListener('hashchange',openRoom);await openRoom();}catch(e){$('connection').textContent='接続エラー';failure(e);}}
start();
