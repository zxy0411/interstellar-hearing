import{cacheGet,cachePut}from './storage.js';

const VOICES={
 'en-GB':['en-GB-SoniaNeural','en-GB-RyanNeural'],'en-US':['en-US-JennyNeural','en-US-GuyNeural'],
 'ko-KR':['ko-KR-SunHiNeural','ko-KR-InJoonNeural'],'ja-JP':['ja-JP-NanamiNeural','ja-JP-KeitaNeural'],
 'de-DE':['de-DE-KatjaNeural','de-DE-ConradNeural'],'it-IT':['it-IT-ElsaNeural','it-IT-DiegoNeural'],
 'fr-FR':['fr-FR-DeniseNeural','fr-FR-HenriNeural'],
};
export function freeAudioIdentity(word,locale,settings={}){
 const voices=VOICES[locale];if(!voices)throw new Error('免费在线发音暂不支持这门语言');
 const selected=settings.voiceByLocale?.[locale],voice=voices.includes(selected)?selected:voices[0];
 const text=word.word.normalize('NFC').trim();
 // Reuse the recordings obtained by the previous local natural-voice version.
 return {text,locale,voice,key:'natural-v2:'+locale+':'+voice+':'+text};
}
function resultFor(word,identity,blob,cached){return {blob,cached,recording:{kind:'free-api',provider:'edge',locale:identity.locale,word:word.word,language:word.language,name:identity.voice.replace(/^[a-z]{2}-[A-Z]{2}-|Neural$/g,''),sourceUrl:'https://www.microsoft.com/edge/features/read-aloud',attribution:'Microsoft Edge 在线语音服务',license:'服务音频；不声明开放许可'}};}
export async function cachedFreeAudio(word,locale,settings){
 const identity=freeAudioIdentity(word,locale,settings),saved=await cacheGet(identity.key);
 return saved?.blob?.size>128&&(!saved.provider||saved.provider==='edge')?resultFor(word,identity,saved.blob,true):null;
}
export function freeSpeechEndpoint(){
 const page=new URL(location.href);
 if(page.protocol==='file:')return 'http://127.0.0.1:4173/api/free-speech';
 return new URL('/.netlify/functions/free-speech',page).href;
}
export async function requestFreeAudio(word,locale,settings,{signal}={}){
 const identity=freeAudioIdentity(word,locale,settings);signal?.throwIfAborted();
 let response;
 try{response=await fetch(freeSpeechEndpoint(),{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:identity.text,locale,voice:identity.voice}),signal});}
 catch(error){if(signal?.aborted)throw signal.reason;throw new Error('免费在线发音暂时连接失败，请通过启动器打开后重试');}
 if(!response.ok){const data=await response.json().catch(()=>({}));const error=new Error(data.error||'免费在线发音暂不可用，请稍后重试');error.code=data.code||'free_speech_failed';error.status=response.status;error.retryAfter=response.headers.get('Retry-After');throw error;}
 if(response.headers.get('X-Speech-Provider')!=='edge')throw new Error('免费发音接口未返回免费服务音频，已停止播放');
 if(!/^audio\//i.test(response.headers.get('Content-Type')||''))throw new Error('免费发音接口没有返回有效音频');
 const blob=await response.blob();signal?.throwIfAborted();if(blob.size<=128)throw new Error('免费发音音频不完整，请重试');
 await cachePut(identity.key,{blob,provider:'edge',voice:identity.voice,locale,name:identity.voice});
 signal?.throwIfAborted();return resultFor(word,identity,blob,false);
}
