const DB='interstellar-v1';let dbPromise;let profileScope='guest';
function scopedKey(key,store){return store==='data'&&profileScope!=='guest'?'account:'+profileScope+':'+key:key;}
export function currentProfileScope(){return profileScope;}
export function recoveryKey(){return profileScope==='guest'?'interstellar-recovery-v1':'interstellar-recovery-v1:'+profileScope;}
export async function setProfileScope(id){await flushDirectory();profileScope=id||'guest';directory=null;directoryLoaded=false;sourceRoot=false;}
function open(){return dbPromise||=(new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('data');r.result.createObjectStore('cache');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
export async function get(key,store='data'){const finalKey=scopedKey(key,store),db=await open();return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(finalKey);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function put(key,value,store='data'){const finalKey=scopedKey(key,store),db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,finalKey);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function cacheGet(key){try{return await get(key,'cache');}catch{return undefined;}}
export async function cachePut(key,value){try{await put(key,value,'cache');}catch{/* A cache failure must not block learning. */}}
let directory=null,directoryLoaded=false,sourceRoot=false;let writeChain=Promise.resolve();
export async function flushDirectory(){await writeChain;}
export async function restoreDirectory(){directoryLoaded=false;try{directory=await get('directory');sourceRoot=await get('directory-source-root')===true;return directory;}catch{directory=null;return null;}}
export function markDirectoryLoaded(){directoryLoaded=true;}
export function usesSourceRoot(){return sourceRoot;}
export async function setSourceRoot(value){sourceRoot=!!value;await put('directory-source-root',sourceRoot);}
export async function adoptDirectory(handle,root=false){directory=handle;directoryLoaded=false;sourceRoot=root;await put('directory',handle);await put('directory-source-root',root);}
export function currentDirectory(){return directory;}
export async function chooseDirectory(){if(!window.showDirectoryPicker)throw new Error('当前浏览器不支持指定目录，请使用桌面 Chrome / Edge，或导出完整备份');const selected=await window.showDirectoryPicker({id:'interstellar-home',mode:'readwrite'});await flushDirectory();directory=selected;directoryLoaded=false;sourceRoot=false;await put('directory',selected);await put('directory-source-root',false);return selected;}
export async function reconnectDirectory(){if(!directory)return chooseDirectory();if(await directory.requestPermission({mode:'readwrite'})!=='granted')throw new Error('未获得保存权限，数据仍保留在浏览器中');directoryLoaded=false;return directory;}
export async function directoryReady(){return directory&&await directory.queryPermission({mode:'readwrite'})==='granted';}
const safeName=name=>name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,70)||'词库';
export async function saveFile(filename,content,mime='application/json'){if(directory){if(!await directoryReady())throw new Error('保存目录需要重新授权，请在保存设置中连接目录');const f=await directory.getFileHandle(safeName(filename),{create:true});const writer=await f.createWritable();await writer.write(content);await writer.close();return 'directory';}const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'download';}
export function syncDirectory(state){const snapshot=structuredClone(state),target=directory,ready=directoryLoaded;writeChain=writeChain.catch(()=>{}).then(async()=>{if(!target||!ready||await target.queryPermission({mode:'readwrite'})!=='granted')return false;const home=await target.getDirectoryHandle('星际单词学习',{create:true});async function write(dir,name,data){const f=await dir.getFileHandle(safeName(name),{create:true});const w=await f.createWritable();await w.write(JSON.stringify(data,null,2));await w.close();}await write(home,'完整备份.json',snapshot);await write(home,'播放历史.json',snapshot.history);for(const lib of snapshot.libraries.filter(l=>!l.builtin)){const folder=snapshot.folders.find(f=>f.id===lib.folderId);const dest=folder?await home.getDirectoryHandle(safeName(folder.name)+'-'+folder.id.slice(0,8),{create:true}):home;await write(dest,safeName(lib.name)+'-'+lib.id.slice(0,8)+'.json',lib);}return true;});return writeChain;}
