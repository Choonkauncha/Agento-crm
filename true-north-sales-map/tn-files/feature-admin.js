import { activateAdminTab } from '../lib/admin-tabs.js';
import {FEATURES,FEATURE_ROLES,featureAllowed} from '../lib/features.js';
export function mountFeatureAdmin(sb,me){
  if(me.role!=='admin')return;
  const rail=document.querySelector('#app .rail'),main=document.querySelector('#app .dashMain');
  if(!rail||!main||document.getElementById('tab-features'))return;
  const button=document.createElement('button');button.type='button';button.dataset.tab='features';button.textContent='Feature access';rail.append(button);
  const section=document.createElement('section');section.id='tab-features';section.className='hidden';
  section.innerHTML='<h1>Feature access</h1><p>Turn field features on or off for each role. Management keeps access. Changes apply when team members refresh or return to the app.</p><p id="featureNotice" role="status"></p><button type="button" class="btn" id="featureRetry" hidden>Retry loading permissions</button><div id="featureControls"></div>';main.append(section);
  button.dataset.tnTabBound='1';button.onclick=()=>{
    activateAdminTab(document, 'features');load();};
  const retry=section.querySelector('#featureRetry');retry.onclick=load;
  let loading=false;
  async function load(){
    if(loading)return;
    loading=true;retry.hidden=true;
    const notice=section.querySelector('#featureNotice'),root=section.querySelector('#featureControls');
    notice.textContent='Loading permissions…';root.replaceChildren();
    let data;
    try {
      const result=await sb.from('feature_permissions').select('*');
      if(result.error)throw result.error;
      data=result.data;
    }catch(error){
      notice.textContent=['42P01','PGRST205'].includes(error.code)?'Feature permissions are not installed yet. Run supabase/migrations/20261009_feature_permissions.sql in the Supabase SQL editor before using these switches.':'Could not load feature permissions. '+error.message;
      retry.hidden=false;return;
    }finally{loading=false;}
    notice.textContent='';root.innerHTML='<table class="featureMatrix"><thead><tr><th>Feature</th><th>Appointment setters</th><th>Sales reps</th></tr></thead><tbody>'+FEATURES.map(([key,label])=>`<tr><th scope="row">${label}</th>${FEATURE_ROLES.map(role=>`<td><label><input type="checkbox" role="switch" data-feature="${key}" data-role="${role}" aria-label="${label} for ${role==='salesperson'?'sales reps':'appointment setters'}" ${featureAllowed(data,role,key)?'checked':''}><span> ${featureAllowed(data,role,key)?'On':'Off'}</span></label></td>`).join('')}</tr>`).join('')+'</tbody></table>';
    root.querySelectorAll('input').forEach(input=>input.onchange=async()=>{
      const wanted=input.checked;input.disabled=true;notice.textContent='Saving…';
      try {
        const {error}=await sb.from('feature_permissions').upsert({role:input.dataset.role,feature:input.dataset.feature,enabled:wanted},{onConflict:'role,feature'});
        if(error)throw error;
        input.nextElementSibling.textContent=wanted?' On':' Off';notice.textContent='Saved. Protected data access updates immediately.';
      }catch(error){input.checked=!wanted;notice.textContent='Could not save: '+error.message;}
      finally{input.disabled=false;}

    });
  }
}
