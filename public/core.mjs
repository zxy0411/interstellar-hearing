import{normalizeJourney}from "./journey.mjs";
import{normalizeSceneryOptions}from './scenery-options.mjs';
export const LANGUAGES={en:{name:'英语',native:'English',locale:'en-GB',voice:'en-GB-SoniaNeural',sample:[['survival','n.','继续生存，存活，幸存','/sərˈvaɪvəl/'],['universe','n.','宇宙；天地万物','/ˈjuːnɪvɜːs/'],['serendipity','n.','不期而遇的美好；意外发现珍宝的运气','/ˌserənˈdɪpəti/'],['galaxy','n.','星系；银河','/ˈɡæləksi/'],['starlight','n.','星光','/ˈstɑːlaɪt/'],['explore','v.','探索；探究','/ɪkˈsplɔː/'],['hello','int.','你好','/həˈləʊ/'],['world','n.','世界','/wɜːld/'],['programming','n.','编程','/ˈprəʊɡræmɪŋ/'],['computer','n.','计算机','/kəmˈpjuːtə/'],['science','n.','科学','/ˈsaɪəns/'],['technology','n.','技术','/tekˈnɒlədʒi/'],['development','n.','发展；开发','/dɪˈveləpmənt/'],['application','n.','应用；申请','/ˌæplɪˈkeɪʃn/'],['interface','n.','界面；接口','/ˈɪntəfeɪs/'],['algorithm','n.','算法','/ˈælɡərɪðəm/']]},ko:{name:'韩语',native:'한국어',locale:'ko-KR',voice:'ko-KR-SunHiNeural',sample:[['안녕하세요','인사','你好','annyeonghaseyo'],['우주','명사','宇宙','uju'],['별빛','명사','星光','byeolbit'],['기억','명사','记忆','gieok']]},ja:{name:'日语',native:'日本語',locale:'ja-JP',voice:'ja-JP-NanamiNeural',sample:[['こんにちは','挨拶','你好','konnichiwa'],['宇宙','名詞','宇宙','うちゅう'],['星空','名詞','星空','ほしぞら'],['記憶','名詞','记忆','きおく']]},de:{name:'德语',native:'Deutsch',locale:'de-DE',voice:'de-DE-KatjaNeural',sample:[['Sternenhimmel','m.','星空','/ˈʃtɛʁnənˌhɪml̩/'],['Erinnerung','f.','记忆；回忆','/ɛɐ̯ˈʔɪnəʁʊŋ/'],['Universum','n.','宇宙','/uniˈvɛʁzʊm/'],['entdecken','v.','发现；探索','/ɛntˈdɛkn̩/']]},it:{name:'意大利语',native:'Italiano',locale:'it-IT',voice:'it-IT-ElsaNeural',sample:[['universo','s.m.','宇宙','/uniˈvɛrso/'],['stella','s.f.','星星','/ˈstɛlla/'],['ricordo','s.m.','记忆；回忆','/riˈkɔrdo/'],['meraviglia','s.f.','奇迹；惊喜','/meraˈviʎʎa/']]}};
LANGUAGES.fr={name:'法语',native:'Français',locale:'fr-FR',voice:'fr-FR-DeniseNeural',sample:[['bonjour','interj.','你好','/bɔ̃.ʒuʁ/'],['étoile','n.f.','星星','/e.twal/'],['univers','n.m.','宇宙','/y.ni.vɛʁ/'],['mémoire','n.f.','记忆','/me.mwaʁ/'],['rêver','v.','梦想；做梦','/ʁɛ.ve/']]};
export const BUILTINS=['高频答案词','基础答案词','进阶答案词','词组答案词','专项答案词'];
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export function normalizeWord(value,language='en') {if(typeof value==='string')value={word:value};if(!value||typeof value.word!=='string'||!value.word.trim())return null;return {word:value.word.trim().normalize('NFC').slice(0,200),pos:String(value.pos||value.partOfSpeech||'').slice(0,80),meaning:String(value.meaning||value.translation||'').slice(0,2000),phonetic:String(value.phonetic||'').slice(0,300),definition:String(value.definition||'').slice(0,2000),language:LANGUAGES[value.language]?value.language:language,audio:value.audio&&typeof value.audio==='object'?value.audio:{},errorCount:Math.max(0,Number(value.errorCount)||0),testTotal:Math.max(0,Number(value.testTotal)||0),testCorrect:Math.max(0,Math.min(Number(value.testTotal)||0,Number(value.testCorrect)||0))};}
export function samples(language='en'){return LANGUAGES[language].sample.map(([word,pos,meaning,phonetic])=>normalizeWord({word,pos,meaning,phonetic},language));}
export function comparison(text,language='en'){return String(text).normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase(LANGUAGES[language]?.locale||'en');}
export function uniqueWords(words){const seen=new Set();return words.filter(w=>{if(!w)return false;const key=w.language+':'+comparison(w.word,w.language);if(seen.has(key))return false;seen.add(key);return true;});}
export function parseCSV(text){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value.trim());value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value='';}else value+=c;}if(quoted)throw new Error('引号没有闭合，请检查文件格式');row.push(value.trim());if(row.some(Boolean))rows.push(row);return rows;}
export function parseWords(text,language='en'){const trimmed=text.replace(/^\uFEFF/,'').trim();if(!trimmed)return [];let items;if(trimmed.startsWith('[')||trimmed.startsWith('{')){const json=JSON.parse(trimmed);items=Array.isArray(json)?json:json.words;if(!Array.isArray(items))throw new Error('请导入单词数组或含 words 的词库文件');}else{items=parseCSV(trimmed).filter(r=>!r[0].startsWith('#')).filter((r,i)=>!(i===0&&['word','单词'].includes(r[0].toLowerCase()))).map(([word,pos,meaning,phonetic])=>({word,pos,meaning,phonetic}));}const words=uniqueWords(items.map(w=>normalizeWord(w,language)));if(words.length>600)throw new Error(`共 ${words.length} 个单词，单次最多 600 个，请分批导入（没有截断或丢弃内容）`);return words;}
export function toCSV(words){const quote=s=>'"'+String(s||'').replaceAll('"','""')+'"';return '\uFEFF'+words.map(w=>[w.word,w.pos,w.meaning,w.phonetic].map(quote).join(',')).join('\r\n');}
export function shuffled(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function initialState(){return {version:1,journey:{days:[],lastIntroDay:""},libraries:[{id:'temp-en',name:'临时词库',language:'en',folderId:null,words:[samples('en')[0]],builtin:false}],folders:[],history:[],activeLibrary:'temp-en',settings:{language:'en',uiLanguage:'zh',skin:'star',scenery:normalizeSceneryOptions(),accent:'uk',speed:1,repeat:1,interval:1.5,showMeaning:true,autoFolder:true,motion:true,loop:false,shuffle:false,voice:'recorded',freeFallback:true,voiceByLocale:{},speechEndpoint:''},positions:{}};}
export function sanitizeState(input){const fallback=initialState();if(!input||!Array.isArray(input.libraries))throw new Error('这不是有效的星际词库备份');const ids=new Set();const libraries=input.libraries.map(l=>{if(!l||typeof l.name!=='string'||!Array.isArray(l.words))throw new Error('词库结构无效');let id=typeof l.id==='string'&&!ids.has(l.id)?l.id:uid();ids.add(id);const language=LANGUAGES[l.language]?l.language:'en';return {id,name:l.name.slice(0,80),language,folderId:typeof l.folderId==='string'?l.folderId:null,builtin:BUILTINS.includes(l.name)&&l.builtin===true,words:uniqueWords(l.words.map(w=>normalizeWord(w,language)))};});const folders=(Array.isArray(input.folders)?input.folders:[]).filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string').map(f=>({id:f.id,name:f.name.slice(0,80)}));const settings={...fallback.settings,...input.settings};settings.uiLanguage=settings.uiLanguage==='en'?'en':'zh';settings.skin=['star','carousel','cathedral','sakura','forest'].includes(settings.skin)?settings.skin:'star';settings.scenery=normalizeSceneryOptions(settings.scenery);settings.freeFallback=settings.freeFallback!==false;settings.language=LANGUAGES[settings.language]?settings.language:'en';settings.accent=['uk','us','both'].includes(settings.accent)?settings.accent:'uk';settings.speed=Math.max(.5,Math.min(3,Number(settings.speed)||1));settings.repeat=Math.max(1,Math.min(10,Number(settings.repeat)||1));settings.interval=Math.max(.1,Math.min(10,Number(settings.interval)||1.5));return {...fallback,journey:normalizeJourney(input.journey),modifiedAt:Math.max(0,Number(input.modifiedAt)||0),libraries:libraries.length?libraries:fallback.libraries,folders,settings,history:(Array.isArray(input.history)?input.history:[]).filter(h=>h&&typeof h.word==='string'&&typeof h.libraryId==='string'&&Number.isFinite(h.at)).slice(0,200),activeLibrary:ids.has(input.activeLibrary)?input.activeLibrary:(libraries[0]?.id||'temp-en'),positions:input.positions&&typeof input.positions==='object'?input.positions:{}};}
export function buildQueue(libraries,ids){return ids.flatMap(id=>{const lib=libraries.find(l=>l.id===id);return lib?lib.words.map((w,index)=>({libraryId:id,index})):[];});}

// The old site stores { libraryName: { words: [...] } }, without library IDs.
// Passing savedState means the new format already exists and always wins.
export function migrateLegacyState(legacy, savedState = null, dictionaryResults = []) {
 const state = savedState ? structuredClone(savedState) : initialState();
 const usedIds = new Set(state.libraries.map(library => library.id));
 const availableId = preferred => {
  let id = preferred, suffix = 1;
  while (usedIds.has(id)) id = preferred + '-' + suffix++;
  usedIds.add(id);return id;
 };
 for (const result of dictionaryResults) {
  if (!BUILTINS.includes(result?.name) || !Array.isArray(result.words)) continue;
  if (state.libraries.some(library => library.builtin && library.language === 'en' && library.name === result.name)) continue;
  state.libraries.push({id:availableId('builtin-' + BUILTINS.indexOf(result.name)),name:result.name,language:'en',folderId:null,builtin:true,words:uniqueWords(result.words.map(word => normalizeWord(word, 'en')))});
 }
 if (savedState) return {state, migrated:false};
 let source;
 try { source = typeof legacy === 'string' ? JSON.parse(legacy) : legacy; } catch { return {state, migrated:false}; }
 if (!source || typeof source !== 'object' || Array.isArray(source)) return {state, migrated:false};
 const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
 const key = word => word.language + ':' + comparison(word.word, word.language);
 const records = words => {
  const byWord = new Map();
  for (const value of words) {
   const word = normalizeWord(value, 'en');if (!word) continue;
   word.errorCount = count(word.errorCount);word.testTotal = count(word.testTotal);word.testCorrect = Math.min(word.testTotal, count(word.testCorrect));
   const previous = byWord.get(key(word));
   if (!previous) byWord.set(key(word), word);
   else for (const field of ['errorCount','testTotal','testCorrect']) previous[field] = Math.max(previous[field], word[field]);
  }
  return [...byWord.values()];
 };
 let migrated = false, customIndex = 0;
 for (const [originalName, value] of Object.entries(source)) {
  if (!value || !Array.isArray(value.words) || !originalName.trim()) continue;
  const words = records(value.words), name = originalName.trim().slice(0, 80);
  const builtin = BUILTINS.includes(name);
  let target = state.libraries.find(library => library.name === name && library.language === 'en' && library.builtin === builtin);
  if (!target) {
   target = {id:availableId(builtin ? 'builtin-' + BUILTINS.indexOf(name) : 'legacy-' + customIndex++),name,language:'en',folderId:null,builtin,words:[]};
   state.libraries.push(target);
  }
  if (!builtin) {
   // Replace the seeded survival sample, keeping the one canonical temp ID.
   target.words = words;
  } else {
   const current = new Map(target.words.map(word => [key(word), word]));
   for (const oldWord of words) {
    const match = current.get(key(oldWord));
    if (match) {
     for (const field of ['errorCount','testTotal','testCorrect']) match[field] = Math.max(count(match[field]), oldWord[field]);
    } else {
     // Keep records for entries removed from a newer dictionary, or when offline.
     target.words.push(oldWord);current.set(key(oldWord), oldWord);
    }
   }
  }
  migrated = true;
 }
 return {state, migrated};
}

