// Motion uses percentages of original speed; zero freezes that named effect.
// Density independently controls visible precipitation; zero hides that layer.
// Glass transparency is independent of the word/foreground opacity.
export const SCENERY_DEFAULTS = Object.freeze({
  glassTransparency:32, carousel:10, leaves:20, snow:25, snowDensity:65, rain:25, rainDensity:70,
  petals:25, stream:20, stars:30, meteors:25, drift:20
});

const CONTROLS = Object.freeze({
  glassTransparency:{zh:'磨砂组件透明度', en:'Glass transparency', max:80, step:1},
  carousel:{zh:'旋转木马转速', en:'Carousel rotation', max:100, step:10},
  leaves:{zh:'枝叶摇曳速度', en:'Leaf movement', max:100, step:10},
  snow:{zh:'雪花飘落速度', en:'Snowfall speed', max:100, step:1},
  snowDensity:{zh:'雪花密度', en:'Snow density', kind:'density', max:100, step:1},
  rain:{zh:'雨丝下落速度', en:'Rain streak speed', max:100, step:1},
  rainDensity:{zh:'雨丝密度', en:'Rain density', kind:'density', max:100, step:1},
  petals:{zh:'花瓣飘落速度', en:'Petal drift', max:100, step:1},
  stream:{zh:'溪流水纹速度', en:'Stream ripples', max:100, step:1},
  stars:{zh:'星光呼吸速度', en:'Star twinkle speed', max:100, step:1},
  meteors:{zh:'流星划过速度', en:'Meteor speed', max:100, step:1},
  drift:{zh:'氛围光缓移速度', en:'Ambient light drift', max:100, step:1}
});
const SKIN_CONTROLS = Object.freeze({
  star:['stars','meteors'],
  carousel:['carousel','snow','snowDensity','drift'],
  cathedral:['snow','snowDensity','drift'],
  sakura:['petals','stream','drift'],
  forest:['leaves','rain','rainDensity','drift']
});

export function normalizeSceneryOptions(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = {};
  for (const [key, fallback] of Object.entries(SCENERY_DEFAULTS)) {
    const value = Object.prototype.hasOwnProperty.call(source,key) ? source[key] : undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) { result[key]=fallback; continue; }
    const {max,step}=CONTROLS[key];
    const bounded=Math.max(0,Math.min(max,value));
    result[key]=step===10 && bounded>0 ? Math.max(10,Math.round(bounded/10)*10) : Math.round(bounded);
  }
  return result;
}

export function sceneryControls(skin) {
  const keys=Object.prototype.hasOwnProperty.call(SKIN_CONTROLS,skin) ? SKIN_CONTROLS[skin] : SKIN_CONTROLS.star;
  return ['glassTransparency',...keys].map(key=>({key,...CONTROLS[key]}));
}
