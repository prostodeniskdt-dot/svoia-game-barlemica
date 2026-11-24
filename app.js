(() => {
'use strict';
const D=window.BARLEMICA_GAME, KEY='barlemica-game-short-2026', VERSION=3;
const $=s=>document.querySelector(s), clone=x=>JSON.parse(JSON.stringify(x)), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let legacy=null,animationRows=null,correctionPending=null;

let state=null,saved=null,storageOK=true,draft=['Команда 1','Команда 2','Команда 3'],toastId,clock=null;
try{saved=JSON.parse(localStorage.getItem(KEY)||'null');legacy=JSON.parse(localStorage.getItem('barlemica-game-v2')||localStorage.getItem('barlemica-game-v1')||'null');}catch(e){storageOK=false;}
const qById=Object.fromEntries(D.questions.map(q=>[q.id,q]));
const team=id=>state.teams.find(t=>t.id===id), question=()=>qById[state.currentQuestionId];
const fmt=n=>Number(n).toLocaleString('ru-RU');
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toastId);toastId=setTimeout(()=>$('#toast').style.display='none',4200);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));saved=clone(state);}catch(e){if(storageOK)toast('Автосохранение недоступно. Сохраняйте резервные копии через меню.');storageOK=false;}}
function snapshot(){const s=clone(state);delete s.history;delete s.future;s.timerRunning=false;return s;}
function action(label,fn){const before=snapshot(),history=state.history,future=state.future;try{fn();state.history.push({label,before,after:snapshot()});state.history=state.history.slice(-20);state.future=[];persist();render();if(animationRows){showResult(animationRows);animationRows=null;}}catch(e){state={...before,history,future};animationRows=null;toast(e.message||'Действие не выполнено');}}
function stopClock(){clearInterval(clock);clock=null;}
function undo(){if(!state?.history.length)return toast('Нет действий');stopClock();const h=state.history.pop(),{history,future}=state;future.push(h);state={...clone(h.before),history,future};persist();render();}
function redo(){if(!state?.future.length)return toast('Нет действий');stopClock();const h=state.future.pop(),{history,future}=state;history.push(h);state={...clone(h.after),history,future};persist();render();}

function header(){return `<header><div class="brand" aria-label="СВОЯ BARLEMICA"><div class="brand-title"><span class="brand-own">СВОЯ</span>${wordmark()}</div><span class="brand-sub">2026</span></div><div class="header-actions"><button class="icon-button" data-act="fullscreen" aria-label="Полноэкранный режим" title="Полный экран · F">⛶</button><button class="icon-button" data-act="menu" aria-label="Меню ведущего" title="Меню ведущего">☰</button></div></header>`;}
function footer(){return `<footer class="footer"><span>СВОЯ BARLEMICA / 2026 · ${state?(storageOK?'Сохранено на этом устройстве':'Состояние только в памяти'):'Интеллектуальное барное шоу'}</span><span class="shortcuts">${state?'<span class="key">Space</span> ответ　<span class="key">T</span> таймер　<span class="key">U</span> отмена　':''}<span class="key">F</span> полный экран</span></footer>`;}
function startView(){return `<main class="welcome fade"><section><div class="eyebrow">25 ноября / фестиваль Barlemica 2026</div><h1><span class="own-title">СВОЯ</span>${wordmark()}</h1><p class="intro">Хорошие вопросы.<br>Яркие команды. Настоящий азарт.</p></section><section class="setup"><div class="setup-heading"><h2>Кто сегодня играет?</h2><span class="count">2–6 команд</span></div><div id="team-fields">${draft.map((name,i)=>`<label class="team-input"><span class="team-number">0${i+1}</span><input data-team="${i}" aria-label="Название команды ${i+1}" maxlength="60" value="${esc(name)}">${draft.length>2?`<button data-act="remove-team" data-i="${i}" aria-label="Убрать команду ${i+1}">×</button>`:''}</label>`).join('')}</div><button class="add-team" data-act="add-team" ${draft.length>=6?'disabled':''}>＋ Добавить команду</button>${saved?'<button class="resume-button" data-act="resume">Продолжить сохранённую игру ↗</button>':''}${legacy?'<button class="resume-button" data-act="legacy">Перенести счёт из прежней игры</button>':''}<button class="primary start-button" data-act="start"><span>Начать игру</span><span>→</span></button><p class="setup-note">Работает без интернета.</p></section></main><div class="features"><div class="feature"><strong>3</strong><span>раунда</span></div><div class="feature"><strong>48</strong><span>точных вопросов</span></div><div class="feature"><strong>12</strong><span>категорий</span></div><div class="feature"><strong>1</strong><span>финал со ставками</span></div></div>`;}
function scores(){return `<section class="scores" style="--team-count:${state.teams.length}" aria-label="Счёт команд">${state.teams.map((t,i)=>{return `<button class="score-card ${t.id===state.activeTeamId?'active':''} ${t.score<0?'debt':''}" data-act="active-team" data-id="${esc(t.id)}" ${state.currentQuestionId?'disabled':''} aria-label="${esc(t.name)}, ${t.score} очков. Передать право выбора"><div class="score-top"><span>${t.id===state.activeTeamId?'● ВЫБИРАЕТ':'КОМАНДА 0'+(i+1)}</span></div><div class="score-name" title="${esc(t.name)}">${esc(t.name)}</div><div class="score-value" data-score-team="${esc(t.id)}">${t.score<0?'−'+fmt(Math.abs(t.score)):fmt(t.score)}</div></button>`;}).join('')}</section>`;}
function boardView(){const round=D.rounds[state.currentRound-1],n=state.answeredIds.filter(id=>qById[id].round===state.currentRound).length;return `<main class="board-view fade"><div class="board-heading"><div><div class="eyebrow">Раунд ${state.currentRound} из 3</div><h1>${esc(round.title.charAt(0)+round.title.slice(1).toLowerCase())}</h1></div><div class="round-info"><div class="round-tabs" aria-label="Раунды">${[1,2,3].map(r=>`<button class="round-tab ${r===state.currentRound?'current':''}" data-act="round" data-r="${r}" aria-label="Перейти в раунд ${r}">${r}</button>`).join('')}</div><div><div class="progress-label">Сыграно <b>${n}</b> / 16</div><div class="progress-track"><i style="width:${n/16*100}%"></i></div></div></div></div><section class="board" aria-label="Игровое поле: четыре категории по четыре вопроса">${D.categories.filter(c=>c.round===state.currentRound).map(c=>`<div class="category"><div class="category-title" title="${esc(c.title)}"><span>${esc(c.title)}</span></div>${D.questions.filter(q=>q.round===state.currentRound&&q.category_id===c.id).map(q=>{const done=state.answeredIds.includes(q.id);return `<button class="cell ${done?'played':''}" data-act="question" data-id="${q.id}" ${done?'disabled':''} aria-label="${esc(c.title)}, ${q.points} очков${done?', сыграно':''}">${done?'<span>—</span>':`<span>${fmt(q.points)}</span>`}</button>`;}).join('')}</div>`).join('')}</section>${scores()}<div class="board-bottom"><span class="hint">${esc(team(state.activeTeamId).name)} выбирает вопрос</span><div class="button-row"><button data-act="undo" ${state.history.length?'':'disabled'}>↶ Отменить</button>${state.currentRound<3?`<button data-act="next-round">К ${state.currentRound+1}-му раунду →</button>`:'<button class="primary" data-act="final-start">К финалу →</button>'}</div></div></main>`;}
function timerHTML(){return `<div class="timer"><div id="timer-value" class="timer-number ${state.timerRemaining===0?'expired':''}" aria-live="polite">${state.timerRemaining===0?'Время!':String(state.timerRemaining).padStart(2,'0')}</div><button data-act="timer" aria-label="Старт или пауза таймера" id="timer-toggle">${state.timerRunning?'Ⅱ Пауза':'▷ Старт'}</button><button data-act="timer-reset" aria-label="Перезапустить таймер">↻</button><button data-act="timer-add" aria-label="Добавить десять секунд">+10 с</button></div>`;}
function missing(){return `<div class="missing-media"><svg viewBox="0 0 80 60" aria-hidden="true"><rect x="2" y="2" width="76" height="56" rx="5"/><path d="m4 50 22-24 17 18 12-13 23 23"/><circle cx="55" cy="16" r="6"/></svg><b>МЕДИА НЕ ЗАГРУЖЕНО</b>Изображение не подготовлено.<br>Ведущий может прочитать вопрос.</div>`;}
function questionView(){const q=question(),f=state.specialFlow,responder=team(f.responderId);return `<main class="question-view fade"><div class="question-top"><div class="question-category">Раунд ${q.round} / ${esc(q.category)}<span class="question-price">${fmt(f.stage==='steal'?q.points/2:q.points)} очков</span></div><div class="responding"><span class="pill">${esc(responder?.name||'Перехват')}</span></div></div><div class="question-body ${q.media_type==='artwork'?'with-art':''}"><div class="question-copy">${q.media_type==='emoji'?`<div class="emoji" aria-label="Ребус из эмодзи">${esc(q.media_text)}</div>`:''}<h1 class="question-text">${esc(q.question)}</h1>${state.revealed?`<div class="answer"><div class="answer-label">Правильный ответ</div>${esc(q.answer)}</div>`:''}</div>${q.media_type==='artwork'?`<div class="art-frame"><img src="assets/art/${q.id.toLowerCase()}.jpg" alt="Изображение к вопросу" id="question-art"></div>`:''}</div><div class="question-tools">${timerHTML()}<div class="button-row">${state.revealed?'<button data-act="host-note">Заметка ведущему</button>':`<button class="primary" data-act="reveal">Показать ответ <span class="key">Space</span></button>`}</div></div>${state.revealed?judgingHTML(q,f):''}</main>`;}
function judgingHTML(q,f){if(f.stage==='steal-offer')return `<section class="judging"><div class="judging-label">${f.firstResult==='wrong'?'Неверный ответ':'Без ответа'}. Можно предложить один перехват за ${fmt(q.points/2)} очков.</div><div class="judging-actions">${state.teams.filter(t=>t.id!==f.openerId).map(t=>`<button data-act="steal" data-id="${t.id}">Перехват · ${esc(t.name)}</button>`).join('')}<button class="primary" data-act="complete">Завершить вопрос →</button></div></section>`;return `<section class="judging"><div class="judging-label">${f.stage==='steal'?'ПЕРЕХВАТ · половина номинала':'ОЦЕНКА ОТВЕТА'} · ${esc(team(f.responderId).name)} · ${fmt(f.stage==='steal'?q.points/2:f.stake||q.points)} очков</div><div class="judging-actions"><button class="positive" data-act="judge" data-result="correct">✓ Верно</button><button class="negative" data-act="judge" data-result="wrong">× Неверно</button><button data-act="judge" data-result="pass">Без ответа</button></div></section>`;}
function specialView(){const q=question(),f=state.specialFlow;if(f.stage==='bag')return `<main class="special-view fade"><section class="special-card"><div class="eyebrow">Специальный вопрос / ${fmt(q.points)} очков</div><div class="special-symbol">♢</div><h1>СИРОП В МЕШКЕ</h1><p>${esc(team(f.openerId).name)}, передайте вопрос другой команде.<br>Она отвечает за полный номинал. Перехвата нет.<br>Право следующего выбора остаётся у вас.</p><div class="team-options">${state.teams.filter(t=>t.id!==f.openerId).map(t=>`<button class="primary" data-act="bag-to" data-id="${t.id}">${esc(t.name)} →</button>`).join('')}</div><button data-act="cancel-question">Отменить до показа</button></section></main>`;}
function resultsView(){const ranked=[...state.teams].sort((a,b)=>b.score-a.score);return `<main class="ranking fade"><div class="eyebrow">BARLEMICA / ИТОГИ ВЕЧЕРА</div><h1>Итоги игры</h1>${state.final?.phase==='done'?finalSummary():''}<h2>Таблица по очкам</h2><div>${ranked.map(t=>{const pos=ranked.findIndex(r=>r.score===t.score)+1,tie=ranked.filter(r=>r.score===t.score).length>1;return `<div class="rank-row"><span class="rank-pos">${String(pos).padStart(2,'0')}</span><div class="rank-team">${esc(t.name)}${tie?'<div class="tie">Ничья · разделённое место</div>':''}</div><span class="rank-score">${fmt(t.score)}</span></div>`;}).join('')}</div><p class="small">Сыграно ${state.answeredIds.length} из 48 вопросов. Незаданные вопросы остаются на поле.</p><div class="button-row" style="margin-top:25px"><button class="primary" data-act="export-results">Скачать результаты ↓</button>${state.final?.phase==='done'?'<button data-act="undo">Отменить итог финала</button>':'<button data-act="return-board">Вернуться к полю</button>'}</div></main>`;}
function render(){const focused=document.activeElement?.id;$('#app').innerHTML=`<div class="shell ${state?'is-game':'is-start'}">${header()}${!state?startView():state.view==='results'?resultsView():state.view==='final'?finalView():state.currentQuestionId?(state.specialFlow.stage==='bag'?specialView():questionView()):boardView()}${footer()}</div>`;const img=$('#question-art');if(img)img.onerror=()=>{img.parentElement.innerHTML=missing();};document.querySelectorAll('[data-brand]').forEach(img=>{img.onload=()=>{img.hidden=false;img.parentElement.classList.add('has-logo');img.closest('.brand-title')?.classList.add('with-logo');img.parentElement.querySelector('.brand-fallback').hidden=true;img.parentElement.querySelector('.brand-note').hidden=true;};img.onerror=()=>{if(!img.dataset.triedPng){img.dataset.triedPng='1';img.src='assets/brand/barlemica-logo.png';}else img.remove();};if(img.complete&&img.naturalWidth)img.onload();});if(focused)document.getElementById(focused)?.focus();}
function dialog(title,body){const d=$('#dialog');d.classList.toggle('wide',/data-result-panel/.test(body));d.classList.toggle('result-dialog',body.includes('data-result-panel'));d.classList.toggle('single-result',body.includes('data-result-panel')&&!body.includes('two-teams'));d.innerHTML=`<div class="dialog-head"><h2>${title}</h2><button data-act="close-dialog" aria-label="Закрыть диалог">×</button></div>${body}`;if(!d.open)d.showModal();}
function close(){if($('#dialog').open)$('#dialog').close();}
function confirmDialog(title,text,act,extra=''){dialog(title,`<p>${text}</p><div class="button-row"><button class="primary" data-act="${act}" ${extra}>Подтвердить</button><button data-act="close-dialog">Отмена</button></div>`);}
function readDraft(){document.querySelectorAll('[data-team]').forEach(el=>draft[Number(el.dataset.team)]=el.value);}
function newGame(){stopClock();state={schemaVersion:VERSION,rulesVersion:'short-2026',final:null,appliedTransactions:{},serial:0,startedAt:new Date().toISOString(),teams:draft.map((name,i)=>({id:'team-'+(i+1),name:name.trim()||'Команда '+(i+1),score:0})),currentRound:1,activeTeamId:'team-1',answeredIds:[],currentQuestionId:null,revealed:false,timerRemaining:20,timerRunning:false,specialFlow:null,scoreLog:[],history:[],future:[],view:'board'};persist();close();render();}
function openQuestion(id){if(state.view!=='board'||state.final?.phase==='done'||state.currentQuestionId||state.answeredIds.includes(id)||qById[id]?.round!==state.currentRound)return;action('Открытие вопроса',()=>{const q=qById[id];state.currentQuestionId=id;state.revealed=false;state.timerRemaining=q.timer_seconds;state.timerRunning=false;state.specialFlow={kind:q.special||'normal',stage:'answer',openerId:state.activeTeamId,responderId:state.activeTeamId,decisions:[],actionId:'q:'+q.id+':'+(++state.serial)};if(q.special==='bag')state.specialFlow.stage='bag';});}
function finalize(){const f=state.specialFlow,q=question();if(state.appliedTransactions[q.id])throw new Error('Этот вопрос уже оценён');const rows=[];for(const d of f.decisions){if(!Number.isSafeInteger(d.delta))throw new Error('Некорректное начисление');const t=team(d.teamId),before=t.score,after=before+d.delta;if(!Number.isSafeInteger(after))throw new Error('Некорректный баланс');t.score=after;const row={questionId:q.id,actionId:f.actionId,teamId:t.id,basePoints:q.points,kind:d.kind,result:d.result,delta:d.delta,before,after,timestamp:new Date().toISOString()};state.scoreLog.push(row);rows.push({...row,name:t.name});}state.appliedTransactions[q.id]=f.actionId;state.answeredIds.push(q.id);state.activeTeamId=f.kind==='normal'?(f.correctTeamId||f.openerId):f.openerId;state.currentQuestionId=null;state.specialFlow=null;state.revealed=false;state.timerRunning=false;animationRows=rows;}
function judge(result){if(!state?.currentQuestionId||!state.revealed||!['correct','wrong','pass'].includes(result))return;const f=state.specialFlow;if(!['answer','steal'].includes(f.stage))return;stopClock();action('Оценка ответа: '+result,()=>{const q=question(),f=state.specialFlow,kind=f.stage==='steal'?'steal':f.kind==='normal'?'regular':f.kind,amount=f.stage==='steal'?q.points/2:q.points,delta=result==='correct'?amount:result==='wrong'?-amount:0;f.decisions.push({teamId:f.responderId,delta,result,kind});state.timerRunning=false;if(result==='correct'){f.correctTeamId=f.responderId;finalize();}else if(f.kind==='normal'&&f.stage!=='steal'){f.firstResult=result;f.stage='steal-offer';}else finalize();});}
function syncTimer(){const el=$('#timer-value');if(el){el.textContent=state.timerRemaining?String(state.timerRemaining).padStart(2,'0'):'Время!';el.classList.toggle('expired',state.timerRemaining===0);}const btn=$('#timer-toggle');if(btn)btn.textContent=state.timerRunning?'Ⅱ Пауза':'▷ Старт';}
function toggleTimer(){if(!state?.currentQuestionId)return;const stage=state.specialFlow.stage;if(!['answer','steal','auction'].includes(stage))return;if(!state.timerRemaining)return toast('Перезапустите таймер или добавьте время');action('Старт / пауза таймера',()=>{state.timerRunning=!state.timerRunning;});stopClock();if(state.timerRunning){let last=Date.now();clock=setInterval(()=>{if(!state?.timerRunning){stopClock();return;}const now=Date.now(),elapsed=Math.floor((now-last)/1000);if(elapsed<1)return;last+=elapsed*1000;state.timerRemaining=Math.max(0,state.timerRemaining-elapsed);if(!state.timerRemaining){state.timerRunning=false;stopClock();}persist();syncTimer();},200);}}
function reveal(){if(!state?.currentQuestionId||state.revealed||!['answer','steal'].includes(state.specialFlow.stage))return;stopClock();action('Раскрытие ответа',()=>{state.revealed=true;state.timerRunning=false;});}


function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function validCore(s){
  if(!s||s.schemaVersion!==3||!Array.isArray(s.teams)||s.teams.length<2||s.teams.length>6||![1,2,3].includes(s.currentRound))return false;
  const ids=new Set(s.teams.map(t=>t?.id));
  if(ids.size!==s.teams.length||!s.teams.every(t=>t&&/^team-[1-6]$/.test(t.id)&&typeof t.name==='string'&&t.name.length<=60&&Number.isSafeInteger(t.score)))return false;
  if(!ids.has(s.activeTeamId)||!Array.isArray(s.answeredIds)||!s.answeredIds.every(id=>Object.hasOwn(qById,id))||!Array.isArray(s.scoreLog)||!s.appliedTransactions||!['board','results','final'].includes(s.view)||!Number.isSafeInteger(s.serial))return false;
  if(s.currentQuestionId){
    const q=qById[s.currentQuestionId],f=s.specialFlow;
    if(!q||q.round!==s.currentRound||!f||!ids.has(f.openerId)||!ids.has(f.responderId)||!['bag','answer','steal','steal-offer'].includes(f.stage)||!Array.isArray(f.decisions))return false;
  }
  if(s.view==='final'&&!['bets','guesses'].includes(s.final?.phase))return false;
  if(s.final&&s.final.phase!=='bets'&&!s.teams.every(t=>Number.isSafeInteger(s.final.bets?.[t.id])&&s.final.bets[t.id]>=0))return false;
  if(s.final?.phase==='done'&&(!Array.isArray(s.final.winners)||!s.final.winners.length||!s.final.winners.every(id=>ids.has(id))||!s.teams.every(t=>Number.isSafeInteger(s.final.guesses?.[t.id])&&Number.isSafeInteger(s.final.distance?.[t.id]))))return false;
  return Number.isSafeInteger(s.timerRemaining)&&s.timerRemaining>=0;
}
function validSave(s){return validCore(s)&&Array.isArray(s.history)&&Array.isArray(s.future)&&s.history.length<=30&&s.future.length<=30&&[...s.history,...s.future].every(h=>typeof h.label==='string'&&validCore(h.before)&&validCore(h.after));}

function resume(s=saved){if(!validSave(s)){dialog('Сохранение несовместимо',`<p>Формат не поддерживается или данные повреждены. Исходные данные не изменены.</p><div class="button-row"><button data-act="export-old">Скачать сохранение</button><button data-act="legacy">Сохранение v1</button><button data-act="close-dialog">Закрыть</button></div>`);return;}stopClock();state=clone(s);state.timerRunning=false;state.future=state.future||[];persist();close();render();}
function menu(){dialog('Пульт ведущего · СВОЯ BARLEMICA',`<div class="menu-grid">${legacy?'<button data-act="legacy">Прежнее сохранение · экспорт или перенос счёта</button>':''}${location.protocol!=='file:'?'<button data-act="download-offline">↓ Скачать игру для запуска без интернета</button>':''}${state?`<button data-act="backup">↓ Сохранить резервную копию JSON</button><button data-act="import">↑ Загрузить резервную копию</button><button data-act="undo" ${state.history.length?'':'disabled'}>↶ Отменить последнее действие</button><button data-act="redo" ${state.future.length?'':'disabled'}>↷ Повторить действие</button><button data-act="correct-score">± Корректировка счёта</button><button data-act="finish">Посмотреть итоги</button><button class="negative" data-act="reset">Начать новую игру</button>`:`<button data-act="import">↑ Загрузить резервную копию</button>${saved?'<button data-act="export-old">↓ Скачать сохранённые данные</button><button class="negative" data-act="reset">Сбросить сохранение</button>':''}`}<button data-act="help">Как играть и горячие клавиши</button></div><p class="small">Данные хранятся только в этом браузере. Очистка браузера и режим инкогнито могут стереть ход игры. Перед мероприятием сохраните резервную копию.</p>`);}
function wordmark(){return `<span class="wordmark"><span class="brand-fallback">BARLEMICA</span><img data-brand src="assets/brand/barlemica-logo.svg" alt="BARLEMICA" hidden><small class="brand-note">временный wordmark</small></span>`;}











function legacyDialog(){
  dialog('Прежнее сохранение',`<p>Можно перенести названия команд, текущие очки и отметки сыгранных вопросов, оставшихся в сокращённом банке.</p><div class="button-row"><button data-act="export-legacy">Скачать прежнее сохранение</button><button class="primary" data-act="migrate-ask">Перенести счёт</button><button data-act="close-dialog">Закрыть</button></div>`);
}
function migrateLegacy(){
  const old=legacy;
  if(!Array.isArray(old?.teams)||old.teams.length<2||old.teams.length>6||!old.teams.every(t=>Number.isSafeInteger(t.score)&&typeof t.name==='string'))return toast('Счёт из этого файла перенести не удалось');
  const teams=old.teams.map((t,i)=>({id:`team-${i+1}`,name:t.name.slice(0,60),score:t.score}));
  const answeredIds=(Array.isArray(old.answeredIds)?old.answeredIds:[]).filter(id=>Object.hasOwn(qById,id));
  stopClock();
  state={schemaVersion:VERSION,rulesVersion:'short-2026',teams,answeredIds,
    currentRound:[1,2,3].includes(old.currentRound)?old.currentRound:1,
    activeTeamId:teams.find((_,i)=>old.teams[i].id===old.activeTeamId)?.id??teams[0].id,
    startedAt:old.startedAt||new Date().toISOString(),currentQuestionId:null,revealed:false,
    timerRemaining:20,timerRunning:false,specialFlow:null,final:null,
    scoreLog:[],appliedTransactions:Object.fromEntries(answeredIds.map(id=>[id,`legacy:${id}`])),
    serial:0,history:[],future:[],view:'board'};
  persist();close();render();
}




function showResult(rows){const changes=rows.filter(r=>r.delta);if(changes.length)toast(changes.map(r=>`${r.name} ${r.delta>0?'+':''}${fmt(r.delta)} · счёт ${fmt(r.after)}`).join(' / '));}

function finalView() {
  const bets = state.final.phase === 'bets';
  const rows = state.teams.map(t => {
    const label = bets ? `Ставка, до ${fmt(Math.max(0,t.score))}` : 'Ответ команды';
    const max = bets ? Math.max(0,t.score) : 1000000000;
    return `<label class="final-entry"><b>${esc(t.name)}</b><span>${bets ? `Счёт ${fmt(t.score)}` : `Ставка ${fmt(state.final.bets[t.id])}`}</span><input name="${t.id}" aria-label="${label} — ${esc(t.name)}" placeholder="${label}" type="number" inputmode="numeric" min="0" max="${max}" step="1" required value="${bets&&max===0?'0':''}" ${bets&&max===0?'readonly':''}></label>`;
  }).join('');
  return `<main class="special-view fade"><section class="special-card final-card"><div class="eyebrow">ФИНАЛ</div><h1>${bets?'Ставки команд':esc(D.final.question)}</h1><p>${bets?'Сначала зафиксируйте ставки, затем откроется вопрос. Ближайшие ответы выигрывают свои ставки, остальные команды теряют свои. При нулевом или отрицательном счёте ставка равна 0.':'Внесите ответ каждой команды. Побеждает тот, кто ближе всего к правильному числу.'}</p><form id="final-form"><div class="final-entries">${rows}</div><div class="button-row"><button type="button" data-act="undo">↶ Назад</button><button class="primary" type="submit">${bets?'Зафиксировать ставки и открыть вопрос →':'Открыть ответ и подвести итоги →'}</button></div></form></section></main>`;
}

function finalSummary() {
  const f = state.final;
  const names = f.winners.map(id => esc(team(id).name)).join(', ');
  const rows = [...state.teams].sort((a,b) => f.distance[a.id]-f.distance[b.id]).map(t => {
    const delta = f.winners.includes(t.id) ? f.bets[t.id] : -f.bets[t.id];
    return `<div class="final-summary-row"><b>${esc(t.name)}</b><span>Ответ ${fmt(f.guesses[t.id])}</span><span>Разница ${fmt(f.distance[t.id])}</span><span>${delta>0?'+':''}${fmt(delta)} очков</span></div>`;
  }).join('');
  return `<section class="final-summary"><div class="eyebrow">ФИНАЛ</div><p>${esc(D.final.question)}</p><div class="final-answer"><strong>${fmt(D.final.answer)}</strong><span>${f.winners.length===1?'Победитель':'Победители'}<br><b>${names}</b>${f.winners.length>1?' · одинаковая точность':''}</span></div>${rows}</section>`;
}

function submitFinal(form) {
  if(state.view!=='final'||!['bets','guesses'].includes(state.final?.phase))return;
  const bets = state.final.phase==='bets';
  const entries = {};
  for(const t of state.teams){
    const raw = form.elements.namedItem(t.id).value;
    const value = Number(raw);
    if(!raw.trim()||!Number.isSafeInteger(value)||value<0||value>(bets?Math.max(0,t.score):1000000000)){
      toast(`Проверьте ${bets?'ставку':'ответ'} команды «${t.name}»`);
      return;
    }
    entries[t.id]=value;
  }
  if(bets){
    action('Ставки финала',()=>{state.final={phase:'guesses',bets:entries};});
    return;
  }
  action('Итоги финала',()=>{
    const f=state.final;
    const distance=Object.fromEntries(state.teams.map(t=>[t.id,Math.abs(entries[t.id]-D.final.answer)]));
    const closest=Math.min(...Object.values(distance));
    const winners=state.teams.filter(t=>distance[t.id]===closest).map(t=>t.id);
    const actionId='final:'+(++state.serial);
    for(const t of state.teams){
      const stake=f.bets[t.id];
      const delta=winners.includes(t.id)?stake:-stake;
      const before=t.score;
      const after=before+delta;
      if(!Number.isSafeInteger(after))throw new Error('Слишком большой итоговый счёт');
      t.score=after;
      state.scoreLog.push({questionId:'FINAL',actionId,teamId:t.id,kind:'final',stake,delta,before,after,timestamp:new Date().toISOString()});
    }
    state.final={...f,phase:'done',guesses:entries,distance,winners};
    state.view='results';
  });
}
const handlers={
'final-start':()=>{if(!state||state.currentQuestionId)return;if(state.final?.phase==='done'){action('Показ итогов',()=>{state.view='results';});return;}const remaining=48-state.answeredIds.length;if(remaining&&!state.final){confirmDialog('Перейти к финалу?',`На полях осталось вопросов: ${remaining}.`,'final-start-confirm');return;}handlers['final-start-confirm']();},
'final-start-confirm':()=>{close();action('Переход к финалу',()=>{state.final??={phase:'bets'};state.view='final';});},
'legacy':legacyDialog,
'export-legacy':()=>download('barlemica-previous.json',legacy),
'migrate-ask':()=>confirmDialog('Перенести прежний счёт?','Игра откроется на сокращённом поле. Незавершённый вопрос и история отмены останутся в прежнем сохранении.','migrate-confirm'),
'migrate-confirm':migrateLegacy,
'download-offline':()=>{const a=document.createElement('a');a.href='Barlemica-2026-Royal-Cane.zip';a.download='Barlemica-2026-Royal-Cane.zip';a.click();},'close-dialog':close,'fullscreen':async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){toast('Полный экран недоступен в этом окне. Откройте сайт в отдельной вкладке.');}},'menu':menu,
'add-team':()=>{readDraft();if(draft.length<6)draft.push('Команда '+(draft.length+1));render();},'remove-team':b=>{readDraft();draft.splice(Number(b.dataset.i),1);render();},
'start':()=>{readDraft();if(saved)confirmDialog('Начать новую игру?','Сохранённая игра будет заменена. Резервную копию можно скачать через меню.','new-confirm');else newGame();},'new-confirm':newGame,'resume':()=>resume(),
'question':b=>openQuestion(b.dataset.id),'active-team':b=>{if(!state.currentQuestionId)action('Смена выбирающей команды',()=>{state.activeTeamId=b.dataset.id;});},
'reveal':reveal,'timer':toggleTimer,'timer-reset':()=>{if(!state?.currentQuestionId)return;stopClock();action('Перезапуск таймера',()=>{state.timerRemaining=question().timer_seconds;state.timerRunning=false;});},'timer-add':()=>{if(state?.currentQuestionId)action('Добавление времени',()=>{state.timerRemaining+=10;});},
'judge':b=>judge(b.dataset.result),'complete':()=>{if(state.specialFlow?.stage==='steal-offer')action('Завершение вопроса',finalize);},
'steal':b=>{if(state.specialFlow.stage!=='steal-offer'||b.dataset.id===state.specialFlow.openerId)return;action('Перехват вопроса',()=>{state.specialFlow.stage='steal';state.specialFlow.responderId=b.dataset.id;state.timerRemaining=question().timer_seconds;});},
'bag-to':b=>{if(state.specialFlow.stage!=='bag'||b.dataset.id===state.specialFlow.openerId)return;action('Передача сиропа',()=>{state.specialFlow.responderId=b.dataset.id;state.specialFlow.stage='answer';});},
'cancel-question':()=>{if(!['bag'].includes(state.specialFlow?.stage))return;stopClock();action('Отмена специального вопроса',()=>{state.currentQuestionId=null;state.specialFlow=null;state.timerRunning=false;});},
'undo':()=>{close();undo();},'redo':()=>{close();redo();},
'round':b=>{if(Number(b.dataset.r)===state.currentRound)return;confirmDialog('Перейти в другой раунд?','Незаданные вопросы сохранятся. Вы сможете вернуться к ним позже.','round-confirm',`data-r="${b.dataset.r}"`);},'next-round':()=>confirmDialog('Перейти к следующему раунду?','Счёт команд сохранится. Незаданные вопросы останутся на поле.','round-confirm',`data-r="${state.currentRound+1}"`),
'round-confirm':b=>{if(state.currentQuestionId)return;close();action('Переход между раундами',()=>{state.currentRound=Number(b.dataset.r);});},
'finish':()=>{close();if(state?.view==='final')return toast('Сначала завершите финал');if(state?.currentQuestionId)return toast('Сначала завершите текущий вопрос');if(state)confirmDialog('Показать итоги игры?','Сохраним текущий счёт. К игровому полю можно будет вернуться.','finish-confirm');},'finish-confirm':()=>{close();action('Переход к итогам',()=>{state.view='results';});},'return-board':()=>action('Возврат к полю',()=>{state.view='board';}),
'export-results':()=>download('results.json',{event:'СВОЯ BARLEMICA',rulesVersion:state.rulesVersion,final:state.final,startedAt:state.startedAt,exportedAt:new Date().toISOString(),round:state.currentRound,answeredIds:state.answeredIds,ranking:[...state.teams].sort((a,b)=>b.score-a.score).map(t=>({...t,rank:1+state.teams.filter(other=>other.score>t.score).length,tied:state.teams.filter(other=>other.score===t.score).length>1})),scoreLog:state.scoreLog,appliedTransactions:state.appliedTransactions}),
'backup':()=>download('barlemica-backup.json',state),'export-old':()=>download('barlemica-saved.json',saved),'import':()=>$('#import-file').click(),
'reset':()=>confirmDialog('Сбросить игру?','Текущий ход игры будет удалён из этого браузера. Сохраните резервную копию перед сбросом.','reset-confirm'),
'reset-confirm':()=>{stopClock();try{localStorage.removeItem(KEY);}catch(e){}state=null;saved=null;close();render();},
'host-note':()=>{if(!state.revealed)return;const q=question();dialog('Заметка ведущему',`<p class="warning">Этот блок виден на общем экране. Открывайте его, когда заметку можно показать участникам.</p><button class="primary" data-act="show-note">Открыть заметку</button>`);},
'show-note':()=>{if(!state.revealed)return;const q=question();dialog('Заметка ведущему',`<p>${esc(q.host_note||'Дополнительных заметок нет.')}</p><p class="small">${state.revealed?'Допустимые ответы: '+esc(q.accepted_answers.join(' / ')):'Ответ пока скрыт. Допустимые варианты появятся после раскрытия.'}</p>`);},
 'correct-score':()=>{if(state.currentQuestionId||state.final)return toast('Сначала завершите вопрос');dialog('Корректировка очков',`<p>Поправка к счёту: целое число со знаком Причина обязательна.</p><form id="correction-form"><div class="form-row"><select id="correction-team" aria-label="Команда">${state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} · ${fmt(t.score)}</option>`).join('')}</select><input id="correction-value" type="number" min="-1000000000" max="1000000000" step="1" required placeholder="Изменение, например −50" aria-label="Изменение счёта"><input id="correction-reason" maxlength="200" required placeholder="Причина корректировки" aria-label="Причина корректировки"></div><button class="primary" type="submit">Продолжить</button></form>`);},
 'correction-1':()=>{if(!correctionPending)return;const c=correctionPending;confirmDialog('Окончательно изменить счёт?',`${esc(team(c.id).name)}: ${fmt(team(c.id).score)} → ${fmt(team(c.id).score+c.delta)}. Причина: ${esc(c.reason)}`,'correction-2');},
 'correction-2':()=>{if(!correctionPending)return;const c=correctionPending;correctionPending=null;close();action('Ручная корректировка очков',()=>{const t=team(c.id),before=t.score;t.score+=c.delta;const row={questionId:null,actionId:'manual:'+(++state.serial),teamId:t.id,basePoints:0,kind:'manual',stake:null,delta:c.delta,before,after:t.score,reason:c.reason,timestamp:new Date().toISOString()};state.scoreLog.push(row);animationRows=[{...row,name:t.name}];});},
'help':()=>dialog('Всё просто',`<p>Команда выбирает категорию и стоимость. Прочитайте вопрос, запустите таймер. Раскройте ответ и оцените его: верно +номинал, неверно −номинал, без ответа 0. После ошибки или паса доступен один перехват за половину стоимости.</p><p>«Сироп в мешке» передают другой команде. В финале каждая команда даёт числовой ответ. Побеждает ближайший ответ. Ставка прибавляется победителям и вычитается у остальных.</p><p><span class="key">Space</span> показать ответ<br><span class="key">T</span> старт / пауза таймера<br><span class="key">R</span> перезапуск таймера<br><span class="key">U</span> отмена последнего действия<br><span class="key">F</span> полный экран</p><p class="small">Таймер не раскрывает ответ автоматически. Перейти между раундами можно в любой момент с игрового поля.</p>`),

};

document.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b||b.disabled)return;handlers[b.dataset.act]?.(b);});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='final-form')submitFinal(e.target);if(e.target.id==='correction-form'){const id=$('#correction-team').value,delta=Number($('#correction-value').value),reason=$('#correction-reason').value.trim();if(!Number.isSafeInteger(delta)||!delta||!reason)return toast('Нужны ненулевая поправка целым числом и причина');if(!Number.isSafeInteger(team(id).score+delta))return toast('Слишком большой баланс');correctionPending={id,delta,reason};confirmDialog('Подтвердить корректировку?',`${esc(team(id).name)}: ${delta>0?'+':''}${fmt(delta)} очков. ${esc(reason)}`,'correction-1');}});
$('#import-file').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>5000000)throw Error('size');const imported=JSON.parse(await f.text());if([1,2].includes(imported?.schemaVersion)){legacy=imported;legacyDialog();return;}if(!validSave(imported))throw Error('schema');window.pendingImport=imported;confirmDialog('Восстановить резервную копию?','Текущая игра будет заменена данными из выбранного файла.','import-confirm');}catch(err){toast('Не удалось загрузить: повреждённый или несовместимый файл игры');}});
handlers['import-confirm']=()=>{const imported=window.pendingImport;delete window.pendingImport;resume(imported);};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;if($('#dialog').open)return;const k=e.key.toLowerCase();if(k==='f'){e.preventDefault();handlers.fullscreen();}if(!state)return;if(k===' '){e.preventDefault();reveal();}if(k==='t'){e.preventDefault();toggleTimer();}if(k==='r'&&state.currentQuestionId){e.preventDefault();handlers['timer-reset']();}if(k==='u'){e.preventDefault();undo();}});

document.addEventListener('visibilitychange',()=>{if(document.hidden&&state?.timerRunning){stopClock();state.timerRunning=false;persist();syncTimer();}});
render();if(saved)dialog('Вернёмся к игре?',`<p>На этом устройстве есть сохранённый ход игры. Продолжить с того же места?</p><div class="button-row"><button class="primary" data-act="resume">Продолжить</button><button data-act="close-dialog">На стартовый экран</button></div>`);if(!storageOK)toast('Локальное хранилище недоступно. Используйте резервные копии JSON.');
})();
