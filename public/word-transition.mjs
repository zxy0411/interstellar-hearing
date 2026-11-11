export function createWordTransition(stage,{enabled=()=>true}={}){
 let active=null,generation=0;
 function clear(){
  stage.classList.remove('word-arriving','word-leaving');
  stage.style.removeProperty('opacity');
 }
 function cancel(){
  generation++;
  const previous=active;active=null;
  previous?.cancel();clear();
 }
 async function transition(arriving){
  // Every new transition supersedes its predecessor. A late finish from the
  // previous word must never hide the current word or cancel its animation.
  cancel();
  if(!enabled()||typeof stage.animate!=='function')return false;
  const token=generation;let animation;
  stage.classList.add(arriving?'word-arriving':'word-leaving');
  try{
   // Only opacity is animated on the whole stage. The small text glow lives in
   // CSS; avoid repainting a blurred player-sized surface on every frame.
   const frames=arriving
    ?[{opacity:0,offset:0},{opacity:.84,offset:.55},{opacity:1,offset:1}]
    :[{opacity:1,offset:0},{opacity:.7,offset:.35},{opacity:0,offset:1}];
   animation=stage.animate(frames,{duration:arriving?420:190,easing:'cubic-bezier(.25,.46,.45,.94)',fill:'forwards'});
   active=animation;await animation.finished;
   if(token!==generation||active!==animation)return false;
   if(!enabled()){clear();return false;}
   if(!arriving)stage.style.opacity='0';
   return true;
  }catch{
   if(token===generation)clear();
   return false;
  }finally{
   if(token===generation){
    active=null;animation?.cancel();
    stage.classList.remove('word-arriving','word-leaving');
    if(arriving)stage.style.removeProperty('opacity');
   }
  }
 }
 return {cancel,leave:()=>transition(false),enter:()=>transition(true)};
}
