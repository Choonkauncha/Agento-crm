import { activateAdminTab } from '../lib/admin-tabs.js';
import { cleanGroupMeUrl } from '../lib/scheduling.js';
export function mountSchedulingAdmin(sb, me) {
  if (me.role !== 'admin' || document.getElementById('tab-scheduling')) return;
  const rail=document.querySelector('#app .rail'),main=document.querySelector('#app .dashMain');
  if(!rail||!main)return;
  const button=document.createElement('button');button.type='button';button.dataset.tab='scheduling';button.dataset.tnTabBound='1';button.textContent='Scheduling settings';rail.append(button);
  const section=document.createElement('section');section.id='tab-scheduling';section.className='hidden';
  section.innerHTML=`<div class="dashTitle"><div><h1>Scheduling settings</h1><p>Choose the GroupMe chat the team uses to arrange inspections.</p></div></div><div class="card pad"><form id="schedulingSettingsForm"><div class="field"><label for="groupmeUrl">Team GroupMe link</label><input id="groupmeUrl" type="url" maxlength="1000" placeholder="https://groupme.com/join_group/…"><p>Paste a GroupMe group invitation or web chat link. Leave blank to disable GroupMe scheduling. Only admins can change this link.</p></div><button class="btn primary" type="submit" disabled>Save GroupMe link</button><p role="status" id="schedulingNotice"></p><button class="btn" type="button" id="schedulingRetry" hidden>Retry loading settings</button></form><p>Alerts: management receives inspection updates; setters receive updates for inspections they booked; sales reps receive updates for inspections assigned to them. Messages stay within the employee’s conversation with management.</p><p>To enable browser notifications, open Messages → Turn on alerts. Keep the app running to receive updates.</p></div>`;
  main.append(section);
  const input=section.querySelector('input'),save=section.querySelector('[type=submit]'),notice=section.querySelector('#schedulingNotice');
  const retry=section.querySelector('#schedulingRetry');
  let loading=false;
  async function load(){
    if(loading)return;
    loading=true;save.disabled=true;input.disabled=true;retry.hidden=true;notice.textContent='Loading…';
    try {
      const {data,error}=await sb.from('field_settings').select('groupme_url').eq('id','team').maybeSingle();
      if(error)throw error;
      input.value=data?.groupme_url||'';notice.textContent='';save.disabled=false;input.disabled=false;
    }catch(error){notice.textContent='Could not load scheduling settings. '+error.message;retry.hidden=false;}
    finally{loading=false;}
  }
  button.onclick=()=>{activateAdminTab(document, 'scheduling');load();};
  retry.onclick=load;
  section.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(save.disabled)return;
    try{const url=cleanGroupMeUrl(input.value);save.disabled=true;
      const {error}=await sb.from('field_settings').upsert({id:'team',groupme_url:url},{onConflict:'id'});if(error)throw error;
      input.value=url;notice.textContent=url?'GroupMe link saved for the team.':'GroupMe scheduling disabled.';
    }catch(error){notice.textContent=error.message;}finally{save.disabled=false;}
  };
}
