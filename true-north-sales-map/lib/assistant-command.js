import {validateMapTool} from './voice-tools.js';

/** One shared execution lane for voice and buttons, with a fresh server check per command. */
export function createAssistantCommandRunner({authorize,execute,getContext,isCurrent=()=>true,onStart=()=>{},onResult=()=>{}}){
 let queue=Promise.resolve();
 return function run(raw,{signal}={}){
  const call=validateMapTool(raw);
  const assertCurrent=()=>{if(signal?.aborted||!isCurrent())throw Error('Command cancelled. Restart the assistant.');};
  const operation=queue.then(async()=>{
   assertCurrent();onStart(call);
   try{
    const authorization=await authorize(call,{signal});assertCurrent();
    let result;
    if(call.name==='get_live_context')result={...authorization,map:await getContext()};
    else if(call.name==='recent_ohio_storms')result=authorization;
    else {
     if(!authorization.authorized||!authorization.execute)throw Error('Command authorization failed.');
     const approved=validateMapTool(authorization.execute);
     if(approved.name!==call.name)throw Error('The authorized command did not match the request.');
     result=await execute(approved.name,approved.args);
     if(!result||typeof result.status!=='string')throw Error('The app did not confirm the command result.');
    }
    assertCurrent();onResult(call,result);return result;
   }catch(error){onResult(call,{error:error.message||'Command failed.',executed:false});throw error;}
  });
  queue=operation.catch(()=>{});return operation;
 };
}
export function commandResultText(result){
 if(result?.error)return result.error;
 if(result?.status==='opening_map')return 'Opening the field map to finish your command…';
 if(result?.status==='built')return `${result.stops} houses · ${result.estimatedMinutes?`about ${result.estimatedMinutes} minutes including visits`:'route built'}.${result.approximate?' Estimate only; review before navigating.':''}`;
 if(result?.status==='cleared')return `Route cleared. ${result.removed} selected houses removed.`;
 if(result?.status==='selected')return `${result.selectedCount} houses selected. Ready to build.`;
 if(result?.status==='removed')return `Stop removed. ${result.remaining} houses remain.`;
 if(result?.status==='not_started')return 'Navigation could not start. Check location access.';
 if(result?.status)return `Navigation ${result.status}.`;
 if(result?.map)return `${result.map.selectedCount||0} houses selected · ${result.map.route?.length||0} built stops.`;
 if(Number.isFinite(result?.reportCount))return `${result.reportCount} recent Ohio storm reports${result.partial?' · some sources unavailable':''}.`;
 return 'Command completed.';
}
