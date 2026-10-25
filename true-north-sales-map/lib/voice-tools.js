import {validateRouteStops} from './voice-actions.js';
export const ROUTE_TOOL = {name:'draft_route',description:'Collect one or more street addresses into a proposed route. This is a draft only. Ask the user to confirm before executing it.',parameters:{type:'OBJECT',properties:{addresses:{type:'ARRAY',items:{type:'STRING'},description:'Complete street addresses, including city and state when known'}},required:['addresses']}};
export const PROFILE_TOOL = {name:'inspect_team_profile',description:'Admin only: inspect one non-admin team member profile by its UUID. Never disclose other profiles to appointment setters.',parameters:{type:'OBJECT',properties:{user_id:{type:'STRING'}},required:['user_id']}};
export function toolDefinitions(role,{map=false}={}){if(map)return [{functionDeclarations:MAP_TOOLS}];return [{functionDeclarations:role==='admin'?[ROUTE_TOOL,PROFILE_TOOL]:[ROUTE_TOOL]}];}
export function normalizeToolCall(call){if(call?.name==='draft_route')return {action:'route.build',addresses:validateRouteStops(call.args?.addresses)};if(call?.name==='inspect_team_profile')return {action:'profile.read',targetUserId:call.args?.user_id};throw new Error('Voice tool is not allowed.');}

export const MAP_TOOLS=[
 {name:'get_live_context',description:'Read fresh personal work context and the current map, selected addresses and built route. Call before answering questions about the user or current route.',parameters:{type:'OBJECT',properties:{}}},
 {name:'build_route',description:'Actually build and optimize the selected houses. With no selection, choose nearby mapped houses from the current filters (default 20). Use this for build my route without a time budget. Never say it is built before the result.',parameters:{type:'OBJECT',properties:{count:{type:'NUMBER',description:'Optional maximum houses, integer 1–80'},mode:{type:'STRING',enum:['driving','walking']}}}},
 {name:'clear_route',description:'Clear the current route and selected houses when the user explicitly asks to clear/reset the route. Ends active navigation. Does not delete addresses or employee saved routes.',parameters:{type:'OBJECT',properties:{}}},
 {name:'build_timed_route',description:'Build a route approximately matching total work time (travel plus visits). Uses selected homes, otherwise filtered map homes. Replaces the route only when not navigating. Default five minutes per house. Report actual returned estimate, never guarantee exact duration.',parameters:{type:'OBJECT',properties:{minutes:{type:'NUMBER',description:'Total work minutes, 15–480'},stop_minutes:{type:'NUMBER',description:'Minutes at each house, 1–60, default 5'},mode:{type:'STRING',enum:['driving','walking']}},required:['minutes']}},
 {name:'remove_route_stop',description:'Remove a specific address or stop ID from the current route, including during navigation. Read live context to find the exact address first.',parameters:{type:'OBJECT',properties:{stop:{type:'STRING'}},required:['stop']}},
 {name:'route_navigation',description:'Start, pause, resume or end in-app route navigation when asked.',parameters:{type:'OBJECT',properties:{action:{type:'STRING',enum:['start','pause','resume','end']}},required:['action']}},
 {name:'select_visible_addresses',description:'Add all mapped addresses matching the current map filters to the route, up to its capacity.',parameters:{type:'OBJECT',properties:{}}},
 {name:'recent_ohio_storms',description:'Fetch recent NOAA storm reports across Ohio and active warnings. Use this for recent storm questions. Reports are preliminary and do not prove damage to any roof.',parameters:{type:'OBJECT',properties:{days:{type:'NUMBER',description:'Report days to check, 1–7, default 3'}}}},
 {name:'generate_margin_guarded_estimate',description:'Generate a 35%-gross-margin-guarded Good/Better/Best IKO roof proposal and 1099 rep commission split for a property roof area in sq ft.',parameters:{type:'OBJECT',properties:{property:{type:'STRING'},area:{type:'NUMBER',description:'Roof area in sq ft, 600–25000'},wastePct:{type:'NUMBER',description:'Waste percentage, 5–30, default 12'}},required:['area']}}
];
export function validateMapTool(call){
 const name=call?.name,args=call?.args||{};
 if(typeof args!=='object'||Array.isArray(args))throw Error('Command arguments must be an object.');
 if(!MAP_TOOLS.some(tool=>tool.name===name))throw Error('Map command is not allowed.');
 if(name==='build_route'){
  if(args.count!==undefined&&(!Number.isInteger(args.count)||args.count<1||args.count>80))throw Error('Choose between 1 and 80 houses.');
  if(args.mode!==undefined&&!['driving','walking'].includes(args.mode))throw Error('Invalid travel mode.');
  return {name,args:{...(args.count===undefined?{}:{count:args.count}),...(args.mode===undefined?{}:{mode:args.mode})}};
 }
 if(name==='build_timed_route'){
  if(typeof args.minutes!=='number'||!Number.isFinite(args.minutes)||args.minutes<15||args.minutes>480)throw Error('Route minutes must be 15–480.');
  const stop_minutes=args.stop_minutes??5;
  if(typeof stop_minutes!=='number'||!Number.isFinite(stop_minutes)||stop_minutes<1||stop_minutes>60)throw Error('Visit minutes must be 1–60.');
  if(args.mode&&!['driving','walking'].includes(args.mode))throw Error('Invalid travel mode.');
  return {name,args:{minutes:args.minutes,stop_minutes,mode:args.mode}};
 }
 if(name==='remove_route_stop'){
  if(typeof args.stop!=='string'||!args.stop.trim()||args.stop.length>240)throw Error('An exact route address or stop ID is required.');
  return {name,args:{stop:args.stop.trim()}};
 }
 if(name==='route_navigation'){
  if(!['start','pause','resume','end'].includes(args.action))throw Error('Invalid navigation action.');
  return {name,args:{action:args.action}};
 }
 if(name==='generate_margin_guarded_estimate'){
  const area=Number(args.area??2500);if(!Number.isFinite(area)||area<600||area>25000)throw Error('Roof area must be 600–25000 sq ft.');
  const wastePct=Number(args.wastePct??12);if(!Number.isFinite(wastePct)||wastePct<5||wastePct>30)throw Error('Waste percentage must be 5–30.');
  const targetMarginPct=Math.min(65,Math.max(30,Number(args.targetMarginPct??35)||35));
  return {name,args:{property:typeof args.property==='string'&&args.property.trim()?args.property.trim():'513 South McKenzie St, Mount Vernon, OH 43050',area,wastePct,targetMarginPct}};
 }
 if(name==='recent_ohio_storms'){
  const days=args.days??3;if(!Number.isInteger(days)||days<1||days>7)throw Error('Storm days must be 1–7.');
  return {name,args:{days}};
 }
 return {name,args:{}};
}
