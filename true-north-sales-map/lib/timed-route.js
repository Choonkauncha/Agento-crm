import { haversineMiles } from './storm-maps.js';
export function planTimedRoute(leads,{minutes=120,stopMinutes=5,mode='driving',start,limit=80}={}){
  if(!Number.isFinite(minutes)||minutes<15||minutes>480)throw Error('Choose a route between 15 minutes and 8 hours.');
  if(!Number.isFinite(stopMinutes)||stopMinutes<1||stopMinutes>60)throw Error('Choose 1–60 minutes per house.');
  const remaining=[...new Map((leads||[]).filter(l=>l?.id&&l.lat!=null&&l.lng!=null&&l.lat!==''&&l.lng!==''&&Number.isFinite(Number(l.lat))&&Number.isFinite(Number(l.lng))).map(l=>[l.id,l])).values()];
  const available=remaining.length,stops=[];let travelMinutes=0;
  let here=start||remaining[0];const speed=mode==='walking'?3:25;
  while(remaining.length&&stops.length<limit){
    let best=0,distance=Infinity;
    remaining.forEach((l,i)=>{const d=haversineMiles(Number(here.lat),Number(here.lng),Number(l.lat),Number(l.lng));if(d<distance){distance=d;best=i;}});
    const leg=distance*1.35/speed*60;
    if(stops.length&&travelMinutes+leg+(stops.length+1)*stopMinutes>minutes)break;
    here=remaining.splice(best,1)[0];stops.push(here);travelMinutes+=leg;
  }
  return {stops,travelMinutes,stopMinutes,available};
}
