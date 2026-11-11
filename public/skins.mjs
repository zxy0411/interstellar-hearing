import {bi, onLanguageChange} from './i18n.mjs';
import {SCENERY_DEFAULTS, normalizeSceneryOptions, sceneryControls} from './scenery-options.mjs';
import {weatherParticleCount, createWeatherParticles, advanceWeatherParticles, createWeatherPainter} from './weather.mjs';

export const SKINS = Object.freeze([
  Object.freeze({id:'star', zh:'星际漫游', en:'Stellar drift', captionZh:'星光缓缓呼吸，流星掠过夜空', captionEn:'Quiet stars and passing meteors', image:'', video:'', weather:'stars'}),
  Object.freeze({id:'carousel', zh:'雪夜旋木', en:'Winter carousel', captionZh:'金色木马与灯火，细雪落入长夜', captionEn:'Golden horses and lights in the falling snow', image:'assets/skins/carousel.webp', video:'', videoRate:.1, weather:'snow'}),
  Object.freeze({id:'cathedral', zh:'沃蒂夫雪夜', en:'Votive snow', captionZh:'雪花穿过暮色，圣堂灯火温柔', captionEn:'Soft snow and the warm lights of Votive Church', image:'assets/skins/cathedral.webp', video:'', weather:'snow'}),
  Object.freeze({id:'sakura', zh:'樱花月溪', en:'Moonlit sakura', captionZh:'花瓣轻轻翻转，月光随溪水流动', captionEn:'Drifting petals and moonlight along the stream', image:'assets/skins/sakura.webp', video:'', weather:'petals'}),
  Object.freeze({id:'forest', zh:'雨林夜雨', en:'Rainforest rain', captionZh:'细雨落进森林，枝叶随风轻摇', captionEn:'Fine rain through gently swaying forest leaves', image:'assets/skins/forest.webp', video:'', videoRate:.2, weather:'rain'})
]);
export function normalizeSkin(value) { return SKINS.some(skin => skin.id === value) ? value : 'star'; }
export function canAnimateSkin({skin, motion = true, hidden = false, reduced = false}) { return normalizeSkin(skin) !== 'star' && motion !== false && !hidden && !reduced; }

export function createSkinParticles(skin, width, height, random = Math.random, density) {
  const kind = SKINS.find(item => item.id === normalizeSkin(skin)).weather;
  if (kind === 'stars') return [];
  if (kind === 'snow' || kind === 'rain') return createWeatherParticles(kind, width, height, random, density ?? SCENERY_DEFAULTS[kind+'Density']);
  const caps = {snow:72, rain:80, petals:38, fireflies:28};
  const count = Math.min(caps[kind], Math.max(10, Math.round(width * height / (kind === 'rain' ? 15000 : kind === 'snow' ? 19000 : 41000))));
  return Array.from({length:count}, (_, index) => {
    const depth = .2 + random() * .8;
    return {kind, x:random() * width, y:random() * height, depth, phase:random() * Math.PI * 2, spin:random() * Math.PI * 2, size:kind === 'petals' ? 3 + depth * 7 : kind === 'snow' ? .5 + depth * 1.6 : .5 + depth, speed:(kind === 'rain' ? 155 : kind === 'petals' ? 13 : kind === 'snow' ? 11 : 1.5) * (.6 + depth), index};
  }).sort((a,b) => a.depth - b.depth);
}
export function advanceSkinParticles(particles, seconds, width, height, elapsed) {
  if (particles[0]?.kind === 'snow' || particles[0]?.kind === 'rain') return advanceWeatherParticles(particles, seconds, width, height, elapsed);
  const delta = Math.min(.06, Math.max(0, Number(seconds) || 0));
  for (const point of particles) {
    const sway = Math.sin(elapsed * .35 + point.phase);
    point.y += point.speed * delta;
    point.x += (point.kind === 'rain' ? -point.speed * .12 : point.kind === 'fireflies' ? sway * 2 : 3 + sway * (point.kind === 'petals' ? 9 : 3)) * delta;
    if (point.y > height + 24) point.y = -24;
    if (point.x > width + 25) point.x = -25;
    if (point.x < -25) point.x = width + 25;
  }
  return particles;
}

// A bounded clock shared by all weather layers. Pausing clears the pending RAF,
// and resuming starts with a fresh timestamp, so background tabs never catch up.
export function createSkinClock({requestFrame, cancelFrame, active, draw}) {
  let frame = 0, last = null, elapsed = 0, destroyed = false;
  function tick(now) {
    frame = 0;
    if (destroyed || !active()) { last = null; return; }
    if (last !== null) {
      const delta = Math.min(.06, Math.max(0, (now - last) / 1000));
      elapsed += delta; draw(delta, elapsed);
    }
    last = now;
    frame = requestFrame(tick);
  }
  function stop() { if (frame) cancelFrame(frame); frame = 0; last = null; }
  function refresh() { if (destroyed || !active()) stop(); else if (!frame) frame = requestFrame(tick); }
  function destroy() { destroyed = true; stop(); }
  return {refresh, stop, destroy};
}

// These locally prepared clips contain real interpolated slow-motion frames and
// a blended loop seam. Default 10% / 20% therefore decodes at native 1x.
export function skinVideoRate(skin, percent) {
  const bakedRate = SKINS.find(item => item.id === skin)?.videoRate || 1;
  const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : bakedRate * 100;
  return value / 100 / bakedRate;
}

// One media element is reused. Inactive scenes never preload videos; previous
// sources are explicitly detached so their downloads and decoders are released.
export function createSkinVideo({element, active, onState = () => {}}) {
  let desired = '', loaded = '', rate = 1, epoch = 0, pending = false, failed = false, destroyed = false;
  element.muted = true; element.defaultMuted = true; element.loop = true; element.playsInline = true; element.preload = 'metadata';
  function release() {
    epoch++; pending = false; failed = false; loaded = ''; element.pause();
    if (element.getAttribute('src')) { element.removeAttribute('src'); element.load(); }
    onState('none');
  }
  function refresh() {
    if (destroyed || !desired) return;
    if (!active() || rate === 0) { epoch++; pending = false; element.pause(); onState(loaded ? 'paused' : 'none'); return; }
    if (failed) return;
    if (loaded !== desired) { loaded = desired; element.src = desired; element.load(); onState('loading'); }
    try { element.playbackRate = rate; } catch { failed = true; element.pause(); onState('unavailable'); return; }
    if (pending || !element.paused) return;
    const attempt = ++epoch; pending = true;
    let result;
    try { result = element.play(); } catch { result = Promise.reject(new Error('Playback unavailable')); }
    Promise.resolve(result).then(() => {
      if (destroyed || attempt !== epoch) return;
      if (!active() || rate === 0) { pending = false; element.pause(); onState('paused'); return; }
      pending = false; onState('ready');
    }).catch(() => {
      if (destroyed || attempt !== epoch) return;
      pending = false; failed = true; element.pause(); onState('unavailable');
    });
  }
  function setSource(source = '', playbackRate = 1) {
    if (destroyed) return;
    if (typeof source !== 'string') source = '';
    const value = Number(playbackRate);
    rate = Number.isFinite(value) ? value === 0 ? 0 : Math.min(10, Math.max(.1, value)) : 1;
    if (source !== desired) { release(); desired = source; }
    refresh();
  }
  function unavailable() { if (!loaded || destroyed) return; epoch++; pending = false; failed = true; element.pause(); onState('unavailable'); }
  element.addEventListener('canplay', refresh); element.addEventListener('error', unavailable);
  function destroy() {
    if (destroyed) return;
    release(); destroyed = true; desired = '';
    element.removeEventListener('canplay', refresh); element.removeEventListener('error', unavailable);
  }
  return {setSource, refresh, destroy};
}

function skinAsset(path){if(!path)return '';return new URL((location.protocol==='file:'&&globalThis.__INTERSTELLAR_RECORDINGS__?'./dist/':'./')+path,location.href).href;}

const paletteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c-5.1 0-9 3.7-9 8.4 0 4.6 3.5 8.2 8 8.2h1.3c1.4 0 2.1-1.5 1.3-2.6l-.5-.7c-.6-.9 0-2 1.1-2h2.1c3.1 0 4.7-2 4.7-4.4 0-4.1-4.1-6.9-9-6.9Z"/><circle cx="7.1" cy="10" r=".65"/><circle cx="10.4" cy="6.9" r=".65"/><circle cx="15.1" cy="7.1" r=".65"/></svg>';

export function createSkins({getSkin = () => 'star', setSkin = () => {}, getMotion = () => true, getOptions = () => ({}), setOptions = () => {}, toast = () => {}, carouselLayer = null, videos = {}} = {}) {
  let scene, world, photo, video, videoPlayer, canvas, context, dialog, trigger, ownedTrigger = false, mounted = false, destroyed = false;
  let current = '', width = 0, height = 0, particles = [], pixelRatio = 1, clock, motionQuery, observer, unsubscribe;
  let imageRatio = 1.5, choiceEpoch = 0, busy = false, previousFocus = null;
  let options = normalizeSceneryOptions(getOptions()), weatherTime = 0;
  let weatherPainter, weatherPool = [], weatherSelection = '';
  let foreground, foregroundContext, foregroundRatio = 1, foregroundParticles = [], backgroundParticles = [], readingArea = null, readingObserver;
  const refs = {}, cards = new Map(), listeners = [];
  const fullscreenLayers = [];
  function restoreFullscreenLayers() {
    for (const {layer,anchor} of fullscreenLayers.splice(0)) { if(anchor.parentNode)anchor.replaceWith(layer); }
  }
  function syncFullscreen() {
    restoreFullscreenLayers();
    const player = document.fullscreenElement;
    if (player?.id === 'player') {
      for (const layer of [document.querySelector('.cosmos'),scene,foreground]) {
        if(!layer?.parentNode)continue;
        const anchor=document.createComment('scenery home position');
        layer.before(anchor);player.prepend(layer);fullscreenLayers.push({layer,anchor});
      }
    }
    resize();syncMotion();
  }
  const listen = (element, name, handler, options) => { element.addEventListener(name, handler, options); listeners.push(() => element.removeEventListener(name, handler, options)); };
  const read = () => { try { return normalizeSkin(getSkin()); } catch { return 'star'; } };
  const motion = () => { try { return getMotion() !== false; } catch { return true; } };
  const active = () => mounted && !destroyed && !document.querySelector('.journey-dialog[open]') && canAnimateSkin({skin:current, motion:motion(), hidden:document.hidden, reduced:motionQuery?.matches});
  const report = text => { try { toast(text); } catch {} };

  function protectReadingArea() {
    const bounds=document.querySelector('.word-stage')?.getBoundingClientRect();
    readingArea=bounds&&bounds.width&&bounds.height?{x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2,rx:Math.min(bounds.width*.46,430),ry:bounds.height*.55}:null;
  }

  function configureWeather() {
    const kind = SKINS.find(skin => skin.id === current)?.weather;
    if (!width || !height || (kind !== 'snow' && kind !== 'rain')) return false;
    const signature = [current,width,height,options[kind+'Density']].join(':');
    if (weatherSelection === signature) return false;
    const maximum = weatherParticleCount(kind,width,height,100);
    if (weatherPool.length < maximum) {
      const additions = createWeatherParticles(kind,width,height,Math.random,100);
      weatherPool.push(...additions.slice(weatherPool.length));
    } else if (weatherPool.length > maximum) weatherPool.length = maximum;
    particles = weatherPool.slice(0,weatherParticleCount(kind,width,height,options[kind+'Density'])).sort((a,b)=>a.depth-b.depth);
    const near=particles.filter(point=>point.layer===2&&point.index%(kind==='snow'?3:6)===0).sort((a,b)=>a.index-b.index).slice(0,kind==='snow'?24:16);
    const nearSet=new Set(near);
    foregroundParticles=near;
    backgroundParticles=particles.filter(point=>!nearSet.has(point));
    foreground.hidden=!near.length;
    foreground.dataset.particles=String(near.length);
    weatherSelection = signature;
    canvas.dataset.particles = String(particles.length);
    return true;
  }

  function draw(delta = 0) {
    if (!context || !width || !height) return;
    const weatherKey = current === 'forest' ? 'rain' : current === 'sakura' ? 'petals' : 'snow';
    const scaledDelta = delta * options[weatherKey] / 100;
    weatherTime += scaledDelta;
    const elapsed = weatherTime;
    advanceSkinParticles(particles, scaledDelta, width, height, elapsed);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); context.clearRect(0, 0, width, height);
    if(foregroundContext){foregroundContext.setTransform(foregroundRatio,0,0,foregroundRatio,0,0);foregroundContext.clearRect(0,0,width,height);}
    if (particles[0]?.kind === 'snow' || particles[0]?.kind === 'rain') {
      weatherPainter?.draw(context,backgroundParticles,elapsed);
      if(foregroundContext)weatherPainter?.draw(foregroundContext,foregroundParticles,elapsed,{opacity:.65,avoid:readingArea});
      return;
    }
    for (const point of particles) {
      const front = point.depth, sway = Math.sin(elapsed * .65 + point.phase), alpha = .16 + front * .35;
      context.save(); context.translate(point.x, point.y);
      if (point.kind === 'rain') {
        context.strokeStyle = `rgba(194,214,233,${alpha * .5})`; context.lineWidth = .4 + front * .5;
        context.beginPath(); context.moveTo(0, 0); context.lineTo(-1.8 - front, 10 + front * 13); context.stroke();
      } else if (point.kind === 'petals') {
        context.rotate(point.spin + elapsed * (.12 + front * .1)); context.scale(.5 + Math.abs(sway) * .5, 1);
        context.fillStyle = `rgba(${front > .6 ? '246,198,213' : '220,172,201'},${alpha + .1})`;
        context.beginPath(); context.moveTo(0, -point.size); context.bezierCurveTo(point.size, -point.size * .7, point.size * .8, point.size * .6, 0, point.size); context.bezierCurveTo(-point.size * .6, point.size * .2, -point.size * .65, -point.size * .5, 0, -point.size); context.fill();
      } else {
        context.fillStyle = point.kind === 'fireflies' ? `rgba(199,221,157,${(.12 + .22 * (sway + 1)) * front})` : `rgba(235,242,248,${alpha})`;
        context.beginPath(); context.arc(0, 0, point.size, 0, Math.PI * 2); context.fill();
        if (point.kind === 'fireflies') { context.globalAlpha = .1; context.beginPath(); context.arc(0, 0, point.size * 3.5, 0, Math.PI * 2); context.fill(); }
      }
      context.restore();
    }
  }
  function resize() {
    if (!scene || destroyed) return;
    const previousWidth = width, previousHeight = height;
    width = Math.max(1, window.innerWidth); height = Math.max(1, window.innerHeight);
    const portrait = imageRatio < .9 && width / height > 1.15;
    scene.dataset.portrait = String(portrait);
    const worldWidth = portrait ? width : Math.max(width, height * imageRatio);
    world.style.width = worldWidth + 'px'; world.style.height = (portrait ? height : worldWidth / imageRatio) + 'px';
    world.style.setProperty('--horse-width', worldWidth * .108 + 'px'); world.style.setProperty('--horse-radius', worldWidth * .102 + 'px');
    const desiredRatio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(1200000 / (width * height)));
    pixelRatio = desiredRatio;
    const pixelsWide = Math.round(width * pixelRatio), pixelsHigh = Math.round(height * pixelRatio);
    if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
    if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    foregroundRatio=Math.min(window.devicePixelRatio||1,1,Math.sqrt(800000/(width*height)));
    const frontWidth=Math.round(width*foregroundRatio),frontHeight=Math.round(height*foregroundRatio);
    if(foreground.width!==frontWidth)foreground.width=frontWidth;
    if(foreground.height!==frontHeight)foreground.height=frontHeight;
    foreground.style.width=width+'px';foreground.style.height=height+'px';
    if (previousWidth && previousHeight) for (const point of weatherPool.length ? weatherPool : particles) { point.x *= width / previousWidth; point.y *= height / previousHeight; }
    protectReadingArea();
    configureWeather();
    draw();
  }
  function syncMotion() {
    if (!scene) return;
    protectReadingArea();
    scene.dataset.motion = active() ? 'on' : 'off'; clock?.refresh(); videoPlayer?.refresh();
    applyAnimationRates();
    if (refs.motionNote) refs.motionNote.hidden = motion() && !motionQuery?.matches;
    if (current === 'carousel' && carouselLayer?.horseSrc && carouselLayer?.cleanSrc) {
      const target = active() ? carouselLayer.cleanSrc : SKINS.find(skin => skin.id === 'carousel').image;
      if (photo.getAttribute('src') !== target) photo.src = target;
    }
  }
  function applyAnimationRates() {
    const targets = [
      ['.cosmos .star','stars'],['.cosmos .meteor','meteors'],['.skin-shade','drift'],
      ['.skin-stream i','stream'],
      ['.skin-horse-ring','carousel'],['.skin-carousel-horse','carousel']
    ];
    for (const [selector,key] of targets) for (const element of document.querySelectorAll(selector)) {
      for (const animation of element.getAnimations?.({subtree:true}) || []) animation.updatePlaybackRate(options[key] / 100);
    }
  }
  function applyOptions() {
    const alpha = 1 - options.glassTransparency / 100, scale = alpha / .68;
    const values = {pane:alpha,player:Math.min(1,alpha+.06),dialog:Math.min(.98,alpha+.26),soft:.12*scale,selected:.22*scale,field:.42*scale,fullscreen:Math.min(.94,alpha*.76)};
    for (const [key,value] of Object.entries(values)) document.body.style.setProperty('--surface-'+key, value.toFixed(3));
    const config = SKINS.find(skin => skin.id === current);
    if (config) videoPlayer?.setSource(skinAsset(videos[current] || config.video || ''), skinVideoRate(current, current === 'carousel' ? options.carousel : options.leaves));
    if (configureWeather()) draw();
    applyAnimationRates();
    clock?.refresh();
  }
  function updateOptions(patch) {
    options = normalizeSceneryOptions({...options,...patch});
    applyOptions();renderTuning();
    try { Promise.resolve(setOptions({...options})).catch(() => { refs.status.textContent = bi('设置未能保存，请重试。','Could not save these settings. Please try again.'); }); }
    catch { refs.status.textContent = bi('设置未能保存，请重试。','Could not save these settings. Please try again.'); }
  }
  function renderTuning() {
    if (!refs.tuning) return;
    refs.tuningTitle.textContent = bi('风景微调','Make it your own');
    refs.tuningNote.textContent = sceneryControls(current).some(control=>control.kind==='density')
      ? bi('实时预览 · 自动保存。密度调为 0 可关闭天气，速度调为 0 可暂停；透明度不影响文字。','Live preview · Saved automatically. Density 0 hides weather; speed 0 pauses it. Text stays clear.')
      : bi('实时预览 · 自动保存；透明度只改变底层，文字保持清晰。','Live preview · Saved automatically. Transparency changes surfaces, keeping text clear.');
    refs.motionNote.textContent = bi('动态效果当前已关闭；开启后会使用你设置的速度。','Motion is currently off. Your speeds will apply when motion is enabled.');
    refs.motionNote.hidden = motion() && !motionQuery?.matches;
    refs.reset.textContent = bi('恢复舒缓设置','Reset to calm defaults');
    const controls = sceneryControls(current), keys = controls.map(control => control.key).join(',');
    if (refs.tuningGrid.dataset.keys !== keys) {
      refs.tuningGrid.replaceChildren();refs.tuningGrid.dataset.keys = keys;
      for (const control of controls) {
        const row=document.createElement('div');row.className='skin-adjustment';row.dataset.option=control.key;
        const label=document.createElement('label');label.htmlFor='skin-option-'+control.key;
        const name=document.createElement('span'),output=document.createElement('output');output.htmlFor=label.htmlFor;
        label.append(name,output);
        const input=document.createElement('input');input.type='range';input.id=label.htmlFor;input.min='0';input.max=String(control.max);input.step=String(control.step);input.dataset.sceneryOption=control.key;
        const endpoints=document.createElement('div');endpoints.className='skin-adjustment-endpoints';endpoints.innerHTML='<span></span><span></span>';
        input.addEventListener('input',()=>updateOptions({[control.key]:Number(input.value)}));
        row.append(label,input,endpoints);refs.tuningGrid.append(row);
      }
    }
    for (const control of controls) {
      const row=refs.tuningGrid.querySelector('[data-option="'+control.key+'"]'),input=row.querySelector('input'),output=row.querySelector('output');
      row.querySelector('label span').textContent=bi(control.zh,control.en);input.value=String(options[control.key]);
      input.setAttribute('aria-label',bi(control.zh,control.en));
      const value=options[control.key],isGlass=control.key==='glassTransparency',isDensity=control.kind==='density';
      const valueText=!isGlass&&value===0?(isDensity?bi('关闭','Off'):bi('静止','Still')):value+'%';
      output.textContent=valueText;input.setAttribute('aria-valuetext',valueText);
      const ends=row.querySelectorAll('.skin-adjustment-endpoints span');
      ends[0].textContent=isGlass?bi('更实','More solid'):isDensity?bi('关闭','Off'):bi('静止','Still');
      ends[1].textContent=isGlass?bi('更通透','More transparent'):isDensity?bi('浓密','Dense'):bi('原速','Original speed');
    }
  }
  function renderText() {
    if (!dialog) return;
    const credit=dialog.querySelector('.skin-credits');if(credit)credit.textContent=bi('素材来源','Image credits');
    const title = bi('主页风景', 'Your scenery');
    trigger?.setAttribute('aria-label', title); trigger?.setAttribute('title', title);
    if (refs.triggerLabel) refs.triggerLabel.textContent = bi('换个风景', 'Scenery');
    refs.title.textContent = title; refs.kicker.textContent = 'A QUIET CHANGE OF SCENE';
    refs.description.textContent = bi('给今天的学习，留一处喜欢的风景。', 'A place you love, for the words you are learning.');
    refs.close.textContent = bi('完成', 'Done'); refs.close.setAttribute('aria-label', bi('关闭风景选择', 'Close scenery selection'));
    refs.note.textContent = bi('仅改变主页 · 每日星旅保持独立', 'Home scenery only · Your daily voyage stays unchanged');
    for (const skin of SKINS) {
      const card = cards.get(skin.id), selected = current === skin.id;
      card.title.textContent = bi(skin.zh, skin.en); card.caption.textContent = bi(skin.captionZh, skin.captionEn);
      card.status.textContent = selected ? bi('正在使用', 'Selected') : bi('选择风景', 'Choose');
      card.button.setAttribute('aria-pressed', String(selected)); card.button.setAttribute('aria-label', bi(skin.zh, skin.en) + ' · ' + bi(skin.captionZh, skin.captionEn));
      card.button.disabled = busy; card.button.classList.toggle('is-selected', selected);
    }
    renderTuning();
  }
  function applyCurrent() {
    const next = read();
    if (next !== current) {
      current = next; document.body.dataset.skin = current; scene.dataset.skin = current;
      const config = SKINS.find(skin => skin.id === current);
      document.body.style.setProperty('--scene-wallpaper', config.image ? `url("${skinAsset(config.image)}")` : 'none');
      scene.hidden = current === 'star'; imageRatio = 1.5; scene.dataset.image = 'loading';
      if (config.image) { photo.src = skinAsset(config.image); video.poster = skinAsset(config.image); scene.style.setProperty('--skin-image', `url("${skinAsset(config.image)}")`); }
      else { photo.removeAttribute('src'); video.removeAttribute('poster'); scene.style.removeProperty('--skin-image'); }
      weatherPool = []; weatherSelection = ''; foregroundParticles = []; backgroundParticles = [];
      foreground.hidden=true;foreground.dataset.particles='0';
      particles = config.weather === 'snow' || config.weather === 'rain' ? [] : createSkinParticles(current,window.innerWidth,window.innerHeight);
      canvas.dataset.particles = String(particles.length); resize();
    }
    applyOptions();
    syncMotion(); renderText();
  }
  function refresh() { if (!mounted || destroyed) return; choiceEpoch++; busy = false; options=normalizeSceneryOptions(getOptions()); applyCurrent(); }
  async function choose(id) {
    if (busy || destroyed || id === current) return;
    const epoch = ++choiceEpoch; busy = true; renderText(); refs.status.textContent = '';
    try {
      await setSkin(normalizeSkin(id));
      if (destroyed || epoch !== choiceEpoch) return;
      busy = false; applyCurrent(); report(bi('风景已换好。', 'Your new scenery is ready.'));
    } catch {
      if (destroyed || epoch !== choiceEpoch) return;
      busy = false; renderText(); refs.status.textContent = bi('风景暂未保存，请再试一次。', 'Could not save this scenery. Please try again.');
    }
  }
  function close() {
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    trigger?.setAttribute('aria-expanded', 'false');
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); previousFocus = null;
  }
  function open() {
    if (!mounted || destroyed || dialog.open) return false;
    previousFocus = document.activeElement; renderText(); refs.status.textContent = '';
    try { dialog.showModal(); } catch { report(bi('风景选择暂时无法打开。', 'The scenery picker could not open.')); return false; }
    trigger?.setAttribute('aria-expanded', 'true'); cards.get(current)?.button.focus({preventScroll:true});
    if(window.innerWidth<=540){const grid=dialog.querySelector('.skin-grid'),selected=cards.get(current)?.button;if(selected){const box=selected.getBoundingClientRect(),area=grid.getBoundingClientRect();grid.scrollLeft+=box.left-area.left-(area.width-box.width)/2;}}
    return true;
  }
  function mount(triggerElement) {
    if (mounted || destroyed || typeof document === 'undefined') return;
    mounted = true;
    scene = document.createElement('div'); scene.className = 'skin-scene'; scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = '<div class="skin-world"><img class="skin-photo" alt="" decoding="async"><video class="skin-video" muted loop playsinline preload="metadata" tabindex="-1" aria-hidden="true"></video><div class="skin-leaf-patch skin-leaf-left"></div><div class="skin-leaf-patch skin-leaf-right"></div><div class="skin-stream"><i></i><i></i><i></i></div><div class="skin-carousel"><div class="skin-horse-ring"></div><div class="skin-carousel-glow"></div></div></div><div class="skin-shade"></div><canvas class="skin-weather"></canvas>';
    world = scene.querySelector('.skin-world'); photo = scene.querySelector('.skin-photo'); video = scene.querySelector('video'); canvas = scene.querySelector('canvas'); context = canvas.getContext('2d', {alpha:true});
    weatherPainter = createWeatherPainter(document);
    foreground=document.createElement('canvas');foreground.className='skin-weather-foreground';foreground.setAttribute('aria-hidden','true');foreground.hidden=true;
    foregroundContext=foreground.getContext('2d',{alpha:true});document.body.append(foreground);
    video.disablePictureInPicture = true;
    videoPlayer = createSkinVideo({element:video, active, onState:value => scene.dataset.video = value});
    const ring = scene.querySelector('.skin-horse-ring');
    if (carouselLayer?.horseSrc && carouselLayer?.cleanSrc) {
      scene.dataset.carouselMotion = 'available';
      for (let index = 0; index < 6; index++) {
        const orbit = document.createElement('div'); orbit.className = 'skin-horse-orbit'; orbit.style.setProperty('--horse-angle', index * 60 + 'deg'); orbit.style.setProperty('--horse-phase', -index * 2.1 + 's');
        const horse = document.createElement('img'); horse.className = 'skin-carousel-horse'; horse.src = carouselLayer.horseSrc; horse.alt = ''; horse.decoding = 'async';
        listen(horse, 'error', () => { scene.dataset.carouselMotion = 'unavailable'; });
        orbit.append(horse); ring.append(orbit);
      }
    }
    document.body.prepend(scene);
    dialog = document.createElement('dialog'); dialog.className = 'skin-dialog'; dialog.setAttribute('aria-labelledby', 'skin-picker-title');
    dialog.innerHTML = '<div class="skin-picker-head"><div><p class="skin-picker-kicker"></p><h2 id="skin-picker-title"></h2><p class="skin-picker-description"></p></div><button class="skin-picker-close" type="button"></button></div><div class="skin-grid"></div><div class="skin-picker-foot"><p class="skin-picker-note"></p><p class="skin-picker-status" role="status" aria-live="polite"></p></div>';
    refs.title = dialog.querySelector('h2'); refs.kicker = dialog.querySelector('.skin-picker-kicker'); refs.description = dialog.querySelector('.skin-picker-description'); refs.close = dialog.querySelector('.skin-picker-close'); refs.note = dialog.querySelector('.skin-picker-note'); refs.status = dialog.querySelector('.skin-picker-status');
    refs.tuning=document.createElement('section');refs.tuning.className='skin-tuning';refs.tuning.setAttribute('aria-labelledby','skin-tuning-title');
    refs.tuning.innerHTML='<div class="skin-tuning-head"><h3 id="skin-tuning-title"></h3><button type="button" class="skin-reset soft-button"></button></div><p class="skin-tuning-note"></p><div class="skin-tuning-grid"></div><p class="skin-motion-note" hidden></p>';
    dialog.querySelector('.skin-grid').after(refs.tuning);
    refs.tuningTitle=refs.tuning.querySelector('h3');refs.tuningNote=refs.tuning.querySelector('.skin-tuning-note');refs.tuningGrid=refs.tuning.querySelector('.skin-tuning-grid');refs.motionNote=refs.tuning.querySelector('.skin-motion-note');refs.reset=refs.tuning.querySelector('.skin-reset');
    listen(refs.reset,'click',()=>updateOptions(Object.fromEntries(sceneryControls(current).map(({key})=>[key,SCENERY_DEFAULTS[key]]))));
    const grid = dialog.querySelector('.skin-grid');
    for (const skin of SKINS) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'skin-card'; button.dataset.skinChoice = skin.id;
      button.innerHTML = '<span class="skin-thumbnail" aria-hidden="true"><i class="skin-thumbnail-glow"></i><span class="skin-selected-mark">✓</span></span><span class="skin-card-title"></span><span class="skin-card-caption"></span><span class="skin-card-status"></span>';
      if (skin.image) button.style.setProperty('--skin-thumbnail', `url("${skinAsset(skin.image)}")`);
      const card = {button, title:button.querySelector('.skin-card-title'), caption:button.querySelector('.skin-card-caption'), status:button.querySelector('.skin-card-status')}; cards.set(skin.id, card);
      listen(button, 'click', () => choose(skin.id)); grid.append(button);
    }
    const credit=document.createElement('a');credit.className='skin-credits';credit.href=skinAsset('assets/skins/credits.html');credit.target='_blank';credit.rel='noopener';credit.textContent=bi('素材来源','Image credits');dialog.querySelector('.skin-picker-foot').append(credit);
    document.body.append(dialog);
    trigger = triggerElement || document.getElementById('skin-button');
    if (!trigger) {
      trigger = document.createElement('button'); trigger.id = 'skin-button'; trigger.type = 'button'; trigger.className = 'skin-trigger'; trigger.innerHTML = paletteIcon + '<span></span>'; ownedTrigger = true; refs.triggerLabel = trigger.querySelector('span');
      const journey = document.getElementById('journey-button'); if (journey) journey.after(trigger); else document.querySelector('.header-actions')?.append(trigger);
    }
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    listen(trigger, 'click', open); listen(refs.close, 'click', close); listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
    listen(dialog, 'click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } });
    listen(photo, 'load', () => { if (photo.naturalWidth && photo.naturalHeight) { imageRatio = photo.naturalWidth / photo.naturalHeight; scene.dataset.image = 'ready'; resize(); } });
    listen(photo, 'error', () => { scene.dataset.image = 'unavailable'; });
    motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    clock = createSkinClock({requestFrame:callback => window.requestAnimationFrame(callback), cancelFrame:id => window.cancelAnimationFrame(id), active:() => active() && Boolean(context) && particles.length>0 && options[current==='forest'?'rain':current==='sakura'?'petals':'snow']>0, draw});
    listen(document, 'visibilitychange', syncMotion); listen(window, 'resize', resize);
    listen(window,'scroll',protectReadingArea,{passive:true});
    if(typeof ResizeObserver!=='undefined'){
      readingObserver=new ResizeObserver(protectReadingArea);
      const stage=document.querySelector('.word-stage');if(stage)readingObserver.observe(stage);
    }
    listen(document, 'fullscreenchange', syncFullscreen);
    const syncJourney = () => {
      const open = Boolean(document.querySelector('.journey-dialog[open]'));
      if (document.body.classList.contains('journey-open') !== open) document.body.classList.toggle('journey-open', open);
      syncMotion();
    };
    listen(document, 'interstellar-journey-visibility', syncJourney);
    if (motionQuery?.addEventListener) listen(motionQuery, 'change', syncMotion);
    if (typeof MutationObserver !== 'undefined') { observer = new MutationObserver(syncMotion); observer.observe(document.body, {attributes:true, attributeFilter:['class']}); }
    unsubscribe = onLanguageChange(renderText); applyCurrent(); syncJourney();
  }
  function destroy() {
    restoreFullscreenLayers();
    if (destroyed) return;
    close(); destroyed = true; mounted = false; choiceEpoch++; clock?.destroy(); videoPlayer?.destroy(); observer?.disconnect(); readingObserver?.disconnect(); unsubscribe?.();
    for (const remove of listeners) remove(); listeners.length = 0;
    scene?.remove(); foreground?.remove(); dialog?.remove(); if (ownedTrigger) trigger?.remove();
    if (typeof document !== 'undefined' && document.body.dataset.skin === current) { delete document.body.dataset.skin; document.body.style.removeProperty('--scene-wallpaper'); }
    if(typeof document!=='undefined')for (const key of ['pane','player','dialog','soft','selected','field','fullscreen']) document.body.style.removeProperty('--surface-'+key);
    if(typeof document!=='undefined')document.body.classList.remove('journey-open');
    weatherPainter?.destroy?.(); weatherPool = []; particles = []; foregroundParticles = []; backgroundParticles = []; cards.clear(); context = null; foregroundContext = null;
  }
  return {mount, refresh, open, close, destroy};
}
