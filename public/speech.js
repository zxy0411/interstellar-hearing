import{LANGUAGES,comparison}from './core.mjs';
import{cacheGet,cachePut}from './storage.js';
import{loadRecordingCatalog,findRecording}from './recordings.mjs';
import{lookupRemoteRecordings}from './recording-source.mjs';
import{freeAudioIdentity,cachedFreeAudio,requestFreeAudio}from './free-speech.mjs';

const cancelled=()=>new DOMException('Cancelled','AbortError');
const accentNames={'en-GB':'英式','en-US':'美式','ko-KR':'韩语','ja-JP':'日语','de-DE':'德语','it-IT':'意大利语','fr-FR':'法语'};
function retryDeadline(value){const seconds=Number(value);return Date.now()+(value&&Number.isFinite(seconds)?Math.max(0,seconds)*1000:Math.max(60000,Date.parse(value)-Date.now()||0));}
function cooldownError(until,key){const free=key==='free-api';const error=new Error((free?'免费在线发音服务':'词典录音来源')+'正在限流，请约 '+Math.max(1,Math.ceil((until-Date.now())/60000))+' 分钟后重试；内置和已缓存录音仍可播放');error.code=free?'free_speech_rate_limited':'recording_rate_limited';error.status=429;return error;}
export class VoicePlayer{
 constructor(onStatus=()=>{}){
  this.onStatus=onStatus;this.generation=0;this.audio=null;this.cancelPending=null;
  this.dictionaryReady=false;this.service={available:false,entries:0,recordings:0};this.lastRecording=null;
  this.requests=new Set();this.lookups=new Map();this.inflight=new Map();this.freeInflight=new Map();this.memory=new Map();
  this.maps=new Map();this.cooldowns=new Map();this.prefetchQueue=[];this.prefetchJobs=new Map();this.prefetchActive=new Set();this.foregroundPending=0;
 }
 localeFor(word,accent){return word.language==='en'?(accent==='us'?'en-US':'en-GB'):LANGUAGES[word.language]?.locale;}
 async initialize(){
  try{const catalog=await loadRecordingCatalog();const entries=Object.values(catalog.entries);
   this.service={available:true,entries:entries.filter(e=>Object.keys(e.recordings).length).length,recordings:entries.reduce((n,e)=>n+Object.keys(e.recordings).length,0),coverage:catalog.coverage,reason:'内置录音优先，其他词条按需查询现成词典录音'};this.dictionaryReady=true;return this.service;
  }catch(error){this.dictionaryReady=false;this.service={...this.service,available:false,reason:error.message};throw error;}
 }
 assertCurrent(token){if(token!==this.generation)throw cancelled();}
 async checkCooldown(key,token){const until=this.cooldowns.get(key)||(await cacheGet('recording-cooldown:'+key))?.until||0;this.assertCurrent(token);if(until>Date.now()){this.cooldowns.set(key,until);throw cooldownError(until,key);}}
 async rememberCooldown(key,retryAfter){const until=retryDeadline(retryAfter);this.cooldowns.set(key,until);await cachePut('recording-cooldown:'+key,{until});return cooldownError(until,key);}
 stop(){
  this.generation++;const cancel=this.cancelPending;this.cancelPending=null;cancel?.();
  if(this.audio){this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null;}
  for(const ctrl of this.requests)ctrl.abort();this.requests.clear();this.inflight.clear();this.freeInflight.clear();this.lookups.clear();
  for(const job of this.prefetchJobs.values())job.resolve();this.prefetchJobs.clear();this.prefetchQueue=[];
 }
 async remoteMap(word,token,locale,timeout=16000){
  const key=word.language+':'+comparison(word.word,word.language),cacheKey='recording-index-v1:'+key;
  let saved=this.maps.get(key)||await cacheGet(cacheKey);this.assertCurrent(token);
  if(saved?.recordings&&(saved.recordings[locale]||Date.now()-saved.at<86400000)){this.maps.set(key,saved);return saved.recordings;}
  if(this.lookups.has(key))return this.lookups.get(key);
  await this.checkCooldown('index',token);
  if(this.lookups.has(key))return this.lookups.get(key);
  const ctrl=new AbortController();this.requests.add(ctrl);
  const task=(async()=>{
   try{
    const recordings=await lookupRemoteRecordings(word,{signal:AbortSignal.any([ctrl.signal,AbortSignal.timeout(timeout)])});this.assertCurrent(token);
    saved={recordings,at:Date.now()};this.maps.set(key,saved);await cachePut(cacheKey,saved);return recordings;
   }catch(error){if(ctrl.signal.aborted||token!==this.generation)throw cancelled();if(error.status===429)throw await this.rememberCooldown('index',error.retryAfter);throw error;}
   finally{this.requests.delete(ctrl);if(this.lookups.get(key)===task)this.lookups.delete(key);}
  })();this.lookups.set(key,task);return task;
 }
 async resolveRecording(word,locale,token,timeout){
  let bundled,catalogFailure;
  try{bundled=await findRecording(word,locale);}catch(error){if(error.code!=='catalog_load_failed')throw error;catalogFailure=error;}
  this.assertCurrent(token);if(bundled)return bundled;
  const recordings=await this.remoteMap(word,token,locale,timeout);this.assertCurrent(token);
  if(recordings[locale])return recordings[locale];
  if(catalogFailure)throw catalogFailure;
  const alternate=locale==='en-GB'&&recordings['en-US']?'；可切换美音播放':locale==='en-US'&&recordings['en-GB']?'；可切换英音播放':'';
  const error=new Error('当前词典未收录该单词的'+(accentNames[locale]||locale)+'读音'+alternate);error.code='missing_recording';error.availableLocales=Object.keys(recordings);throw error;
 }
 async prepareFree(word,locale,token,settings){
  const {key}=freeAudioIdentity(word,locale,settings);
  const cached=this.memory.get(key)||await cachedFreeAudio(word,locale,settings);this.assertCurrent(token);if(cached)return {...cached,cached:true};
  if(this.freeInflight.has(key))return this.freeInflight.get(key);
  await this.checkCooldown('free-api',token);if(this.freeInflight.has(key))return this.freeInflight.get(key);
  const ctrl=new AbortController();this.requests.add(ctrl);
  const task=(async()=>{try{
   this.onStatus('正在获取免费在线发音…');
   const result=await requestFreeAudio(word,locale,settings,{signal:AbortSignal.any([ctrl.signal,AbortSignal.timeout(20000)])});this.assertCurrent(token);
   this.memory.set(key,result);if(this.memory.size>60)this.memory.delete(this.memory.keys().next().value);return result;
  }catch(error){if(ctrl.signal.aborted||token!==this.generation)throw cancelled();if(error.status===429)throw await this.rememberCooldown('free-api',error.retryAfter);if(error.name==='TimeoutError')throw new Error('免费在线发音连接超时，请稍后重试');throw error;}
  finally{this.requests.delete(ctrl);if(this.freeInflight.get(key)===task)this.freeInflight.delete(key);}})();this.freeInflight.set(key,task);return task;
 }
 async prepare(word,accent,token,settings={}){
  const locale=this.localeFor(word,accent);
  if(settings.freeFallback===true){
   let bundled;try{bundled=await findRecording(word,locale);}catch(error){if(error.code==='catalog_invalid')throw error;}
   this.assertCurrent(token);
   if(!bundled){
    // Prefer already cached dictionary audio, then cached free-service audio, before any network work.
    const wordKey=word.language+':'+comparison(word.word,word.language);
    const map=this.maps.get(wordKey)||await cacheGet('recording-index-v1:'+wordKey);this.assertCurrent(token);
    const recording=map?.recordings?.[locale];
    if(recording){const key='dictionary-audio-v1:'+recording.src;const audio=this.memory.get(key)||await cacheGet(key);this.assertCurrent(token);if(audio?.blob?.size>128)return {recording,blob:audio.blob,cached:true};}
    const freeKey=freeAudioIdentity(word,locale,settings).key;
    const cached=this.memory.get(freeKey)||await cachedFreeAudio(word,locale,settings);this.assertCurrent(token);if(cached)return {...cached,cached:true};
   }
  }
  try{return await this.prepareRecording(word,accent,token,settings.freeFallback===true?5000:undefined);}
  catch(error){
   if(token!==this.generation||error.name==='AbortError'||settings.freeFallback!==true||error.code==='catalog_invalid')throw error;
   return this.prepareFree(word,locale,token,settings);
  }
 }
 async prepareRecording(word,accent,token,timeout){
  const locale=this.localeFor(word,accent);if(!locale)throw new Error('未知的学习语言');
  const recording=await this.resolveRecording(word,locale,token,timeout);this.assertCurrent(token);
  if(new URL(recording.src,location.href).protocol==='file:')return {recording,url:recording.src};
  const key='dictionary-audio-v1:'+recording.src;
  let audio=this.memory.get(key)||await cacheGet(key);this.assertCurrent(token);
  if(audio?.blob?.size>128){this.memory.set(key,audio);return {recording,blob:audio.blob,cached:true};}
  if(this.inflight.has(key)){const shared=await this.inflight.get(key);this.assertCurrent(token);return {...shared,recording};}
  const origin=new URL(recording.src).origin;await this.checkCooldown(origin,token);
  if(this.inflight.has(key)){const shared=await this.inflight.get(key);this.assertCurrent(token);return {...shared,recording};}
  const ctrl=new AbortController();this.requests.add(ctrl);
  const task=(async()=>{
   try{
    const response=await fetch(recording.src,{signal:AbortSignal.any([ctrl.signal,AbortSignal.timeout(timeout||18000)]),credentials:'omit',redirect:'error'});
    if(response.status===429)throw await this.rememberCooldown(origin,response.headers.get('Retry-After'));
    if(!response.ok){const error=new Error('词典录音下载失败，请检查网络后重试');error.code='recording_download_failed';throw error;}
    if(!/^(audio\/|application\/ogg)/i.test(response.headers.get('content-type')||''))throw new Error('词典没有返回有效音频文件');
    const blob=await response.blob();this.assertCurrent(token);if(blob.size<=128)throw new Error('词典音频文件不完整');
    audio={blob};this.memory.set(key,audio);if(this.memory.size>60)this.memory.delete(this.memory.keys().next().value);
    await cachePut(key,audio);this.assertCurrent(token);return {recording,blob,cached:false};
   }catch(error){if(ctrl.signal.aborted||token!==this.generation)throw cancelled();if(error.name==='TimeoutError')throw new Error('词典录音连接超时，请稍后重试');if(error instanceof TypeError)throw new Error('词典录音连接失败；联网获取一次后可缓存重播');throw error;}
   finally{this.requests.delete(ctrl);if(this.inflight.get(key)===task)this.inflight.delete(key);}
  })();this.inflight.set(key,task);return task;
 }
 async speak(word,accent,settings){
  const token=this.generation;this.foregroundPending++;this.onStatus('正在查找词典录音…');
  try{
   const audio=await this.prepare(word,accent,token,settings);this.assertCurrent(token);this.lastRecording=audio.recording;
   const url=audio.url||URL.createObjectURL(audio.blob);
   try{this.onStatus((audio.recording.kind==='free-api'?'免费在线发音':'词典录音')+' · '+(accentNames[audio.recording.locale]||audio.recording.locale)+(audio.cached?' · 已缓存':''));return await this.playAudio(url,settings.speed||1,token);}
   finally{if(!audio.url)URL.revokeObjectURL(url);}
  }catch(error){if(token!==this.generation||error.name==='AbortError')return false;this.onStatus(error.message||'读音暂时无法加载');throw error;}
  finally{this.foregroundPending--;queueMicrotask(()=>this.drainPrefetch());}
 }
 prefetch(word,accent,settings){return this.enqueuePrefetch(word?[word]:[],accent,settings,'direct');}
 prefetchUpcoming(words,accent,settings){return this.enqueuePrefetch((words||[]).slice(0,3),accent,settings,'upcoming');}
 enqueuePrefetch(words,accent,settings,kind){
  const desired=[];
  for(const word of words.filter(Boolean))for(const itemAccent of(word.language==='en'&&accent==='both'?['uk','us']:[accent])){
   const key=word.language+':'+comparison(word.word,word.language)+':'+this.localeFor(word,itemAccent);
   if(!desired.some(item=>item.key===key))desired.push({key,word:{...word},accent:itemAccent,settings,generation:this.generation,kind});
  }
  if(kind==='upcoming'){const keys=new Set(desired.map(item=>item.key));this.prefetchQueue=this.prefetchQueue.filter(job=>{if(job.kind!=='upcoming'||keys.has(job.key))return true;this.prefetchJobs.delete(job.key);job.resolve();return false;});}
  const pending=desired.map(item=>{let job=this.prefetchJobs.get(item.key);if(job){if(kind==='direct')job.kind=kind;return job.promise;}let resolve;const promise=new Promise(done=>{resolve=done;});job={...item,resolve,promise};this.prefetchJobs.set(job.key,job);this.prefetchQueue.push(job);return promise;});
  this.prefetchQueue.sort((a,b)=>(a.kind==='direct'?0:1)-(b.kind==='direct'?0:1));queueMicrotask(()=>this.drainPrefetch());return Promise.all(pending);
 }
 drainPrefetch(){
  while(this.prefetchActive.size<2&&this.foregroundPending===0&&this.prefetchQueue.length){
   const job=this.prefetchQueue.shift();if(job.generation!==this.generation){this.prefetchJobs.delete(job.key);job.resolve();continue;}
   // Prefetch existing recordings only; do not generate audio the user may never play.
   this.prefetchActive.add(job);this.prepare(job.word,job.accent,job.generation,{...job.settings,freeFallback:false}).catch(()=>{}).finally(()=>{if(this.prefetchJobs.get(job.key)===job)this.prefetchJobs.delete(job.key);this.prefetchActive.delete(job);job.resolve();queueMicrotask(()=>this.drainPrefetch());});
  }
 }
 playAudio(url,speed,token){return new Promise((resolve,reject)=>{
  const audio=new Audio(url);this.audio=audio;audio.playbackRate=speed;audio.preservesPitch=true;let settled=false;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timeout);audio.onended=null;audio.onerror=null;if(this.audio===audio)this.audio=null;if(this.cancelPending===cancel)this.cancelPending=null;error?reject(error):resolve(token===this.generation);};
  const cancel=()=>{audio.pause();audio.removeAttribute('src');audio.load();finish();};
  const timeout=setTimeout(()=>{audio.pause();finish(new Error('录音播放超时，请重试'));},Math.max(15000,45000/speed));
  this.cancelPending=cancel;audio.onended=()=>finish();audio.onerror=()=>finish(new Error('词典音频无法播放，请重试'));audio.play().catch(finish);
 });}
}

