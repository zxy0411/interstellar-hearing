import{parseWords,normalizeWord,uniqueWords,LANGUAGES}from './core.mjs';

const fileLimit=300,totalLimit=32*1024*1024;
const missing=error=>error?.name==='NotFoundError';
const stableId=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.codePointAt(0),16777619);return (n>>>0).toString(36);};
const safeName=name=>name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,70)||'词库';
export async function readStudyDirectory(directory,{language='en',preferRoot=false}={}){
 let home=directory,managed=false;
 if(!preferRoot)try{home=await directory.getDirectoryHandle('星际单词学习');managed=true;}catch(error){if(!missing(error))throw error;}
 let snapshot=null,bytes=0,count=0;
 async function readFile(handle){const file=await handle.getFile();bytes+=file.size;count++;if(file.size>5*1024*1024||bytes>totalLimit||count>fileLimit)throw new Error('文件夹内容较大，请分批导入（单文件 5 MB、合计 32 MB、最多 300 个文件）');return (await file.text()).replace(/^\uFEFF/,'');}
 try{snapshot=JSON.parse(await readFile(await home.getFileHandle('完整备份.json')));if(!Array.isArray(snapshot?.libraries))throw new Error('完整备份格式无效');}catch(error){if(!missing(error))throw new Error('无法读取文件夹备份：'+error.message);}
 const libraries=[],folders=[],seenIds=new Set();
 async function walk(dir,path='',depth=0){
  if(depth>4)throw new Error('文件夹层级超过 4 层，请选择更具体的学习目录');
  const items=[];for await(const entry of dir.values())items.push(entry);items.sort((a,b)=>a.name.localeCompare(b.name));
  for(const entry of items){
   if(entry.name.startsWith('.')||['星际单词学习','完整备份.json','播放历史.json'].includes(entry.name))continue;
   const relative=path?path+'/'+entry.name:entry.name;
   if(entry.kind==='directory'){await walk(entry,relative,depth+1);continue;}
   if(!/\.(json|txt|csv)$/i.test(entry.name))continue;
   const text=await readFile(entry);if(!text.trim())continue;
   let source=null,words;
   try{if(/\.json$/i.test(entry.name))source=JSON.parse(text);if(source?.libraries)continue;const lang=LANGUAGES[source?.language]?source.language:language;words=Array.isArray(source?.words)?uniqueWords(source.words.map(w=>normalizeWord(w,lang))):parseWords(text,lang);}catch(error){throw new Error('文件“'+relative+'”无法读取：'+error.message);}
   const indexed=snapshot?.libraries?.find(l=>l.id===source?.id);
   const exported=source?.id&&entry.name.endsWith('-'+source.id.slice(0,8)+'.json');
   if(managed&&snapshot&&exported&&(!indexed||indexed.name!==source.name||indexed.folderId!==source.folderId))continue;
   if(managed&&snapshot&&exported&&indexed){const folder=snapshot.folders?.find(f=>f.id===indexed.folderId);const expected=folder?safeName(folder.name)+'-'+folder.id.slice(0,8):'';if(path!==expected)continue;}
   if(source?.id&&seenIds.has(source.id))continue;
   const lang=LANGUAGES[source?.language]?source.language:words[0]?.language||language;
   const id=typeof source?.id==='string'&&!seenIds.has(source.id)?source.id:'disk-lib-'+stableId(relative);seenIds.add(id);
   let folderId=null;
   if(path){const original=snapshot?.folders?.find(f=>f.id===source?.folderId);folderId=original?.id||'disk-folder-'+stableId(path);if(!folders.some(f=>f.id===folderId))folders.push(original||{id:folderId,name:path.split('/').join(' / ')});}
   libraries.push({id,name:String(source?.name||entry.name.replace(/\.[^.]+$/,'')).slice(0,80),language:lang,folderId,builtin:false,words});
  }
 }
 await walk(home);
 // In managed folders, individual library files are authoritative when present.
 if(snapshot&&libraries.length){snapshot={...snapshot,libraries:[...snapshot.libraries.filter(l=>l.builtin),...libraries],folders:[...new Map([...(snapshot.folders||[]),...folders].map(f=>[f.id,f])).values()]};}
 return {snapshot,libraries,folders,found:!!snapshot||libraries.length>0,managed};
}
