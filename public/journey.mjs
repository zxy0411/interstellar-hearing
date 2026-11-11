import { bi, getUILanguage, setUILanguage, onLanguageChange } from './i18n.mjs';

// Planet facts: NASA Science. Texture provenance and rendering notes are in
// assets/planets/SOURCES.md. Collection IDs remain based on check-in order.
const PLANETS = [
 {key:'saturn',zh:'土星',en:'Saturn',type:['气态巨行星','GAS GIANT'],description:'冰粒与岩屑，织成太阳系最醒目的星环。环内的巨行星，主要由氢和氦组成。',descriptionEn:'Ice and rock form the Solar System’s most striking rings. Within them lies a giant made mostly of hydrogen and helium.',diameter:'120,500',equatorial:true,year:'29.4',yearUnit:['地球年','Earth years'],day:'10.7',dayUnit:['小时','hours'],hue:37,accent:40,ring:true,tilt:.48,roll:.27,flatten:.9,phase:.3,texture:'2k_saturn.jpg',source:'https://science.nasa.gov/saturn/facts/'},
 {key:'jupiter',zh:'木星',en:'Jupiter',type:['气态巨行星','GAS GIANT'],description:'太阳系最大的行星，云带沿相反方向奔流。那枚大红斑，是已持续数百年的巨大风暴。',descriptionEn:'The largest planet carries cloud bands flowing in opposite directions. Its Great Red Spot is a vast storm that has lasted for centuries.',diameter:'139,822',equatorial:false,year:'12',yearUnit:['地球年','Earth years'],day:'9.9',dayUnit:['小时','hours'],hue:28,accent:39,ring:false,tilt:.08,roll:-.09,flatten:.94,phase:.7,texture:'2k_jupiter.jpg',source:'https://science.nasa.gov/jupiter/jupiter-facts/'},
 {key:'earth',zh:'地球',en:'Earth',type:['类地行星','TERRESTRIAL PLANET'],description:'海洋覆盖约71%的表面，云层在蓝色星球上流动。倾斜的地轴，让我们拥有四季。',descriptionEn:'Oceans cover about 71% of the surface beneath moving clouds. The tilt of Earth’s axis gives us our seasons.',diameter:'12,756',equatorial:true,year:'365.25',yearUnit:['地球日','Earth days'],day:'23.9',dayUnit:['小时','hours'],hue:207,accent:186,ring:false,tilt:.08,roll:-.22,flatten:1,phase:-1.3,texture:'2k_earth_daymap.jpg',source:'https://science.nasa.gov/earth/facts/'},
 {key:'mars',zh:'火星',en:'Mars',type:['类地行星','TERRESTRIAL PLANET'],description:'岩石与尘埃中的铁氧化，让火星呈现锈红色。古老河谷与湖床，留下了曾经有水的线索。',descriptionEn:'Oxidized iron in rock and dust gives Mars its rusty color. Ancient valleys and lakebeds preserve evidence of a wetter past.',diameter:'6,780',equatorial:false,year:'687',yearUnit:['地球日','Earth days'],day:'24.6',dayUnit:['小时','hours'],hue:17,accent:28,ring:false,tilt:.12,roll:.08,flatten:1,phase:2.8,texture:'2k_mars.jpg',source:'https://science.nasa.gov/mars/facts/'},
 {key:'neptune',zh:'海王星',en:'Neptune',type:['冰巨行星','ICE GIANT'],description:'在八颗行星中，它离太阳最远。一次环绕太阳的旅程，需要约165个地球年。',descriptionEn:'Neptune is the most distant of the eight planets. One journey around the Sun takes about 165 Earth years.',diameter:'49,528',equatorial:true,year:'165',yearUnit:['地球年','Earth years'],day:'16',dayUnit:['小时','hours'],hue:214,accent:205,ring:false,tilt:.13,roll:-.22,flatten:1,phase:.2,texture:'2k_neptune.jpg',source:'https://science.nasa.gov/neptune/neptune-facts/'},
 {key:'uranus',zh:'天王星',en:'Uranus',type:['冰巨行星','ICE GIANT'],description:'近乎侧躺着自转，是这颗冰巨行星的独特姿态。大气中的甲烷吸收红光，使它显出蓝绿色。',descriptionEn:'This ice giant spins almost on its side. Methane absorbs red light in its atmosphere, giving it a blue-green appearance.',diameter:'51,118',equatorial:true,year:'84',yearUnit:['地球年','Earth years'],day:'17',dayUnit:['小时','hours'],hue:184,accent:190,ring:false,tilt:.12,roll:1.4,flatten:1,phase:.3,texture:'2k_uranus.jpg',source:'https://science.nasa.gov/uranus/facts/'},
 {key:'venus',zh:'金星',en:'Venus',type:['类地行星','TERRESTRIAL PLANET'],description:'浓厚大气困住热量，使它成为太阳系最热的行星。金星自转缓慢，方向也与大多数行星相反。',descriptionEn:'A thick atmosphere traps heat on the hottest planet in the Solar System. Venus rotates slowly, opposite to most planets.',diameter:'12,104',equatorial:true,year:'225',yearUnit:['地球日','Earth days'],day:'243',dayUnit:['地球日','Earth days'],hue:39,accent:47,ring:false,tilt:.1,roll:.05,flatten:1,phase:1,texture:'2k_venus_atmosphere.jpg',source:'https://science.nasa.gov/venus/venus-facts/'},
 {key:'mercury',zh:'水星',en:'Mercury',type:['类地行星','TERRESTRIAL PLANET'],description:'密布的陨石坑，记录着漫长的撞击历史。它只用88个地球日，就完成一次绕日公转。',descriptionEn:'A cratered surface records a long history of impacts. Mercury completes an orbit around the Sun in just 88 Earth days.',diameter:'4,880',equatorial:false,year:'88',yearUnit:['地球日','Earth days'],day:'59',dayUnit:['地球日','Earth days'],hue:28,accent:38,ring:false,tilt:.04,roll:.05,flatten:1,phase:2,texture:'2k_mercury.jpg',source:'https://science.nasa.gov/mercury/facts/'}
];
const GALAXIES = ['初光星系','回声星系','远昼星系','云屿星系','静海星系','漫游星系'];
const GALAXIES_EN = ['First Light','Echo','Far Day','Cloud Isles','Quiet Sea','Voyager'];
const DAY_MS = 86400000;

function dayOrdinal(key) {
 if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
 const [year, month, day] = key.split('-').map(Number);
 if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
 const date = new Date(0);
 date.setUTCFullYear(year, month - 1, day); date.setUTCHours(0, 0, 0, 0);
 return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() / DAY_MS : null;
}

export function localDayKey(date = new Date()) {
 const value = date instanceof Date ? date : new Date(date);
 if (!Number.isFinite(value.getTime()) || value.getFullYear() < 1 || value.getFullYear() > 9999) throw new RangeError('无效的本地日期');
 return [String(value.getFullYear()).padStart(4, '0'), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

export function normalizeJourney(data) {
 const days = [...new Set((Array.isArray(data?.days) ? data.days : []).filter(day => dayOrdinal(day) !== null))].sort();
 return { days, lastIntroDay: dayOrdinal(data?.lastIntroDay) !== null ? data.lastIntroDay : '' };
}

function planetAt(index, unlockedOn = '') {
 const planet = PLANETS[index % PLANETS.length];
 const voyage = Math.floor(index / PLANETS.length);
 const galaxyNumber = Math.floor(index / 7) + 1;
 return { ...planet, id: 'planet-' + (index + 1), number: index + 1, name: planet.zh + (voyage ? ' · 远航 ' + (voyage + 1) : ''), nameEn: planet.en + (voyage ? ' · Voyage ' + (voyage + 1) : ''), galaxyNumber, galaxyName: galaxyName(galaxyNumber), unlockedOn };
}

function galaxyName(number) {
 return GALAXIES[(number - 1) % GALAXIES.length] + (number > GALAXIES.length ? ' · ' + Math.ceil(number / GALAXIES.length) : '');
}

export function journeyView(data, date = new Date()) {
 const today = localDayKey(date), clean = normalizeJourney(data);
 const days = clean.days.filter(day => day <= today), checkedIn = days.includes(today);
 const ordinals = new Set(days.map(dayOrdinal));
 let cursor = dayOrdinal(today) - (checkedIn ? 0 : 1), streak = 0;
 while (ordinals.has(cursor)) { streak++; cursor--; }
 const totalDays = days.length, unlockedPlanets = days.map((day, index) => planetAt(index, day));
 const nextPlanet = planetAt(totalDays), currentPlanet = checkedIn ? unlockedPlanets.at(-1) : nextPlanet;
 return { today, checkedIn, totalDays, streak, completedGalaxies: Math.floor(totalDays / 7), galaxyNumber: Math.floor(totalDays / 7) + 1, galaxyProgress: totalDays % 7, galaxyName: galaxyName(Math.floor(totalDays / 7) + 1), unlockedPlanets, currentPlanet, nextPlanet };
}

export function checkInJourney(data, date = new Date()) {
 const clean = normalizeJourney(data), today = localDayKey(date), newlyUnlocked = !clean.days.includes(today);
 if (newlyUnlocked) clean.days.push(today);
 clean.days.sort();
 return { data: clean, checkedIn: true, newlyUnlocked, view: journeyView(clean, date) };
}

function element(tag, className, text) {
 const node = document.createElement(tag);
 if (className) node.className = className;
 if (text !== undefined) node.textContent = text;
 return node;
}

function seededRandom(seed) {
 return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function assetURL(name) {
 const portable = location.protocol === 'file:' && !!globalThis.__INTERSTELLAR_RECORDINGS__;
 return new URL((portable ? './dist/' : location.protocol === 'file:' ? './' : '/') + 'assets/planets/' + name, location.href).href;
}
function translatedGalaxy(number) {
 const suffix = number > GALAXIES.length ? ' · ' + Math.ceil(number / GALAXIES.length) : '';
 return bi(galaxyName(number), GALAXIES_EN[(number - 1) % GALAXIES_EN.length] + ' Galaxy' + suffix);
}
const imageCache = new Map();
function loadImage(name) {
 if (!imageCache.has(name)) imageCache.set(name, new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => { imageCache.delete(name); reject(new Error('Planet texture unavailable')); }; image.src = assetURL(name);
 }));
 return imageCache.get(name);
}

// Keep the shader workload bounded on high-DPI and ultrawide screens. This is
// a display resolution, independent of the CSS size and the source textures.
export function planetRenderSize(width, height, pixelRatio = 1) {
 const safe = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 1;
 const w = safe(width), h = safe(height);
 const ratio = Math.min(safe(pixelRatio), 1.25, 1800 / w, 1600 / h, Math.sqrt(1400000 / (w * h)));
 return {width:Math.max(1,Math.floor(w * ratio)),height:Math.max(1,Math.floor(h * ratio))};
}

// Illustrative time scale: visible axial rotation within the short intro, with
// a restrained 3D viewing-angle change for nearly symmetric gas-giant bands.
// Time only advances in the visible, motion-enabled animation clock below.
export function planetAnimationPose(planet, seconds) {
 const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
 const direction = planet.key === 'venus' || planet.key === 'uranus' ? -1 : 1;
 return {
  rotation:planet.phase + direction * time * .14,
  tilt:planet.tilt + (planet.ring ? .04 * Math.sin(time * .14) : 0),
  roll:planet.roll + (planet.ring ? .018 * Math.sin(time * .11) : 0),
  cameraDistance:(planet.ring ? 6.45 : 4.1) + .25 * Math.exp(-time / 3)
 };
}

// A ray-traced ellipsoid and ring plane in one native WebGL draw call.
// Textures supply real planetary detail; the light/camera placement is illustrative.
function createPlanetRenderer(canvas, ready) {
 let gl, program, buffer, destroyed = false, loaded = '', loadToken = 0, planet, usable = false;
 const textures = [], uniforms = {};
 try {
  gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) return null;
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  const fragment = `precision highp float;
uniform vec2 resolution;uniform float rotation;uniform float cameraDistance;uniform float tilt;uniform float roll;uniform float flatten;uniform float hasRing;uniform float isEarth;uniform float surfaceRepeat;uniform float cloudRepeat;uniform vec3 atmosphere;uniform sampler2D surfaceMap;uniform sampler2D ringMap;uniform sampler2D cloudMap;
const float PI=3.14159265359;
vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec3 rz(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
vec3 local(vec3 p){return rx(rz(p,-roll),-tilt);}
vec3 world(vec3 p){return rz(rx(p,tilt),roll);}
float hitSphere(vec3 o,vec3 d){vec3 scale=vec3(1.0,flatten,1.0);o/=scale;d/=scale;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.0,h=b*b-a*c;if(h<0.0)return 1e5;float t=(-b-sqrt(h))/a;return t>0.001?t:1e5;}
vec2 uvFor(vec3 n){return vec2(0.5+atan(n.z,n.x)/(2.0*PI)+rotation/(2.0*PI),0.5+asin(clamp(n.y,-1.0,1.0))/PI);}
void main(){
 vec2 uv=(gl_FragCoord.xy*2.0-resolution)/resolution.y;
 vec3 ro=vec3(0.0,0.0,cameraDistance),rd=normalize(vec3(uv,-3.0));
 vec3 lo=local(ro),ld=local(rd),light=normalize(vec3(-2.8,2.1,3.4)),ll=local(light);
 float t=hitSphere(lo,ld);vec3 color=vec3(0.0);float alpha=0.0;
 if(t<1e4){
  vec3 p=lo+ld*t,n=normalize(p/vec3(1.0,flatten*flatten,1.0)),nw=world(n);
  vec2 texUV=uvFor(normalize(p/vec3(1.0,flatten,1.0)));
  vec3 tex=texture2D(surfaceMap,surfaceRepeat>0.5?texUV:vec2(fract(texUV.x),texUV.y)).rgb;
  float ndl=dot(nw,light),shade=pow(max(ndl,0.0),0.84);
  if(hasRing>0.5&&abs(ll.y)>0.01){float rt=-p.y/ll.y;if(rt>0.01){vec3 rp=p+ll*rt;float rr=length(rp.xz);if(rr>1.2&&rr<2.32){float ra=texture2D(ringMap,vec2((rr-1.2)/1.12,0.5)).a;shade*=1.0-ra*0.68;}}}
  if(isEarth>0.5){vec2 cloudUV=vec2(texUV.x+rotation*0.012,texUV.y);if(cloudRepeat<0.5)cloudUV.x=fract(cloudUV.x);vec3 cloud=texture2D(cloudMap,cloudUV).rgb;float amount=smoothstep(0.2,0.83,dot(cloud,vec3(0.3333)))*0.72;tex=mix(tex,vec3(0.96),amount);}
  color=pow(tex,vec3(2.2))*(0.018+shade*1.3);
  float rim=pow(1.0-max(dot(nw,-rd),0.0),4.0)*smoothstep(-0.1,0.7,ndl);
  color+=atmosphere*rim*0.12;
  color=pow(max(color,vec3(0.0)),vec3(1.0/2.2));alpha=1.0;
 }
 if(hasRing>0.5&&abs(ld.y)>0.001){
  float tr=-lo.y/ld.y;vec3 rp=lo+ld*tr;float radius=length(rp.xz);
  if(tr>0.0&&tr<t&&radius>1.2&&radius<2.32){vec4 ring=texture2D(ringMap,vec2((radius-1.2)/1.12,0.5));float shadow=hitSphere(rp+ll*0.002,ll)<1e4?0.18:1.0;vec3 ringColor=pow(pow(ring.rgb,vec3(2.2))*1.65*shadow,vec3(1.0/2.2));float a=ring.a*smoothstep(1.2,1.23,radius)*(1.0-smoothstep(2.29,2.32,radius));float combined=a+alpha*(1.0-a);color=(ringColor*a+color*alpha*(1.0-a))/max(combined,0.001);alpha=combined;}
 }
 gl_FragColor=vec4(color,alpha);
}`;
  const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, index) => { const shader = gl.createShader(type); gl.shaderSource(shader, index ? fragment : vertex); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error); } return shader; });
  program = gl.createProgram(); shaders.forEach(shader => gl.attachShader(program, shader)); gl.linkProgram(program); shaders.forEach(shader => gl.deleteShader(shader));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Planet renderer could not link');
  gl.useProgram(program); buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  for (const name of ['resolution','rotation','cameraDistance','tilt','roll','flatten','hasRing','isEarth','surfaceRepeat','cloudRepeat','atmosphere','surfaceMap','ringMap','cloudMap']) uniforms[name] = gl.getUniformLocation(program, name);
  for (let i = 0; i < 3; i++) { const texture = gl.createTexture(); textures.push(texture); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); }
  gl.uniform1i(uniforms.surfaceMap, 0); gl.uniform1i(uniforms.ringMap, 1); gl.uniform1i(uniforms.cloudMap, 2);
 } catch { textures.forEach(texture => gl?.deleteTexture(texture)); if (program) gl?.deleteProgram(program); if (buffer) gl?.deleteBuffer(buffer); return null; }
 const lost = event => { event.preventDefault(); usable = false; ready(false); };
 canvas.addEventListener('webglcontextlost', lost);
 return {
  load(next) {
   if (loaded === next.key || destroyed) return; loaded = next.key; planet = next; usable = false; ready(false); const token = ++loadToken;
   Promise.all([loadImage(next.texture), next.ring ? loadImage('2k_saturn_ring_alpha.png') : null, next.key === 'earth' ? loadImage('2k_earth_clouds.jpg') : null]).then(images => {
    if (destroyed || token !== loadToken || gl.isContextLost()) return;
    try {
     images.forEach((image, index) => {
      if (!image) return;
      let source = image;
      if (index === 1) {
       // The ring shader samples only its middle row. A 2048x1 radial strip
       // preserves that data while enabling mipmaps for the original 2048x125 map.
       const strip = document.createElement('canvas');strip.width=image.naturalWidth || image.width;strip.height=1;
       const context = strip.getContext('2d');
       if (context) {context.drawImage(image,0,Math.floor((image.naturalHeight || image.height)/2),strip.width,1,0,0,strip.width,1);source=strip;}
      }
      gl.activeTexture(gl.TEXTURE0 + index); gl.bindTexture(gl.TEXTURE_2D, textures[index]); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      const powerOfTwo = value => value > 0 && (value & (value - 1)) === 0;
      const pot = powerOfTwo(source.naturalWidth || source.width) && powerOfTwo(source.naturalHeight || source.height);
      // Longitude wraps in hardware. Surface/cloud maps use LINEAR to avoid
      // mip derivative spikes at atan's longitude seam and the poles.
      const mipmaps = pot && index === 1;
      const repeat = pot && index !== 1;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      if (index !== 1) gl.uniform1f(uniforms[index === 0 ? 'surfaceRepeat' : 'cloudRepeat'],repeat ? 1 : 0);
      // The radial ring map has continuous coordinates and benefits from mipmaps.
      // NPOT images retain WebGL 1's LINEAR/CLAMP_TO_EDGE fallback.
      if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
     });
     usable = true; ready(true);
    }
    catch { usable = false; ready(false); }
   }).catch(() => { if (!destroyed && token === loadToken) ready(false); });
  },
  resize(w, h) {
   const size = planetRenderSize(w,h,window.devicePixelRatio || 1);
   if (canvas.width === size.width && canvas.height === size.height) return;
   canvas.width = size.width; canvas.height = size.height; gl.viewport(0,0,size.width,size.height);
  },
  draw(time) {
   if (!usable || destroyed || !planet || gl.isContextLost()) return;
   const pose = planetAnimationPose(planet,time);
   gl.useProgram(program); gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
   gl.uniform1f(uniforms.rotation, pose.rotation);
   gl.uniform1f(uniforms.cameraDistance, pose.cameraDistance);
   gl.uniform1f(uniforms.tilt, pose.tilt); gl.uniform1f(uniforms.roll, pose.roll); gl.uniform1f(uniforms.flatten, planet.flatten); gl.uniform1f(uniforms.hasRing, planet.ring ? 1 : 0); gl.uniform1f(uniforms.isEarth, planet.key === 'earth' ? 1 : 0);
   gl.uniform3f(uniforms.atmosphere, planet.key === 'earth' ? .12 : .15, planet.key === 'earth' ? .32 : .12, planet.key === 'earth' ? .7 : .08);
   gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6);
  },
  destroy() { destroyed = true; loadToken++; canvas.removeEventListener('webglcontextlost', lost); textures.forEach(texture => gl.deleteTexture(texture)); gl.deleteBuffer(buffer); gl.deleteProgram(program); }
 };
}

export function createJourney({ getData, setData, getMotion = () => true, toast = () => {}, onEnter } = {}) {
 if (typeof getData !== 'function' || typeof setData !== 'function') throw new TypeError('Journey requires readable, writable progress');
 let dialog, refs, trigger, previousFocus, previousOverflow, mode = '', destroyed = false, epoch = 0, busy = false, pendingIntro = false;
 let frame = 0, previousFrame = 0, elapsed = 0, lastSkyDraw = -Infinity, introTimer = 0, fadeTimer = 0, introStarted = 0, introRemaining = 8000, autoPaused = false;
 let resizeObserver, renderer, view, visibleCount = 24, stars = [], width = 0, height = 0, unsubscribeLanguage, statusCode = '';
 const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
 const read = () => normalizeJourney(getData());
 const motionEnabled = () => !motionQuery?.matches && getMotion() !== false;
 const report = message => { try { toast(message); } catch {} };

 function ensureDOM() {
  if (dialog || destroyed) return;
  dialog = element('dialog', 'journey-dialog'); dialog.setAttribute('aria-labelledby', 'journey-title'); dialog.setAttribute('aria-describedby', 'journey-description');
  dialog.innerHTML = `<canvas class="journey-sky" aria-hidden="true"></canvas>
   <div class="journey-shell">
    <header class="journey-header"><div class="journey-wordmark"><span class="journey-wordmark-symbol" aria-hidden="true">✧</span><span class="journey-brand"></span></div><span class="journey-header-caption"></span><div class="journey-header-actions"><button type="button" class="journey-replay"></button><button type="button" class="journey-language"></button><button type="button" class="journey-close"></button></div></header>
    <div class="journey-content">
     <section class="journey-visual"><div class="journey-planet-stage" aria-hidden="true"><img class="journey-poster" alt=""><canvas class="journey-planet-canvas"></canvas></div><div class="journey-planet-copy"><p class="journey-planet-tag"></p><h2 id="journey-title"></h2><p class="journey-planet-subtitle"></p><p id="journey-description"></p><dl class="journey-facts"></dl></div></section>
     <section class="journey-summary"><div class="journey-summary-heading"><span class="journey-kicker"></span><h3 class="journey-today-title"></h3><p class="journey-today-copy"></p></div><dl class="journey-stats"><div><dt class="journey-total-label"></dt><dd class="journey-total"></dd></div><div><dt class="journey-streak-label"></dt><dd class="journey-streak"></dd></div><div><dt class="journey-galaxies-label"></dt><dd class="journey-galaxies"></dd></div></dl><div class="journey-progress"><div class="journey-progress-title"><span class="journey-galaxy-name"></span><span class="journey-progress-count"></span></div><div class="journey-constellation" role="img"></div><p class="journey-progress-copy"></p></div><div class="journey-entry-actions"><button type="button" class="journey-checkin"></button><button type="button" class="journey-pause-auto"></button></div><p class="journey-status" role="status" aria-live="polite"></p><p class="journey-auto-hint"></p></section>
    </div>
    <section class="journey-collection" aria-labelledby="journey-collection-title"><div class="journey-collection-heading"><h3 id="journey-collection-title"></h3><span class="journey-collection-count"></span></div><div class="journey-collection-grid"></div><button type="button" class="journey-more"></button></section>
    <footer class="journey-footer"><span class="journey-coordinate"></span><span class="journey-credit"><a class="journey-nasa-link" target="_blank" rel="noopener noreferrer"></a><span aria-hidden="true"> · </span><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope</a><span aria-hidden="true"> / </span><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></span></footer>
   </div>`;
  refs = {};
  for (const name of ['sky','brand','close','replay','language','header-caption','planet-stage','poster','planet-canvas','coordinate','planet-tag','planet-subtitle','facts','kicker','today-title','today-copy','total','streak','galaxies','total-label','streak-label','galaxies-label','galaxy-name','progress-count','progress-copy','constellation','checkin','pause-auto','status','auto-hint','collection-count','collection-grid','more','nasa-link']) refs[name] = dialog.querySelector('.journey-' + name);
  refs.title = dialog.querySelector('#journey-title'); refs.description = dialog.querySelector('#journey-description'); refs.collectionTitle = dialog.querySelector('#journey-collection-title');
  refs.close.addEventListener('click', dismiss); refs.checkin.addEventListener('click', performCheckIn); refs['pause-auto'].addEventListener('click', toggleAuto);
  refs.replay.addEventListener('click', () => open('intro'));
  refs.language.addEventListener('click', () => setUILanguage(getUILanguage() === 'en' ? 'zh' : 'en'));
  refs.more.addEventListener('click', () => { visibleCount += 24; renderCollection(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); }); dialog.addEventListener('keydown', handleKey);
  dialog.addEventListener('pointerdown', event => { if (!event.target.closest('.journey-pause-auto,.journey-language')) pauseAuto(); });
  dialog.addEventListener('click', event => { if (event.target === dialog && mode !== 'intro') close(); });
  document.body.append(dialog);
  renderer = createPlanetRenderer(refs['planet-canvas'], usable => { if (!refs) return; refs['planet-stage'].classList.toggle('has-webgl', usable); if (mode) draw(elapsed / 1000); });
  document.addEventListener('visibilitychange', visibilityChanged); window.addEventListener('resize', resize); motionQuery?.addEventListener?.('change', updateMotion);
  unsubscribeLanguage = onLanguageChange(() => { if (mode) render(); });
  if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(dialog); resizeObserver.observe(refs['planet-stage']); }
 }

 function render() {
  view = journeyView(read()); const planet = view.currentPlanet;
  dialog.lang = getUILanguage() === 'en' ? 'en' : 'zh-CN';
  refs.brand.textContent = bi('星际航行','INTERSTELLAR');
  refs.title.textContent = bi(planet.zh, planet.en.toUpperCase());
  refs['planet-subtitle'].textContent = bi(planet.en.toUpperCase(), planet.zh);
  refs.description.textContent = bi(planet.description, planet.descriptionEn);
  refs['planet-tag'].textContent = bi(planet.type[0], planet.type[1]) + ' / ' + bi('今日的目的地','TODAY’S DESTINATION');
  refs.coordinate.textContent = bi('航行记录','VOYAGE LOG') + '  ' + String(planet.number).padStart(3, '0') + '  /  ' + bi(view.checkedIn ? '今日已收藏' : '等待今日打卡', view.checkedIn ? 'COLLECTED TODAY' : 'AWAITING CHECK-IN');
  refs['header-caption'].textContent = bi('每天，靠近一点宇宙。','A LITTLE CLOSER TO THE COSMOS.');
  refs.replay.hidden = mode === 'intro'; refs.replay.textContent = bi('重看今日开场','Replay today’s intro');
  refs.language.textContent = bi('EN','中文'); refs.language.setAttribute('aria-label',bi('切换为英语界面','Switch the interface to Chinese')); refs.language.title = refs.language.getAttribute('aria-label');
  refs.close.textContent = mode === 'intro' ? bi('跳过开场 ↗','Skip intro ↗') : bi('关闭 ✕','Close ✕');
  refs.close.setAttribute('aria-label', mode === 'intro' ? bi('跳过开场，进入学习','Skip the introduction and enter learning') : bi('关闭星图','Close the star atlas'));
  refs['nasa-link'].textContent = bi('科普 · NASA','Facts · NASA'); refs['nasa-link'].href = planet.source;
  const poster = assetURL(planet.key + '-poster.webp'); if (refs.poster.src !== poster) refs.poster.src = poster;
  renderer?.load(planet);
  refs.facts.replaceChildren();
  const metrics = [[bi(planet.equatorial ? '赤道直径' : '平均直径', planet.equatorial ? 'EQUATORIAL DIAMETER' : 'MEAN DIAMETER'), planet.diameter, 'km'], [bi('公转周期','ORBITAL PERIOD'), planet.year, bi(...planet.yearUnit)], [bi('自转周期','ROTATION PERIOD'), planet.day, bi(...planet.dayUnit)]];
  for (const [label, value, unit] of metrics) { const item = element('div'); const dd = element('dd'); dd.append(element('span','',value), element('small','',unit)); item.append(element('dt','',label), dd); refs.facts.append(item); }
  refs.kicker.textContent = bi('学习星图','YOUR ATLAS'); refs['today-title'].textContent = bi(view.checkedIn ? '今天的星光，已收藏' : '下一站，从今天开始', view.checkedIn ? 'Today’s world is yours.' : 'Your next stop starts today.');
  refs['today-copy'].textContent = bi('一天一颗星球，让坚持留下轨迹。','A planet a day. A visible trace of your progress.');
  refs['total-label'].textContent = bi('累计打卡','CHECK-INS'); refs['streak-label'].textContent = bi('连续天数','DAY STREAK'); refs['galaxies-label'].textContent = bi('点亮星系','GALAXIES');
  refs.total.textContent = view.totalDays; refs.streak.textContent = view.streak; refs.galaxies.textContent = view.completedGalaxies;
  refs['galaxy-name'].textContent = translatedGalaxy(view.galaxyNumber); refs['progress-count'].textContent = view.galaxyProgress + ' / 7';
  refs['progress-copy'].textContent = bi('累计七次打卡，点亮一个学习星系。','Seven check-ins complete one learning galaxy.');
  refs.constellation.replaceChildren(); refs.constellation.setAttribute('aria-label', bi('当前星系已收藏 '+view.galaxyProgress+' 颗，共七颗', view.galaxyProgress+' of seven planets collected in this learning galaxy'));
  for (let i = 0; i < 7; i++) { const dot = element('span', 'journey-star-point' + (i < view.galaxyProgress ? ' is-lit' : '')); dot.setAttribute('aria-hidden','true'); refs.constellation.append(dot); }
  refs.checkin.disabled = busy || (view.checkedIn && mode !== 'intro');
  refs.checkin.textContent = busy ? bi('正在收藏…','Collecting…') : view.checkedIn ? (mode === 'intro' ? bi('进入学习 ↗','Start learning ↗') : bi('今日已打卡','Checked in today')) : (mode === 'intro' ? bi('打卡，开始学习 ↗','Check in & begin ↗') : bi('收藏今日星球 ↗','Collect today’s planet ↗'));
  refs['pause-auto'].hidden = mode !== 'intro'; renderAuto();
  refs.status.textContent = statusCode === 'saved' ? bi('已加入你的星图。','Added to your atlas.') : statusCode === 'failed' ? bi('暂未保存成功，请重试或先进入学习。','Could not save. Retry or continue to learning.') : statusCode === 'intro-failed' ? bi('开场记录暂未保存，仍可进入学习。','The intro preference could not be saved. You can still continue.') : '';
  refs.collectionTitle.textContent = bi('收藏星球','COLLECTED WORLDS'); refs.more.textContent = bi('展开更早的航行','Show earlier journeys');
  renderCollection(); updateMotion();
 }
 function renderAuto() {
  if (!refs) return;
  refs['pause-auto'].textContent = autoPaused ? bi('继续自动进入','Resume auto-entry') : bi('停留欣赏','Stay a little longer'); refs['pause-auto'].setAttribute('aria-pressed', String(autoPaused));
  refs['auto-hint'].textContent = mode === 'intro' ? bi(autoPaused ? '已暂停自动进入' : '片刻后自动进入学习', autoPaused ? 'Auto-entry paused' : 'Learning opens automatically in a moment') : '';
 }
 function renderCollection() {
  if (!view || !refs) return;
  refs['collection-count'].textContent = bi(view.totalDays+' 颗',view.totalDays+' collected');
  const grid = refs['collection-grid']; grid.replaceChildren();
  if (!view.totalDays) grid.append(element('p','journey-empty',bi('你的第一段航行，等待今日启程。','Your first journey is waiting to begin.')));
  for (const planet of view.unlockedPlanets.slice(-visibleCount).reverse()) {
   const card = element('article','journey-planet-card'), orb = element('img','journey-mini-planet'); orb.src = assetURL(planet.key+'-thumb.webp'); orb.alt = ''; orb.loading = 'lazy';
   const copy = element('div','journey-card-copy'); copy.append(element('h4','',bi(planet.name,planet.nameEn)),element('p','',translatedGalaxy(planet.galaxyNumber)+' · '+planet.unlockedOn)); card.append(orb,copy); grid.append(card);
  }
  refs.more.hidden = view.totalDays <= visibleCount;
 }
 function stopFrame() { if (frame) cancelAnimationFrame(frame); frame = 0; previousFrame = 0; }
 function tick(now) {
  frame = 0; if (!mode || document.hidden || !motionEnabled()) return;
  if (previousFrame) elapsed += Math.min(80, now-previousFrame); previousFrame = now;
  draw(elapsed/1000);
  frame = requestAnimationFrame(tick);
 }
 function updateMotion() {
  if (!mode || !dialog) return;
  const enabled = motionEnabled(); dialog.classList.toggle('journey-static',!enabled); stopFrame(); draw(elapsed/1000);
  if (enabled && !document.hidden) frame = requestAnimationFrame(tick);
 }
 function resize() {
  if (!mode || !refs) return;
  const bounds = dialog.getBoundingClientRect(), changed = width !== bounds.width || height !== bounds.height;
  width = bounds.width; height = bounds.height;
  const ratio = Math.min(window.devicePixelRatio || 1,1,Math.sqrt(600000/Math.max(1,width*height)));
  const skyWidth=Math.max(1,Math.round(width*ratio)),skyHeight=Math.max(1,Math.round(height*ratio));
  if (refs.sky.width !== skyWidth || refs.sky.height !== skyHeight) { refs.sky.width=skyWidth;refs.sky.height=skyHeight;refs.sky.getContext('2d')?.setTransform(ratio,0,0,ratio,0,0);lastSkyDraw=-Infinity; }
  if (changed || !stars.length) { const random = seededRandom(17373); stars = Array.from({length:Math.min(60,Math.round(width*height/21000))},()=>({x:random()*width,y:random()*height,radius:.3+random()*.55,phase:random()*Math.PI*2,speed:.15+random()*.2}));lastSkyDraw=-Infinity; }
  const scene = refs['planet-stage'].getBoundingClientRect(); renderer?.resize(scene.width,scene.height); draw(elapsed/1000);
 }
 function draw(time) {
  if (!refs || !mode) return;
  const context = refs.sky.getContext('2d');
  if (context && (time-lastSkyDraw>=.08 || time<lastSkyDraw || !motionEnabled())) { context.clearRect(0,0,width,height); for (const star of stars) { const opacity=.12+(Math.sin(time*star.speed+star.phase)+1)*.12; context.fillStyle='rgba(215,215,212,'+opacity+')'; context.beginPath(); context.arc(star.x,star.y,star.radius,0,Math.PI*2); context.fill(); }lastSkyDraw=time; }
  renderer?.draw(time);
 }
 function clearIntroTimers() { clearTimeout(introTimer); clearTimeout(fadeTimer); introTimer = fadeTimer = 0; }
 function pauseAuto() {
  if (mode !== 'intro' || autoPaused) return;
  if (introTimer) introRemaining = Math.max(0,introRemaining-(performance.now()-introStarted));
  autoPaused = true; clearIntroTimers(); dialog.classList.remove('journey-leaving'); renderAuto();
 }
 function toggleAuto() { if (mode !== 'intro' || busy) return; if (!autoPaused) pauseAuto(); else { autoPaused=false; introRemaining=Math.max(1500,introRemaining); renderAuto(); scheduleIntro(); } }
 function fadeOut() { dialog.classList.add('journey-leaving'); fadeTimer=setTimeout(()=>{fadeTimer=0;dismiss();},motionEnabled()?520:0); }
 function scheduleIntro() {
  if (mode !== 'intro' || autoPaused || document.hidden || introTimer || fadeTimer) return;
  introStarted=performance.now(); introTimer=setTimeout(()=>{introTimer=0;if(mode==='intro')fadeOut();},Math.max(0,introRemaining));
 }
 function visibilityChanged() {
  if (!mode) return;
  if (document.hidden) { stopFrame(); if(introTimer){introRemaining=Math.max(0,introRemaining-(performance.now()-introStarted));clearTimeout(introTimer);introTimer=0;} if(fadeTimer){clearTimeout(fadeTimer);fadeTimer=0;introRemaining=0;dialog.classList.remove('journey-leaving');} }
  else { render(); scheduleIntro(); }
 }
 function handleKey(event) {
  if(event.key==='Escape'){event.preventDefault();dismiss();return;}
  if(event.key==='Tab'){
   pauseAuto(); const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')].filter(node=>node.getClientRects().length&&!node.closest('[hidden]'));
   if(!focusable.length){event.preventDefault();dialog.focus();return;}const first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
  }else if(event.key!=='Shift'&&!event.target.closest('.journey-pause-auto,.journey-language'))pauseAuto();
 }
 function open(nextMode) {
  if(destroyed)return false;
  close();ensureDOM();mode=nextMode;visibleCount=24;elapsed=0;lastSkyDraw=-Infinity;autoPaused=false;introRemaining=8000;busy=false;statusCode='';
  dialog.classList.remove('journey-leaving','journey-unlocked');dialog.classList.toggle('journey-intro',mode==='intro');dialog.classList.toggle('journey-map',mode!=='intro');
  previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  try{if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');}render();resize();refs.close.focus({preventScroll:true});scheduleIntro();document.dispatchEvent(new CustomEvent('interstellar-journey-visibility',{detail:{open:true,mode}}));return true;}
  catch{report(bi('星图暂时无法显示，可继续学习','The atlas is unavailable. You can continue learning.'));close();return false;}
 }
 async function performCheckIn() {
  if(busy||!mode)return;if(journeyView(read()).checkedIn){if(mode==='intro')dismiss();return;}
  pauseAuto();const session=epoch;busy=true;statusCode='';render();
  try{const result=checkInJourney(read());await setData(result.data);if(session!==epoch||!mode)return;busy=false;statusCode='saved';render();dialog.classList.add('journey-unlocked');
   if(mode==='intro'){if(!motionEnabled())dismiss();else fadeTimer=setTimeout(()=>{fadeTimer=0;fadeOut();},700);}
  }catch{if(session!==epoch||!mode)return;busy=false;statusCode='failed';render();}
 }
 function dismiss(){const wasIntro=mode==='intro';close();if(wasIntro){try{onEnter?.();}catch{}}}
 function close(){epoch++;pendingIntro=false;clearIntroTimers();stopFrame();busy=false;if(!mode)return;mode='';if(dialog?.open&&typeof dialog.close==='function')dialog.close();else dialog?.removeAttribute('open');document.body.style.overflow=previousOverflow||'';dialog?.classList.remove('journey-leaving');if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});previousFocus=null;document.dispatchEvent(new CustomEvent('interstellar-journey-visibility',{detail:{open:false,mode:''}}));}
 function mount(triggerElement){if(destroyed)return;ensureDOM();trigger?.removeEventListener('click',openMap);trigger=triggerElement||null;if(trigger){trigger.setAttribute('aria-haspopup','dialog');trigger.addEventListener('click',openMap);}}
 function openMap(){open('map');}
 function refresh(){if(mode)render();}
 async function maybeShowIntro(){
  if(destroyed||pendingIntro||mode)return false;const data=read(),today=localDayKey();if(data.lastIntroDay===today)return false;
  const session=epoch;pendingIntro=true;let saveFailed=false;try{await setData({...data,lastIntroDay:today});}catch{saveFailed=true;}
  if(session!==epoch||destroyed)return false;pendingIntro=false;const opened=open('intro');if(opened&&saveFailed){statusCode='intro-failed';render();}return opened;
 }
 function destroy(){close();destroyed=true;trigger?.removeEventListener('click',openMap);trigger=null;document.removeEventListener('visibilitychange',visibilityChanged);window.removeEventListener('resize',resize);motionQuery?.removeEventListener?.('change',updateMotion);resizeObserver?.disconnect();unsubscribeLanguage?.();renderer?.destroy();renderer=null;dialog?.remove();dialog=null;refs=null;}
 return {mount,refresh,maybeShowIntro,close,destroy};
}
