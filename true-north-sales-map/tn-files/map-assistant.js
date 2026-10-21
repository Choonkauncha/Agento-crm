import {createLiveCoach} from './live-coach.js';
import {mountOrbDragging} from './orb-position.js';
import {mountCoachOrb} from './coach-orb.js';
import {createAssistantCommandRunner,commandResultText} from '../lib/assistant-command.js';
let active=null;
export function mountMapAssistant(ctx={}){
 active?.dispose();
 const root=document.createElement('aside');root.id='tnMapAssistant';root.className='mapAssistant';root.setAttribute('aria-label','True North voice assistant');
 root.innerHTML=`<section class="mapAssistantPanel" hidden aria-label="Field assistant controls"><header><div><span class="mapAssistantEyebrow">TRUE NORTH</span><b>Field assistant</b></div><button type="button" data-close aria-label="Minimize assistant">×</button></header><div class="mapAssistantPresence"><i aria-hidden="true"></i><span data-status role="status">Ready when you are.</span></div><p>Tell me what you need. I can build your route, manage stops, and check storms.</p><div class="mapAssistantActions"><button type="button" data-start>Start voice</button><button type="button" data-pause hidden>Pause mic</button><button type="button" data-end hidden>End voice</button></div><p class="mapAssistantEyebrow">ROUTE ACTIONS</p><div class="mapAssistantCommands"><button type="button" data-command="build_route">Build route</button><button type="button" data-command="build_timed_route">Plan 2 hours</button><button type="button" data-command="select_visible_addresses">Select houses</button><button type="button" data-command="clear_route">Clear route</button></div><div data-result class="mapAssistantResult" role="status" aria-live="polite" hidden></div><p data-caption class="mapAssistantCaption" hidden></p><p class="mapAssistantDisclosure">Voice uses Google Gemini while active. Drag the orb to move it.</p></section><button class="mapAssistantLauncher tnCoachOrbStage" type="button" aria-label="Open field assistant" aria-expanded="false" data-voice-state="idle"><canvas aria-hidden="true"></canvas><span class="mapAssistantOrbFallback" aria-hidden="true">◉</span><span class="mapAssistantLiveDot" aria-hidden="true"></span></button>`;
 document.body.append(root);
 let css=document.querySelector('[data-map-assistant-css]');if(!css){css=document.createElement('link');css.rel='stylesheet';css.href='/tn-files/map-assistant.css';css.dataset.mapAssistantCss='1';document.head.append(css);}
 const panel=root.querySelector('section'),launch=root.querySelector('.mapAssistantLauncher'),status=root.querySelector('[data-status]'),start=root.querySelector('[data-start]'),pause=root.querySelector('[data-pause]'),end=root.querySelector('[data-end]');
 const identity=ctx.rep?.user_id||null;let voiceState='idle',paused=false,disposed=false;const controller=new AbortController();
 const orb=mountCoachOrb(root.querySelector('canvas'));
 const disposeDragging=mountOrbDragging(root,launch,panel);
 function show(open){panel.hidden=!open;disposeDragging.reposition();launch.setAttribute('aria-expanded',String(open));if(open)refreshContext();}
 function voiceStatus(){status.textContent=({idle:'Ready when you are.',connecting:'Connecting voice…',listening:'Listening. Speak naturally.',speaking:'Speaking. You can interrupt.',paused:'Microphone paused.',error:'Voice unavailable. Try again.'})[voiceState]||voiceState;}
 async function refreshContext(){
  if(!ctx.getMapContext)return;
  try{const context=await ctx.getMapContext();if(disposed)return;panel.dataset.mapReady=String(context.mapOpen!==false&&context.ready!==false);}catch{}
 }
 const run=createAssistantCommandRunner({
  isCurrent:()=>!disposed&&!controller.signal.aborted,
  getContext:()=>ctx.getMapContext(),
  async authorize(call,{signal}){
   const session=await ctx.sb.auth.getSession();
   if(!session.data?.session||session.data.session.user.id!==identity)throw Error('Account changed. Restart the assistant.');
   const response=await fetch('/api/coach',{method:'POST',headers:{authorization:`Bearer ${session.data.session.access_token}`,'content-type':'application/json'},body:JSON.stringify({workspace:'map',toolCall:call}),signal:AbortSignal.any([controller.signal,...(signal?[signal]:[]),AbortSignal.timeout(20000)])});
   const data=await response.json();
   const current=await ctx.sb.auth.getSession();
   if(current.data?.session?.user?.id!==identity)throw Error('Account changed.');
   if(!response.ok)throw Error(data.error||'Command denied.');
   if(data.authorized&&data.actorId!==identity)throw Error('Command authorization failed.');
   return data;
  },
  execute:(name,args)=>ctx.executeMapAction(name,args),
  onStart(call){root.dataset.commandBusy='true';orb.setState('working');status.textContent=call.name==='clear_route'?'Clearing route…':call.name.startsWith('build_')?'Building your route…':'Working…';root.querySelectorAll('[data-command]').forEach(button=>button.disabled=true);},
  onResult(call,result){
   if(disposed)return;delete root.dataset.commandBusy;orb.setState(voiceState);voiceStatus();root.querySelectorAll('[data-command]').forEach(button=>button.disabled=!identity||controller.signal.aborted);
   const node=root.querySelector('[data-result]');node.hidden=false;node.dataset.result=result.error?'error':'success';node.textContent=commandResultText(result);
   if(call.name==='recent_ohio_storms'&&Array.isArray(result.reports)){for(const report of result.reports.slice(0,6)){const row=document.createElement('p'),link=document.createElement('a');try{const source=new URL(report.source);if(source.protocol!=='https:')continue;link.href=source.href;}catch{continue;}link.target='_blank';link.rel='noopener';link.textContent=`${report.county||'Ohio'} · ${report.kind} · ${new Date(report.capturedAt).toLocaleString()}`;row.append(link);node.append(row);}}
   if(result.error)show(true);else refreshContext();
  }
 });
 const voice=createLiveCoach(ctx,{workspace:'map',executeMapTool:run,
  onState(value){voiceState=value;if(!root.dataset.commandBusy){orb.setState(value);voiceStatus();}const live=!['idle','error'].includes(value);start.hidden=live;pause.hidden=!live;end.hidden=!live;launch.setAttribute('aria-label',live?'Voice assistant active. Open controls.':'Open field assistant');},
  onTranscript(row){if(!row.text)return;const caption=root.querySelector('[data-caption]');caption.hidden=false;caption.textContent=(row.role==='user'?'You: ':'Assistant: ')+row.text.slice(-240);},
  onAudioLevel:levels=>orb.setLevels(levels),
  onError(error){status.textContent=error.message||String(error);show(true);}
 });
 launch.onclick=()=>show(panel.hidden);root.querySelector('[data-close]').onclick=()=>show(false);
 root.querySelectorAll('[data-command]').forEach(button=>{button.disabled=!identity;button.onclick=()=>run({name:button.dataset.command,args:button.dataset.command==='build_timed_route'?{minutes:120}:{}}).catch(()=>{});});
 if(!ctx.sb||!identity){start.disabled=true;start.textContent='Sign in to use voice';status.textContent='Sign in to access your field assistant.';}
 start.onclick=async()=>{if(!ctx.sb||!identity)return;start.disabled=true;paused=false;pause.textContent='Pause mic';try{await voice.start();}finally{if(!disposed)start.disabled=false;}};
 end.onclick=()=>{voice.stop();paused=false;pause.textContent='Pause mic';};
 pause.onclick=()=>{paused=!paused;if(paused)voice.pause();else voice.resume();pause.textContent=paused?'Resume mic':'Pause mic';};
 const completed=event=>{if(disposed)return;const node=root.querySelector('[data-result]');node.hidden=false;node.textContent=commandResultText(event.detail);show(true);};document.addEventListener('tn-assistant-command-result',completed);
 const auth=ctx.sb?.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session?.user?.id&&session.user.id!==identity))dispose();})?.data?.subscription;
 const feature=event=>{if(event.detail?.coach===false||event.detail?.map===false){voice.stop();controller.abort();root.querySelectorAll('[data-command]').forEach(button=>button.disabled=true);}else if(event.detail?.coach===true&&controller.signal.aborted&&!disposed){mountMapAssistant(ctx);}};document.addEventListener('tn-feature-access',feature);
 function dispose(){if(disposed)return;disposed=true;controller.abort();voice.stop();disposeDragging();orb.dispose();auth?.unsubscribe();document.removeEventListener('tn-feature-access',feature);document.removeEventListener('tn-assistant-command-result',completed);root.remove();}
 active={dispose};return active;
}
