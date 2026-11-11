// Layered precipitation. Textures are prepared once; the animation loop only
// advances existing particles and composites small cached images.
const WEATHER_LIMITS = Object.freeze({
  snow:{cap:900,area:2000}, rain:{cap:1400,area:1200}
});
const fractional = value => value - Math.floor(value);

export function weatherParticleCount(kind,width,height,density=65) {
  const config=Object.prototype.hasOwnProperty.call(WEATHER_LIMITS,kind)?WEATHER_LIMITS[kind]:null;
  if (!config || !Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) return 0;
  const amount=Number.isFinite(density) ? Math.max(0,Math.min(100,density)) : 65;
  return Math.round(Math.min(config.cap,width*height/config.area)*amount/100);
}

export function createWeatherParticles(kind,width,height,random=Math.random,density=65) {
  const count=weatherParticleCount(kind,width,height,density);
  if (!count) return [];
  const offsetX=random(),offsetY=random();
  return Array.from({length:count},(_,index)=>{
    // A progressive distribution keeps every prefix spread across the screen;
    // a density slider can reveal more of this stable pool without reseeding it.
    const band=fractional(index*.61803398875+random()*.08);
    const layer=band<.48?0:band<.88?1:2;
    const depth=[.12,.38,.75][layer]+random()*[.21,.3,.23][layer];
    const snow=kind==='snow';
    const speed=snow ? 19+depth*48+random()*9 : 300+depth*610+random()*80;
    const size=snow ? ([.55,1.05,2.1][layer]+random()*[.45,.85,1.7][layer])*(layer===0?1.1:1) : [.55,.9,1.4][layer]+random()*[.3,.5,.7][layer];
    const phase=random()*Math.PI*2;
    return {
      kind,index,layer,depth,
      x:fractional(offsetX+index*.7548776662466927+(random()-.5)*.07)*width,
      y:fractional(offsetY+index*.5698402909980532+(random()-.5)*.07)*height,
      size,speed,phase,spin:random()*Math.PI*2,
      length:snow?0:([7,15,28][layer]+random()*[6,12,18][layer])*(layer===0?1:1.1),
      opacity:(snow ? .23+depth*.34 : .15+depth*.3)*(.8+random()*.2)*[1.15,1.08,1][layer],
      vx:snow ? 3+depth*3+(4+depth*9)*Math.sin(phase) : -speed*.095,
      vy:speed,
      sprite:Math.floor(random()*3)
    };
  });
}

function integratedSine(amplitude,frequency,phase,start,end) {
  return amplitude*(Math.cos(frequency*start+phase)-Math.cos(frequency*end+phase))/frequency;
}

export function advanceWeatherParticles(particles,seconds,width,height,elapsed) {
  const delta=Math.min(.08,Math.max(0,Number(seconds)||0));
  if (!delta || !Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) return particles;
  const end=Number.isFinite(elapsed)?elapsed:delta,start=end-delta;
  for (const point of particles) {
    if (point.kind==='rain') {
      const gust=point.speed*.026,frequency=.19;
      point.x+=-point.speed*.095*delta+integratedSine(gust,frequency,0,start,end);
      point.y+=point.speed*delta;
      point.vx=-point.speed*.095+gust*Math.sin(end*frequency);
      point.vy=point.speed;
    } else if (point.kind==='snow') {
      const sway=4+point.depth*9,frequency=.48+point.depth*.24;
      point.x+=(3+point.depth*3)*delta+integratedSine(sway,frequency,point.phase,start,end)+integratedSine(2.2,.13,0,start,end);
      point.y+=point.speed*delta+integratedSine(point.speed*.045,.36,point.phase,start,end);
      point.vx=3+point.depth*3+sway*Math.sin(end*frequency+point.phase)+2.2*Math.sin(end*.13);
      point.vy=point.speed*(1+.045*Math.sin(end*.36+point.phase));
    } else continue;
    // Wrap entirely outside the visible frame; rain's whole tail disappears
    // before reuse. Carry overshoot so lower frame rates do not change spacing.
    const margin=Math.max(24,point.length+8);
    if (point.y>height+margin || point.y<-margin) point.y=fractional((point.y+margin)/(height+2*margin))*(height+2*margin)-margin;
    if (point.x>width+margin || point.x<-margin) point.x=fractional((point.x+margin)/(width+2*margin))*(width+2*margin)-margin;
  }
  return particles;
}

function makeWeatherSprite(doc,kind,soft,variant=0) {
  const sprite=doc.createElement('canvas');
  sprite.width=kind==='snow'?32:16;sprite.height=kind==='snow'?32:96;
  const context=sprite.getContext('2d');
  if (!context) return null;
  const pixels=context.createImageData(sprite.width,sprite.height);
  for(let y=0;y<sprite.height;y++)for(let x=0;x<sprite.width;x++){
    let alpha;
    const u=(x+.5)/sprite.width*2-1,v=(y+.5)/sprite.height*2-1;
    if(kind==='snow'){
      const angle=Math.atan2(v,u),edge=1+.09*Math.sin(angle*5+variant*1.8)+.045*Math.cos(angle*3-variant);
      const radius=Math.hypot(u*(1+variant*.045),v)/edge;
      // Distant flakes are tiny irregular flecks. Nearby flakes are soft
      // camera defocus, not large luminous discs or six-point icon shapes.
      alpha=soft ? Math.exp(-radius*radius*4.4)*Math.max(0,1-radius*radius) : Math.pow(Math.max(0,1-radius*radius),1.15);
    }else{
      const t=(y+.5)/sprite.height;
      const profile=Math.pow(Math.sin(Math.PI*t),.65)*(.2+.8*t);
      const spread=(soft?.62:.33)*(.3+.7*Math.sin(Math.PI*t));
      alpha=Math.exp(-u*u/(spread*spread))*profile;
    }
    const offset=(y*sprite.width+x)*4;
    pixels.data[offset]=kind==='snow'?239:203;
    pixels.data[offset+1]=kind==='snow'?244:220;
    pixels.data[offset+2]=kind==='snow'?249:232;
    pixels.data[offset+3]=Math.round(Math.max(0,Math.min(1,alpha))*255);
  }
  context.putImageData(pixels,0,0);
  return sprite;
}

export function createWeatherPainter(doc) {
  const snow=[0,1,2].map(variant=>makeWeatherSprite(doc,'snow',false,variant));
  const softSnow=[0,1,2].map(variant=>makeWeatherSprite(doc,'snow',true,variant));
  const rain=makeWeatherSprite(doc,'rain',false),softRain=makeWeatherSprite(doc,'rain',true);
  let destroyed=false;
  function draw(context,particles,elapsed=0,options={}) {
    if(destroyed || !context) return;
    const time=Number.isFinite(elapsed)?elapsed:0;
    const settings=options && typeof options==='object' && !Array.isArray(options)?options:{};
    const opacity=Number.isFinite(settings.opacity)?Math.max(0,Math.min(1,settings.opacity)):1;
    const region=settings.avoid;
    const avoid=region && typeof region==='object' && ['x','y','rx','ry'].every(key=>Number.isFinite(region[key])) && region.rx>0 && region.ry>0 ? region : null;
    context.save();
    for(const point of particles){
      let visibility=opacity;
      if(avoid){
        const distance=Math.hypot((point.x-avoid.x)/avoid.rx,(point.y-avoid.y)/avoid.ry);
        const blend=Math.max(0,Math.min(1,(distance-.7)/.6));
        // A quiet center protects the word. A broad smooth transition avoids
        // an obvious hole or particles suddenly vanishing at a panel edge.
        visibility*=.06+.94*blend*blend*(3-2*blend);
      }
      if(point.kind==='snow'){
        const source=(point.layer===2?softSnow:snow)[point.sprite%3];
        if(!source)continue;
        const size=point.size*2.6;
        // Very gentle changes in focus/illumination, without blinking on/off.
        context.globalAlpha=point.opacity*(.93+.07*Math.sin(time*.21+point.phase))*visibility;
        context.drawImage(source,point.x-size/2,point.y-size/2,size,size);
      }else if(point.kind==='rain'){
        const source=point.layer===2?softRain:rain;
        if(!source)continue;
        context.save();context.translate(point.x,point.y);
        // Local +Y follows the falling velocity. The tail extends backwards
        // from the drop head; negative wind never makes rain point uphill.
        context.rotate(-Math.atan2(point.vx,point.vy));
        context.globalAlpha=point.opacity*visibility;
        const width=point.size*(point.layer===2?3.3:2.4);
        context.drawImage(source,-width/2,-point.length,width,point.length);
        context.restore();
      }
    }
    context.restore();
  }
  function destroy(){destroyed=true;for(const sprite of [...snow,...softSnow,rain,softRain])if(sprite){sprite.width=0;sprite.height=0;}}
  return {draw,destroy};
}
