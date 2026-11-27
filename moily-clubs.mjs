import {scheduleCard,goalCard} from './moily-components.mjs';
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
export function renderClubs(data,templates,state,redraw,create,update){
 if(state.selectedId&&!state.creating)return renderDetail(data,templates,state,redraw,update);
 if(state.creating)return renderCreate(templates,state,redraw,create);
 const root=el('section','moily-clubs-view');root.append(el('h2','moily-heading','내 동호회'));
 const filters=el('div','clubs-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','동호회 필터');
 for(const [key,label] of [['all','전체'],['favorite','즐겨찾기'],['archived','보관함']]){const b=el('button','moily-button',label);b.type='button';b.setAttribute('aria-pressed',String((state.filter||'all')===key));b.onclick=()=>{state.filter=key;redraw();};filters.append(b);}root.append(filters);
 if(data.errors?.clubs||!Array.isArray(data.clubs)){root.append(el('p','moily-caption',data.errors?.clubs?'동호회 조회 실패. 새로고침해 주세요.':'동호회 확인 중…'));return root;}
 const filter=state.filter||'all',clubs=data.clubs.filter(c=>!c.deletedAt&&(filter==='archived'?c.status==='archived':c.status==='active'&&(filter!=='favorite'||c.isFavorite))).sort((a,b)=>Number(!!b.isPrimary)-Number(!!a.isPrimary)||(a.sortOrder??0)-(b.sortOrder??0)||a.id.localeCompare(b.id));
 const count=(key,predicate)=>data.errors?.[key]||!Array.isArray(data[key])?'—':data[key].filter(x=>!x.deletedAt&&predicate(x)).length;
 if(!clubs.length)root.append(el('p','moily-panel',filter==='archived'?'보관한 동호회가 없어요.':filter==='favorite'?'즐겨찾기한 동호회가 없어요.':'아직 등록한 동호회가 없어요.'));
 for(const c of clubs){const primary=c.isPrimary&&filter!=='archived',card=el('article','moily-panel clubs-card'+(primary?' clubs-primary':''));const type=Object.hasOwn(templates,c.category)?templates[c.category].label:'기타';card.append(el('p','moily-caption',type+(primary?' · 대표 동호회':'')+(c.isFavorite?' · 즐겨찾기':'')),el('h3','moily-card-title',c.name));const planned=count('schedules',s=>s.clubId===c.id&&s.status==='planned');card.append(el('p',primary?'':'moily-caption','예정 '+planned+(primary?' · 활동 '+count('activities',s=>s.clubId===c.id)+' · 목표 '+count('goals',s=>s.clubId===c.id):'')));const open=el('button','moily-button moily-button--secondary','상세 보기');open.type='button';open.setAttribute('aria-label',c.name+' 상세 보기');open.onclick=()=>{location.hash='clubs/'+encodeURIComponent(c.id);};card.append(open);root.append(card);}
 const ids=new Set(clubs.map(c=>c.id)),upcoming=(data.errors?.schedules?[]:data.schedules||[]).filter(s=>!s.deletedAt&&s.status==='planned'&&ids.has(s.clubId)&&typeof s.startDate==='string'&&s.startDate>=new Date().toLocaleDateString('sv-SE')).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0];
 if(upcoming&&filter!=='archived'){const card=el('article','moily-panel');card.append(el('p','moily-caption',upcoming.startDate),el('h3','moily-card-title',upcoming.title),el('p','moily-caption',clubs.find(c=>c.id===upcoming.clubId)?.name||''),el('p','moily-caption','예정'));root.append(card);}
 const add=el('button','moily-button','동호회 추가');add.onclick=()=>{state.creating=true;redraw();};root.append(add);return root;
}

function renderCreate(templates,state,redraw,create){
 const root=el('section','moily-clubs-view'),form=el('form','clubs-create'),fields=el('fieldset','clubs-create-fields');
 const draft=state.draft??={id:crypto.randomUUID(),category:'hiking',name:'',description:'',color:templates.hiking.color,icon:templates.hiking.icon,activities:templates.hiking.activities.join(', ')};
 const back=el('button','moily-button','목록으로');back.type='button';back.disabled=!!state.busy;back.onclick=()=>{state.creating=false;state.draft=null;state.error='';redraw();};
 root.append(el('h2','moily-heading','새 동호회'),back);
 const hero=el('div','moily-panel clubs-primary');hero.append(el('h3','moily-card-title','우리의 첫 모임.'),el('p','','관심 활동을 선택하세요.'));root.append(hero);
 const panel=el('div','moily-panel'),choices=el('div','clubs-filters');panel.append(el('h3','moily-card-title','활동 템플릿'),choices);
 for(const [key,t] of Object.entries(templates)){const b=el('button','moily-button',t.label);b.type='button';b.setAttribute('aria-pressed',String(draft.category===key));b.onclick=()=>{Object.assign(draft,{category:key,color:t.color,icon:t.icon,activities:t.activities.join(', ')});redraw();};choices.append(b);}fields.append(panel);
 const identity=el('div','moily-panel');
 function field(parent,label,key,tag='input',type='text'){const l=el('label','clubs-field'),n=el(tag,'moily-input');l.append(el('span','moily-caption',label),n);if(tag==='input')n.type=type;n.value=draft[key];n.oninput=()=>{draft[key]=n.value;};parent.append(l);return n;}
 const name=field(identity,'동호회 이름 (필수)','name');name.required=true;name.maxLength=60;name.placeholder='우리 모임 이름';
 const desc=field(identity,'소개','description','textarea');desc.maxLength=300;desc.placeholder='함께하는 활동을 소개해 주세요';
 const color=field(identity,'대표 컬러','color','input','color');color.className='clubs-color';fields.append(identity);
 const detail=el('div','moily-panel');detail.append(el('h3','moily-card-title','활동 유형 및 아이콘 설정'));
 const types=field(detail,'활동 유형 (쉼표로 구분)','activities','textarea');types.required=true;
 const label=el('label','clubs-field'),icons=el('select','moily-input');label.append(el('span','moily-caption','아이콘'),icons);for(const t of Object.values(templates)){const o=el('option','',t.label);o.value=t.icon;icons.append(o);}icons.value=draft.icon;icons.onchange=()=>{draft.icon=icons.value;};detail.append(label);fields.append(detail);
 const submit=el('button','moily-button',state.busy?'저장 중…':'동호회 만들기');submit.type='submit';fields.append(submit);fields.disabled=!!state.busy;form.append(fields);
 const msg=el('p','moily-caption',state.error||'');msg.setAttribute('role','status');form.append(msg);
 form.onsubmit=async e=>{e.preventDefault();if(state.busy)return;const activities=draft.activities.split(',').map(x=>x.trim()).filter(Boolean);if(!draft.name.trim()||!activities.length||activities.length>20||activities.some(x=>x.length>40)||new Set(activities).size!==activities.length){msg.textContent='이름과 활동 유형을 확인해 주세요. 활동 유형은 중복 없이 1~20개, 각 40자 이하입니다.';return;}state.busy=true;state.error='';redraw();try{await create({...draft,activities});state.creating=false;state.draft=null;state.filter='all';}catch{state.error='저장하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.';}finally{state.busy=false;redraw();}};
 root.append(form);return root;
}

function renderDetail(data,templates,state,redraw,update){
 const root=el('section','moily-clubs-view');
 const back=el('a','moily-button moily-button--secondary','‹ 동호회 목록');back.href='#clubs';root.append(back);
 if(data.errors?.clubs||!Array.isArray(data.clubs)){root.append(el('p','moily-panel',data.errors?.clubs?'동호회 조회 실패':'동호회 확인 중…'));return root;}
 const c=data.clubs.find(x=>x.id===state.selectedId&&!x.deletedAt&&['active','archived'].includes(x.status));
 if(!c){root.append(el('p','moily-panel','동호회를 찾을 수 없어요.'));return root;}
 const hero=el('article','moily-panel moily-stack');hero.style.borderInlineStart='6px solid '+(/^#[0-9a-f]{6}$/i.test(c.color)?c.color:'#2F6B4F');
 const icons={mountain:'⛰️',footprints:'👟',bike:'🚲','circle-dot':'🎾',shapes:'◆'};
 hero.append(el('p','moily-caption',(templates[c.category]?.label||'기타')+' 동호회'),el('h2','moily-heading',(icons[c.icon]||'◆')+' '+c.name),el('p','',c.description||'우리의 모임 기록'));root.append(hero);
 if(c.status==='active'){
 const edit=el('button','moily-button moily-button--secondary','동호회 정보 수정');edit.type='button';edit.onclick=()=>{state.edit={id:c.id,name:c.name,description:c.description||'',color:c.color,icon:c.icon,version:c.version};state.editError='';redraw();};root.append(edit);
 if(state.edit?.id===c.id){root.append(renderEdit(state,templates,redraw,update));return root;}
 }
 const tabs=el('div','clubs-filters');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','동호회 상세 메뉴');
 const active=state.detailTab||'home';
 for(const [key,label] of [['home','홈'],['schedules','일정'],['activities','활동 기록'],['goals','목표']]){const b=el('button','moily-button',label);b.type='button';b.setAttribute('aria-pressed',String(active===key));b.onclick=()=>{state.detailTab=key;redraw();};tabs.append(b);}root.append(tabs);
 const today=new Date().toLocaleDateString('sv-SE');
 function section(key,label,empty,draw,filter=()=>true,limit=Infinity){
 const box=el('section','moily-stack');box.append(el('h3','moily-card-title',label));
 if(data.errors?.[key]||!Array.isArray(data[key]))box.append(el('p','moily-caption',data.errors?.[key]?'조회 실패. 새로고침해 주세요.':'확인 중…'));
 else{const rows=data[key].filter(x=>x.clubId===c.id&&!x.deletedAt&&filter(x));if(key==='schedules')rows.sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')));if(!rows.length)box.append(el('p','moily-panel',empty));else rows.slice(0,limit).forEach(x=>box.append(draw(x)));}root.append(box);}
 const schedule=s=>scheduleCard({date:s.startDate||'',title:s.title||'일정',subtitle:(data.activityTypes||[]).find(t=>t.clubId===c.id&&t.id===s.activityTypeId&&!t.deletedAt)?.name||'',status:({planned:'예정',completed:'완료',cancelled:'취소'})[s.status]||'미정'});
 const goal=g=>{if(Number.isFinite(g.currentValue)&&Number.isFinite(g.targetValue)&&g.targetValue>0)return goalCard({title:g.title,current:g.currentValue,target:g.targetValue});const card=el('article','moily-panel moily-stack');card.append(el('h4','moily-card-title',g.title||'목표'),el('p','moily-caption','목표 '+(g.targetValue??'—')+(g.unit||'')),el('p','moily-caption','진행률 연동 준비 중'));return card;};
 if(active==='home'||active==='schedules')section('schedules',active==='home'?'다가오는 일정':'일정','등록된 일정이 없어요.',schedule,active==='home'?s=>s.status==='planned'&&(s.endDate||s.startDate||'')>=today:()=>true,active==='home'?3:Infinity);
 if(active==='activities')section('activities','활동 기록','등록된 활동 기록이 없어요.',a=>{const card=el('article','moily-panel moily-stack');card.append(el('h4','moily-card-title',a.title||'활동 기록'),el('p','moily-caption',a.date||a.startDate||''));return card;});
 if(active==='home'||active==='goals')section('goals','목표','등록된 목표가 없어요.',goal);
 if(c.status==='active'&&(active==='home'||active==='schedules')){const add=el('button','moily-button','+ 일정 등록 (준비 중)');add.disabled=true;root.append(add);}
 return root;
}

function renderEdit(state,templates,redraw,update){
 const draft=state.edit,form=el('form','moily-panel moily-stack'),fields=el('fieldset','clubs-create-fields');
 function field(label,key,tag='input',type='text'){const l=el('label','clubs-field'),n=el(tag,'moily-input');if(tag==='input')n.type=type;n.value=draft[key];n.oninput=()=>{draft[key]=n.value;};l.append(el('span','moily-caption',label),n);fields.append(l);return n;}
 const name=field('동호회 이름 (필수)','name');name.required=true;name.maxLength=60;
 field('소개','description','textarea').maxLength=300;
 field('대표 색상','color','input','color');
 const l=el('label','clubs-field'),select=el('select','moily-input');for(const t of Object.values(templates)){const o=el('option','',t.label);o.value=t.icon;select.append(o);}select.value=draft.icon;select.onchange=()=>{draft.icon=select.value;};l.append(el('span','moily-caption','아이콘'),select);fields.append(l);
 const save=el('button','moily-button',state.editBusy?'저장 중…':'저장'),cancel=el('button','moily-button moily-button--secondary','취소');save.type='submit';cancel.type='button';cancel.onclick=()=>{state.edit=null;state.editError='';redraw();};fields.append(save,cancel);fields.disabled=!!state.editBusy;form.append(fields);
 const msg=el('p','moily-caption',state.editError||'');msg.setAttribute('role','status');form.append(msg);
 form.onsubmit=async e=>{e.preventDefault();if(state.editBusy)return;if(!draft.name.trim()){msg.textContent='동호회 이름을 입력해 주세요.';return;}state.editBusy=true;state.editError='';redraw();try{await update(draft.id,{...draft});state.edit=null;}catch{state.editError='저장 실패. 연결 상태 또는 다른 기기의 변경 사항을 확인해 주세요.';}finally{state.editBusy=false;redraw();}};
 return form;
}
