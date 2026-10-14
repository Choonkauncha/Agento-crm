export function clampOrbPosition(x,y,width,height,size=82){
 const maxX=Math.max(8,width-size-8),maxY=Math.max(8,height-size-8);
 return {x:Math.max(8,Math.min(maxX,Number.isFinite(x)?x:maxX)),y:Math.max(8,Math.min(maxY,Number.isFinite(y)?y:maxY))};
}
export function mountOrbDragging(root,launcher,panel){
 const KEY='tn:assistant-orb-position';let pointer=null,origin=null,moved=false,saved=null;
 try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
 function alignPanel(){
  const box=launcher.getBoundingClientRect(),above=box.top-20,below=innerHeight-box.bottom-20;
  root.classList.toggle('orbPanelLeft',box.left<Math.min(330,innerWidth-28));
  root.classList.toggle('orbPanelBelow',below>above);
  if(panel)panel.style.maxHeight=Math.max(80,Math.max(above,below))+'px';
 }
 function position(x,y,persist=false){
  const size=launcher.getBoundingClientRect().width||82;
  const point=clampOrbPosition(x,y,innerWidth,innerHeight,size);
  root.style.left=point.x+'px';root.style.top=point.y+'px';root.style.right='auto';root.style.bottom='auto';
  root.classList.toggle('orbPanelLeft',point.x<Math.min(330,innerWidth-28));
  alignPanel();
  if(persist){saved={x:point.x/Math.max(1,innerWidth-size-8),y:point.y/Math.max(1,innerHeight-size-8)};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
 }
 function restore(){const size=launcher.getBoundingClientRect().width||82;if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))position(saved.x*(innerWidth-size-8),saved.y*(innerHeight-size-8));}
 const down=event=>{if(event.button!==0)return;pointer=event.pointerId;moved=false;const box=launcher.getBoundingClientRect();origin={x:event.clientX,y:event.clientY,left:box.left,top:box.top};launcher.setPointerCapture?.(pointer);};
 const move=event=>{if(pointer!==event.pointerId||!origin)return;const dx=event.clientX-origin.x,dy=event.clientY-origin.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){event.preventDefault();position(origin.left+dx,origin.top+dy);}};
 const up=event=>{if(pointer!==event.pointerId)return;if(moved){const rect=launcher.getBoundingClientRect();position(rect.left,rect.top,true);}launcher.releasePointerCapture?.(pointer);pointer=null;origin=null;};
 const click=event=>{alignPanel();if(moved){event.preventDefault();event.stopImmediatePropagation();moved=false;}};
 const key=event=>{const offsets={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(!event.shiftKey||!offsets[event.key])return;event.preventDefault();const rect=launcher.getBoundingClientRect(),[x,y]=offsets[event.key];position(rect.left+x,rect.top+y,true);};
 launcher.addEventListener('pointerdown',down);launcher.addEventListener('pointermove',move);launcher.addEventListener('pointerup',up);launcher.addEventListener('pointercancel',up);launcher.addEventListener('click',click,true);launcher.addEventListener('keydown',key);window.addEventListener('resize',restore);
 launcher.title='Drag to move. Click to open. Shift + arrow keys also move the orb.';
 restore();
 const cleanup=()=>{window.removeEventListener('resize',restore);launcher.removeEventListener('pointerdown',down);launcher.removeEventListener('pointermove',move);launcher.removeEventListener('pointerup',up);launcher.removeEventListener('pointercancel',up);launcher.removeEventListener('click',click,true);launcher.removeEventListener('keydown',key);};
 cleanup.reposition=alignPanel;return cleanup;
}
