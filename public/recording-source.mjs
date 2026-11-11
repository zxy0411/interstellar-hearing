// Existing human recordings only. No text-to-speech or guessed audio URLs.
export const RECORDING_LANGUAGES = Object.freeze({
 en:{name:'English',locale:null},ko:{name:'Korean',locale:'ko-KR'},ja:{name:'Japanese',locale:'ja-JP'},
 de:{name:'German',locale:'de-DE'},it:{name:'Italian',locale:'it-IT'},fr:{name:'French',locale:'fr-FR'},
});
export const recordingKey = word => word.language+':'+String(word.word||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export class RecordingSourceError extends Error {
 constructor(message,{status=0,code='network',retryAfter=null}={}){super(message);this.name='RecordingSourceError';this.status=status;this.code=code;this.retryAfter=retryAfter;}
}
export function isTrustedAudioURL(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='upload.wikimedia.org';}catch{return false;}}
function plainText(value=''){
 return String(value).replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function splitTemplate(body){
 const parts=[];let current='',depth=0,links=0;
 for(let i=0;i<body.length;i++){
  const pair=body.slice(i,i+2);
  if(pair==='{{'){depth++;current+=pair;i++;continue;}if(pair==='}}'){depth--;current+=pair;i++;continue;}
  if(pair==='[['){links++;current+=pair;i++;continue;}if(pair===']]'){links--;current+=pair;i++;continue;}
  if(body[i]==='|'&&depth===0&&links===0){parts.push(current.trim());current='';}else current+=body[i];
 }parts.push(current.trim());return parts;
}
function templates(text){
 const result=[],stack=[];
 for(let i=0;i<text.length-1;i++){
  if(text.slice(i,i+2)==='{{'){stack.push(i);i++;}
  else if(text.slice(i,i+2)==='}}'&&stack.length){const start=stack.pop();result.push({start,end:i+2,parts:splitTemplate(text.slice(start+2,i)),raw:text.slice(start,i+2)});i++;}
 }return result.sort((a,b)=>a.start-b.start);
}
function languageSection(text,language){
 const name=RECORDING_LANGUAGES[language]?.name;if(!name)return '';
 const headers=[...text.matchAll(/^==\s*([^=\n]+?)\s*==\s*$/gm)];const index=headers.findIndex(h=>h[1].trim()===name);
 return index<0?'':text.slice(headers[index].index+headers[index][0].length,headers[index+1]?.index??text.length);
}
function fileName(value){const file=plainText(value).replace(/^(?:File|Image):/i,'').trim();return /\.(ogg|oga|wav|mp3|flac)$/i.test(file)&&!/[{}\[\]\n\r|]/.test(file)?file:null;}
function englishLocale(file,label){
 const text=plainText(label).replace(/[<>]/g,' ');
 const uk=/(?:^|\b)(?:UK|United Kingdom|British|Britain|England|Received[ -]Pronunciation|RP)(?:\b|$)/i.test(text)||/(?:^|[-_ ])en[-_](?:uk|gb)(?:[-_ .])/i.test(file);
 const us=/(?:^|\b)(?:US|USA|United States|General[ -]American|GenAm|GA|American English)(?:\b|$)/i.test(text)||/(?:^|[-_ ])en[-_]us(?:[-_ .])/i.test(file);
 return uk!==us?(uk?'en-GB':'en-US'):null;
}
function regionalCandidate(language,label){
 const foreign={fr:/\b(?:Canada|Quebec|Québec|Belgium|Belgique|Switzerland|Suisse|Louisiana|Haiti|Haitian|Senegal|Luxembourg)\b/i,de:/\b(?:Austria|Austrian|Österreich|Switzerland|Swiss|Schweiz|Liechtenstein)\b/i,it:/\b(?:Switzerland|Swiss|Svizzera|Ticino)\b/i,ko:/\b(?:North Korea|Pyongyang)\b/i};
 return !foreign[language]?.test(label);
}
/** Parse only the requested language's section; template language must match too. */
export function parseWiktionaryAudio(wikitext,word){
 const language=word.language,section=languageSection(String(wikitext||''),language),result=[];
 const add=(value,label='')=>{const file=fileName(value);if(!file||!regionalCandidate(language,plainText(label)))return;const locale=language==='en'?englishLocale(file,label):RECORDING_LANGUAGES[language]?.locale;if(!locale||result.some(x=>x.file===file&&x.locale===locale))return;result.push({file,locale,word:word.word,language,accentEvidence:plainText(label),regionVerified:language==='en'||/\b(?:France|Paris|Germany|Berlin|Italy|Italian standard|Japan|Tokyo|Seoul|South Korea)\b/i.test(plainText(label))});};
 for(const t of templates(section)){
  const name=t.parts[0].toLowerCase(),named={},pos=[];
  for(const part of t.parts.slice(1)){const i=part.indexOf('=');if(i>0)named[part.slice(0,i).trim()]=part.slice(i+1).trim();else pos.push(part);}
  const lineStart=section.lastIndexOf('\n',t.start)+1,lineEnd=section.indexOf('\n',t.end);
  const line=section.slice(lineStart,lineEnd<0?section.length:lineEnd);
  if(['audio','audio-ipa'].includes(name)&&pos[0]===language){
   // A same-line IPA/accent template is explicit evidence; unrelated earlier labels are not inherited.
   const labels=[named.a,named.accent,pos[2],...templates(line).filter(x=>['ipa','a','accent'].includes(x.parts[0].toLowerCase())).flatMap(x=>x.parts.filter(p=>/^a=/.test(p)).map(p=>p.slice(2)))].filter(Boolean).join(' ');
   add(pos[1],labels);
  }
  if(language==='ja'&&['ja-pron','ja-ipa'].includes(name))for(const [key,value] of Object.entries(named))if(/^audio\d*$/.test(key))add(value,named.acc_loc||named.a||'');
  if(language==='ko'&&name==='ko-ipa')for(const [key,value] of Object.entries(named))if(/^(?:a|audio)\d*$/.test(key))add(value);
  if(name===language+'-pr'||name===language+'-pron')for(const match of t.raw.matchAll(/<audio:([^<>;]+)(?:;([^<>]*))?>/g))add(match[1],match[2]||'');
 }
 return result.sort((a,b)=>Number(b.regionVerified)-Number(a.regionVerified));
}
function allowedLicense(meta){
 const name=plainText(meta.LicenseShortName?.value),raw=String(meta.LicenseUrl?.value||''),licenseUrl=raw.replace(/^http:/,'https:');
 let cc=false;try{const u=new URL(licenseUrl);cc=['creativecommons.org','www.creativecommons.org'].includes(u.hostname)&&(/^\/licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0)(?:\/|$)/.test(u.pathname)||/^\/publicdomain\/(zero|mark)\/1\.0(?:\/|$)/.test(u.pathname));}catch{}
 const publicDomain=/^(?:CC0|Public domain|PD[- ]|Public Domain)/i.test(name)&&String(meta.Copyrighted?.value).toLowerCase()==='false';
 if(!cc&&!publicDomain)return null;
 const attribution=plainText(meta.Artist?.value);if(!attribution&&String(meta.AttributionRequired?.value).toLowerCase()==='true')return null;
 return {license:name||'Public domain',licenseUrl:licenseUrl||null,attribution:attribution||'Public domain; creator not specified'};
}
export function recordingFromImageInfo(candidate,page){
 const info=page?.imageinfo?.[0];if(!info||!isTrustedAudioURL(info.url)||!(/^(audio\/|application\/ogg$)/i.test(info.mime||'')))return null;
 const license=allowedLicense(info.extmetadata||{});if(!license)return null;
 let source;try{source=new URL(info.descriptionurl);if(source.protocol!=='https:'||source.hostname!=='commons.wikimedia.org')return null;}catch{return null;}
 return {src:info.url,sourceUrl:source.href,...license,locale:candidate.locale,word:candidate.word,language:candidate.language,file:page.title?.replace(/^File:/,''),mime:info.mime,bytes:info.size,sha1:info.sha1,duration:info.duration,accentEvidence:candidate.accentEvidence||'',regionVerified:!!candidate.regionVerified,retrievedAt:new Date().toISOString()};
}
async function queryAPI(base,params,{signal,fetchImpl=globalThis.fetch}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Cancelled','AbortError');
 const url=new URL(base);url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',maxlag:'5',...params});
 let response;const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
 try{response=await fetchImpl(url.href,{signal:requestSignal,credentials:'omit',headers:{Accept:'application/json'}});}catch(error){if(signal?.aborted)throw signal.reason||new DOMException('Cancelled','AbortError');throw new RecordingSourceError(error.name==='TimeoutError'?'词典录音查询超时，请稍后重试':'词典录音服务暂时无法连接，请检查网络');}
 if(!response.ok)throw new RecordingSourceError(response.status===429?'词典录音服务请求过多，请稍后重试':`词典录音服务暂时不可用 (${response.status})`,{status:response.status,code:'http',retryAfter:response.headers.get('Retry-After')});
 let data;try{data=await response.json();}catch{if(signal?.aborted)throw signal.reason||new DOMException('Cancelled','AbortError');if(requestSignal.aborted)throw new RecordingSourceError('词典录音查询超时，请稍后重试',{code:'timeout'});throw new RecordingSourceError('词典录音服务返回无效数据',{code:'invalid_response'});}
 if(data.error)throw new RecordingSourceError('词典录音服务暂时不可用：'+(data.error.info||data.error.code),{status:data.error.code==='ratelimited'?429:0,code:data.error.code});
 return data;
}
function wordVariants(word){
 const text=String(word?.word||'').normalize('NFC').trim().replace(/\s+/g,' '),language=word?.language;
 if(!RECORDING_LANGUAGES[language]||!text||text.length>200||/[|\u0000-\u001f]/.test(text))return {text,language,variants:[]};
 const variants=[...new Set([text,...(['en','fr','it','de'].includes(language)?[text.toLocaleLowerCase()]:[]),...(language==='de'?[text[0].toLocaleUpperCase()+text.slice(1).toLocaleLowerCase()]:[])])];
 return {text,language,variants};
}
function candidatesFromPages(word,pages){
 const {text,language,variants}=wordVariants(word);
 const sameSpelling=page=>recordingKey({word:page.title,language})===recordingKey({word:text,language});
 // Case variants share the application's cache identity; unrelated redirect targets never do.
 for(const variant of variants){for(const page of pages.filter(p=>p.title===variant&&!p.missing&&sameSpelling(p))){const candidates=parseWiktionaryAudio(page.revisions?.[0]?.slots?.main?.content||'',{word:text,language});if(candidates.length)return candidates;}}
 return pages.filter(page=>!page.missing&&sameSpelling(page)).flatMap(page=>parseWiktionaryAudio(page.revisions?.[0]?.slots?.main?.content||'',{word:text,language}));
}
async function queryCandidates(words,options){
 const titles=[...new Set(words.flatMap(word=>wordVariants(word).variants))];if(!titles.length)return words.map(()=>[]);
 if(titles.length>50)throw new RecordingSourceError('批量查询最多包含 50 个词形',{code:'batch_too_large'});
 const data=await queryAPI('https://en.wiktionary.org/w/api.php',{prop:'revisions',rvprop:'content',rvslots:'main',titles:titles.join('|'),redirects:'1'},options);
 const pages=data.query?.pages;if(!Array.isArray(pages))throw new RecordingSourceError('词典录音服务返回无效词条',{code:'invalid_response'});
 return words.map(word=>candidatesFromPages(word,pages));
}
export async function lookupRecordingCandidates(word,options={}){return (await queryCandidates([word],options))[0];}
/** {} means a successful dictionary lookup with no licensed matching recording. Network errors reject. */
export async function lookupRemoteRecordings(word,options={}){
 return (await lookupRemoteRecordingsBatch([word],options))[0];
}
/** Build-time helper; batches dictionary titles and small groups of Commons metadata. */
export async function lookupRemoteRecordingsBatch(words,options={}){
 const candidates=await queryCandidates(words,options),selected=candidates.map(list=>{const counts={};return list.filter(c=>(counts[c.locale]=(counts[c.locale]||0)+1)<=3);});
 const titles=[...new Set(selected.flat().map(c=>'File:'+c.file))],pages=new Map(),aliases=new Map();
 for(let offset=0;offset<titles.length;offset+=20){
  const data=await queryAPI('https://commons.wikimedia.org/w/api.php',{prop:'imageinfo',iiprop:'url|size|sha1|mime|extmetadata',iiextmetadatafilter:'Artist|LicenseShortName|LicenseUrl|AttributionRequired|Copyrighted',titles:titles.slice(offset,offset+20).join('|'),redirects:'1'},options);
  if(!Array.isArray(data.query?.pages))throw new RecordingSourceError('词典录音服务返回无效文件信息',{code:'invalid_response'});
  for(const page of data.query.pages)pages.set(page.title,page);for(const alias of [...(data.query.normalized||[]),...(data.query.redirects||[])])aliases.set(alias.from,alias.to);
 }
 return selected.map(list=>{const result={};for(const candidate of list){let title='File:'+candidate.file;for(let i=0;i<5&&aliases.has(title);i++)title=aliases.get(title);const audio=recordingFromImageInfo(candidate,pages.get(title));if(audio&&!result[audio.locale])result[audio.locale]=audio;}return result;});
}
