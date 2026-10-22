export const FEATURES = Object.freeze([
  ['map','Field map'],['routes','Routes and navigation'],['weather','Weather'],
  ['intake','Book inspection'],['forms','My forms'],['photos','Roof photos'],
  ['training','Training'],['coach','Personal Coach'],['shifts','Shifts'],
  ['messages','Messages'],['account','My account']
]);
export const FEATURE_ROLES = ['appointment_setter','salesperson'];
export function featureRole(role){return role==='canvasser'?'appointment_setter':role;}
export function featureAllowed(rows,role,key){
  if(['admin','manager','owner'].includes(role))return true;
  if(!FEATURES.some(([id])=>id===key))return false;
  const row=rows.find(row=>row.role===featureRole(role)&&row.feature===key);
  return row ? row.enabled===true : key!=='photos'||role==='salesperson';
}
export async function requireFeature(request,key,{env=process.env,fetchImpl=fetch}={}){
  const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const fail=(message,status)=>Object.assign(Error(message),{status,public:true});
  if(!token)throw fail('Sign in required.',401);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const apikey=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;
  const unavailable=()=>fail('Feature access could not be verified. Try again.',503);
  if(!base||!apikey)throw unavailable();
  let response;
  try{
    response=await fetchImpl(`${base}/rest/v1/rpc/feature_enabled`,{method:'POST',headers:{apikey,Authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({requested:key}),signal:AbortSignal.timeout(12000)});
  }catch{throw unavailable();}
  if(!response.ok)throw unavailable();
  let enabled;
  try{enabled=await response.json();}catch{throw unavailable();}
  if(typeof enabled!=='boolean')throw unavailable();
  if(!enabled)throw fail('Management has disabled this feature for your role.',403);
}
