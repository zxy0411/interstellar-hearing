import {bi,getUILanguage,setUILanguage,onLanguageChange} from './i18n.mjs';

export const ONBOARDING_VERSION=1;
const PREFIX='interstellar-onboarding-v'+ONBOARDING_VERSION+':';
const approvedId=user=>user?.status==='approved'&&typeof user.id==='string'&&user.id.length>0&&user.id.length<=160?user.id:null;
export function onboardingStorageKey(user){const id=approvedId(user);return id?PREFIX+encodeURIComponent(id):null;}

// Progress belongs to this browser and account. Blocked storage still remembers
// a choice for the current page, without touching learning data or credentials.
export function createOnboardingProgress(storage){
 const memory=new Map();
 function read(user){
  const key=onboardingStorageKey(user);if(!key)return null;
  if(memory.has(key))return memory.get(key);
  try{const data=JSON.parse(storage?.getItem(key)||'null');if(data?.version===ONBOARDING_VERSION&&['completed','skipped'].includes(data.outcome))return data;}catch{}
  return null;
 }
 function record(user,outcome){
  const key=onboardingStorageKey(user);if(!key||!['completed','skipped'].includes(outcome))return false;
  const data={version:ONBOARDING_VERSION,outcome,at:Date.now()};memory.set(key,data);
  try{storage?.setItem(key,JSON.stringify(data));}catch{}
  return true;
 }
 return {read,record,shouldOffer:user=>!!approvedId(user)&&!read(user)};
}

const symbols={
 orbit:'<circle cx="12" cy="12" r="5.5"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-35 12 12)"/><circle cx="20" cy="6" r="1"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
 book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15"/>',
 play:'<path d="m9 5 10 7-10 7Z"/>',
 speaker:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 folder:'<path d="M3 7V5h6l2 2h10v13H3Z"/>',
 history:'<path d="M3 10a9 9 0 1 1 0 5M3 3v7h7M12 7v6l3 2"/>',
 leaf:'<path d="M20 3C6 2 1 10 6 17c7 5 15 0 14-14ZM4 21l12-13"/>',
 cloud:'<path d="M6 16a5 5 0 1 1 1-10 7 7 0 0 1 13 4 3 3 0 0 1-1 6M8 19v2m5-2v2m5-2v2"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 star:'<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${symbols[name]||symbols.star}</svg>`;
const steps=()=>[
 {key:'library',eyebrow:bi('你的第一片词海','YOUR FIRST WORD COLLECTION'),title:bi('先选语言，再选词库','Choose a language, then a library'),body:bi('在顶部选择学习语言，再从左侧词库开始。英语、韩语、日语、德语、意大利语和法语，都有各自的学习空间。','Choose your learning language at the top, then a library on the left. English, Korean, Japanese, German, Italian and French each have their own study space.'),notes:[bi('「中 / EN」只切换界面语言，不会更改正在学习的语言。','“中 / EN” changes the interface language, not the language you are learning.'),bi('内置语料库可以直接学习；自己的词表可在下方「输入单词列表」导入。','Start with a built-in library, or import your own list under Add words.')],visual:`<div class="onboarding-language-cloud"><span>English</span><span>日本語</span><span>Français</span></div><div class="onboarding-demo-library">${icon('book')}<div><strong>流星雨语料库</strong><small>${bi('从熟悉的词，慢慢出发','Start with words you know')}</small></div><i>${icon('arrow')}</i></div>`},
 {key:'listen',eyebrow:bi('看见单词，听见回响','SEE THE WORD, HEAR IT CLEARLY'),title:bi('让每个单词慢慢亮起来','Let each word come into focus'),body:bi('点击播放键开始听读，单词会柔和地渐隐切换。用播放控制调整速度、重复次数与间隔，也可以打开沉浸模式或全屏。','Press Play to listen as words softly fade between each other. Adjust speed, repetitions and the pause between words in Playback controls, or enter immersive or fullscreen mode.'),notes:[bi('首次使用，先点一下单词旁的小喇叭，允许浏览器播放声音。','On your first visit, click the speaker beside a word to allow sound playback.'),bi('录音未就绪时会等待；来源不可用时停在当前词，不会悄悄跳过。','The player waits for audio. If no source is available, it stays on the current word.')],visual:`<div class="onboarding-demo-word"><small>ENGLISH</small><strong>starlight</strong><span>/ˈstɑː.laɪt/ ${icon('speaker')}</span><i class="onboarding-demo-play">${icon('play')}</i></div>`},
 {key:'spell',eyebrow:bi('把记住的声音，写下来','TURN THE SOUND INTO SPELLING'),title:bi('听一遍，再试着拼出来','Listen, then try spelling it'),body:bi('切换到「星际盲拼」，每条短横线对应原词的一个字符。输入完成后点「检查」；输入过程中不会抢先判错。','Switch to 星际盲拼. Each short line represents one character in the word. Finish typing, then choose Check; you are not marked wrong while typing.'),notes:[bi('蓝绿渐变表示正确，橙红渐变指出需要修改的位置。','Blue-green means correct; orange-red marks positions to correct.'),bi('错词记录会保留，之后可以复习；测验模式记录每题的首次回答。','Mistakes are kept for later review. Test mode scores your first answer to each question.')],visual:`<div class="onboarding-demo-spelling"><div class="onboarding-demo-slots"><span>s</span><span>t</span><span>a</span><span>r</span></div><div class="onboarding-demo-grades"><span>${icon('check')}${bi('拼写正确','Correct')}</span><span>${bi('再试一次','Try again')}</span></div></div>`},
 {key:'folders',eyebrow:bi('你的文件，仍由你掌握','YOUR FILES STAY YOURS'),title:bi('连接自己的单词文件夹','Connect your own word folder'),body:bi('在保存设置或个人空间连接本机文件夹，学习内容从你选择的文件读取。词库放进自建文件夹后，可连续播放其中的单词。','Connect a local folder in Save settings or your profile. Study content is read from your files. Group libraries into a custom folder to play through them in sequence.'),notes:[bi('账号分别记住学习空间；换设备或浏览器后，需要重新连接本机文件夹。','Accounts keep separate study spaces. On another device or browser, reconnect the local folder.'),bi('建议定期导出完整备份。清理浏览器数据、目录权限失效时，可用备份恢复。','Export a full backup regularly. Use it to restore your work if browser data is cleared or folder permission is lost.')],visual:`<div class="onboarding-demo-folder">${icon('folder')}<div><strong>${bi('我的词库','My libraries')}</strong><span>TXT · CSV · JSON</span></div></div><div class="onboarding-demo-files"><span>${bi('文件夹里的单词','Words from your folder')}</span><i>↗</i><span>${bi('学习记录与备份','Progress & backups')}</span></div>`},
 {key:'journey',eyebrow:bi('让学习有自己的节奏','A SMALL RITUAL, AT YOUR PACE'),title:bi('把旅程留在这片星海','Keep a little record of your journey'),body:bi('「播放历史」可以接着上次的单词学习。「每日星旅」里能打卡、收集星球，也能重看今日开场；开场与主页皮肤是独立的。','Listening history lets you resume where you left off. Daily voyage offers check-ins, collectible planets and a replay of today’s opening. The opening and homepage scenery are separate.'),notes:[bi('「换个风景 → 风景微调」可分别调整木马、枝叶、雨雪等动效。','In Scenery → Fine-tune scenery, adjust the carousel, leaves, rain, snow and other effects separately.'),bi('速度、密度和磨砂透明度都可以按自己的喜好慢慢调。','Set the motion speed, particle density and glass transparency to suit you.')],visual:`<div class="onboarding-demo-orbits"><div>${icon('history')}<span>${bi('继续学习','Resume')}</span></div><div>${icon('orbit')}<span>${bi('每日星旅','Daily voyage')}</span></div><div>${icon('leaf')}<span>${bi('换个风景','Scenery')}</span></div></div>`},
 {key:'comfort',eyebrow:bi('一点小提醒，安心开始','A FEW NOTES BEFORE YOU BEGIN'),title:bi('慢一点也没关系','It is okay to take your time'),body:bi('平台还在继续打磨，有时声音或画面需要多一点时间。跟着自己的节奏来，遇到不顺畅时可以这样调整。','The platform is still being refined, so audio or visuals may occasionally need a little time. Go at your own pace; these small adjustments can help.'),notes:[],visual:`<div class="onboarding-comfort-list"><div>${icon('speaker')}<p><strong>${bi('读音偶尔需要等一下','Audio may take a moment')}</strong><span>${bi('新读音首次需要联网，免费服务有时较慢或不可用。没有声音时，先点小喇叭，并尝试独立浏览器窗口。','New audio needs a connection. The free service can be slow or unavailable. If silent, click the speaker and try a separate browser window.')}</span></p></div><div>${icon('cloud')}<p><strong>${bi('画面卡顿，可以让风景安静一点','If visuals stutter, simplify the scenery')}</strong><span>${bi('降低雨雪密度，或关闭动态效果；单词和学习功能仍可继续使用。','Lower rain or snow density, or turn off background animation. Your word-learning controls remain available.')}</span></p></div><div>${icon('folder')}<p><strong>${bi('现在的账号与文件仍在本机','Accounts and files are currently local')}</strong><span>${bi('当前版本通过本机启动器使用账号；登录不会把磁盘文件自动同步到其他设备。记得保留完整备份。','Use the local launcher for accounts in this version. Signing in does not sync disk files to another device. Keep a full backup.')}</span></p></div></div>`}
];

export function createOnboarding({button,onBeforeOpen=async()=>{},onClose=()=>{}}={}){
 let storage;try{storage=globalThis.localStorage;}catch{}
 const progress=createOnboardingProgress(storage);
 let user=null,opened=false,opening=null,destroyed=false,epoch=0,step=-1,previousFocus=null,previousOverflow='',closing=false;
 const dialog=document.createElement('dialog');dialog.className='onboarding-dialog';dialog.setAttribute('aria-labelledby','onboarding-title');dialog.setAttribute('aria-describedby','onboarding-description');document.body.append(dialog);
 const validUser=()=>approvedId(user);
 function refreshButton(){if(!button)return;button.classList.add('onboarding-trigger');button.setAttribute('type','button');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',bi('新手指南','Getting started'));button.title=bi('新手指南 · 随时重看','Getting started · Replay anytime');button.innerHTML=icon('compass')+`<span>${bi('新手指南','Guide')}</span>`;}
 function render(focus=true){
  const items=steps(),welcome=step<0,last=step===items.length-1,item=items[step];
  dialog.dataset.step=welcome?'welcome':item.key;
  dialog.innerHTML=`<div class="onboarding-head"><span class="onboarding-kicker">${icon('compass')}${bi('星际入门指南','GETTING STARTED')}</span><div class="onboarding-head-actions"><button class="onboarding-language" type="button" aria-label="${bi('切换为英文','Switch to Chinese')}">${getUILanguage()==='en'?'中':'EN'}</button><button class="onboarding-close" type="button" aria-label="${bi('跳过教学，直接探索','Skip tutorial and explore')}">${icon('close')}</button></div></div><div class="onboarding-content" aria-live="polite">${welcome?`<div class="onboarding-welcome-sky" aria-hidden="true"><i></i><i></i><i></i>${icon('orbit')}<span>${icon('star')}</span></div><p class="onboarding-eyebrow">${bi('从一颗单词，开始你的旅程','YOUR JOURNEY BEGINS WITH ONE WORD')}</p><h2 id="onboarding-title" tabindex="-1">${bi('欢迎来到你的词海','Welcome to your word universe')}</h2><p class="onboarding-description" id="onboarding-description">${bi('用 6 个小步骤，认识听读、拼写和自己的学习空间。<br>你可以跟着看一遍，也可以直接开始探索。','Discover listening, spelling and your own study space in six small steps.<br>Take a quick tour, or start exploring on your own.')}</p><div class="onboarding-welcome-pills"><span>${icon('speaker')}${bi('听见','Listen')}</span><span>${icon('book')}${bi('记住','Remember')}</span><span>${icon('orbit')}${bi('探索','Explore')}</span></div>`:`<p class="onboarding-eyebrow">${item.eyebrow}</p><h2 id="onboarding-title" tabindex="-1">${item.title}</h2><p class="onboarding-description" id="onboarding-description">${item.body}</p><div class="onboarding-visual ${last?'onboarding-visual-notes':''}" ${last?'':'aria-hidden="true"'}>${item.visual}</div>${item.notes.length?`<ul class="onboarding-notes">${item.notes.map(note=>`<li>${note}</li>`).join('')}</ul>`:''}`}</div><div class="onboarding-progress" aria-label="${bi('教学进度','Tutorial progress')}">${welcome?`<span class="onboarding-revisit">${bi('随时可在右上角「新手指南」重看','Replay anytime from Guide in the top-right corner')}</span>`:`<span class="onboarding-step-count">${String(step+1).padStart(2,'0')} <i>/ ${String(items.length).padStart(2,'0')}</i></span><div class="onboarding-step-dots" aria-hidden="true">${items.map((_,index)=>`<span class="${index===step?'is-current':index<step?'is-visited':''}"></span>`).join('')}</div><button class="onboarding-skip" type="button">${bi('跳过教学','Skip tour')}</button>`}</div><div class="onboarding-foot">${welcome?`<button id="onboarding-skip" class="onboarding-secondary" type="button">${bi('跳过，直接探索','Skip and explore')}</button><button id="onboarding-start" class="onboarding-primary" type="button">${bi('开始教学','Start the tour')}${icon('arrow')}</button>`:`<button id="onboarding-back" class="onboarding-secondary" type="button">${bi('上一步','Back')}</button><button id="onboarding-next" class="onboarding-primary" type="button">${last?bi('开始我的学习','Start learning'):bi('下一步','Next')}${icon(last?'check':'arrow')}</button>`}</div>${last?`<p class="onboarding-kind-note">${bi('不必一次记住所有功能，我们会一直在这里。','You do not need to remember everything at once. This guide is always here.')}</p>`:''}`;
  dialog.querySelector('.onboarding-language').onclick=()=>setUILanguage(getUILanguage()==='en'?'zh':'en');
  dialog.querySelector('.onboarding-close').onclick=()=>close('skipped');
  dialog.querySelector('#onboarding-skip')?.addEventListener('click',()=>close('skipped'));
  dialog.querySelector('.onboarding-skip')?.addEventListener('click',()=>close('skipped'));
  dialog.querySelector('#onboarding-start')?.addEventListener('click',()=>{step=0;render();});
  dialog.querySelector('#onboarding-back')?.addEventListener('click',()=>{step=Math.max(-1,step-1);render();});
  dialog.querySelector('#onboarding-next')?.addEventListener('click',()=>{if(last)close('completed');else{step++;render();}});
  dialog.scrollTop=0;
  if(focus)(dialog.querySelector(welcome?'#onboarding-start':'#onboarding-title'))?.focus({preventScroll:true});
 }
 async function begin(automatic){
  if(destroyed)return false;if(opened)return true;if(opening)return opening;
  if(automatic&&!progress.shouldOffer(user))return false;
  const capturedId=validUser(),token=++epoch;
  const operation=(async()=>{
   const allowed=await onBeforeOpen();
   if(destroyed||epoch!==token||validUser()!==capturedId||allowed===false)return false;
   if(automatic&&!progress.shouldOffer(user))return false;
   previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;step=-1;render(false);
   dialog.showModal();opened=true;document.body.style.overflow='hidden';dialog.querySelector('#onboarding-start')?.focus({preventScroll:true});return true;
  })();opening=operation;
  try{return await operation;}finally{if(opening===operation)opening=null;}
 }
 function close(reason='skipped'){
  epoch++;opening=null;if(!opened||closing)return;closing=true;opened=false;
  const id=validUser();if(['completed','skipped'].includes(reason))progress.record(user,reason);
  if(dialog.open)dialog.close();document.body.style.overflow=previousOverflow;
  if(previousFocus?.isConnected)previousFocus.focus?.({preventScroll:true});previousFocus=null;closing=false;
  onClose({reason,userId:id});
 }
 function setUser(next){const previousId=validUser();user=next||null;if(previousId!==validUser())close('dismiss');}
 function handleKey(event){
  if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button:not(:disabled)')].filter(node=>node.getClientRects().length);
  const first=controls[0],last=controls.at(-1);if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close('skipped');});dialog.addEventListener('keydown',handleKey);
 dialog.addEventListener('close',()=>{if(opened)close('skipped');});
 const buttonClick=()=>begin(false).catch(()=>{});button?.addEventListener('click',buttonClick);refreshButton();
 const unsubscribe=onLanguageChange(()=>{refreshButton();if(opened){const current=document.activeElement,selector=current?.classList?.contains('onboarding-language')?'.onboarding-language':current?.id?'#'+current.id:'#onboarding-title';render(false);dialog.querySelector(selector)?.focus({preventScroll:true});}});
 return {setUser,offerIfNeeded:()=>begin(true),open:()=>begin(false),close,isOpen:()=>opened||!!opening,destroy(){destroyed=true;close('dismiss');unsubscribe();button?.removeEventListener('click',buttonClick);dialog.remove();}};
}
