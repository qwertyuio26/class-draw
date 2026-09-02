
'use strict';
/* ============ 数据层 Store ============ */
const LS = { classes:'classdraw_classes', state:'classdraw_state', settings:'classdraw_settings', logs:'classdraw_logs' };
function read(k, d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
let persistWarned=false;
function write(k, v){
  try{ localStorage.setItem(k, JSON.stringify(v)); }
  catch(e){
    if(!persistWarned){
      persistWarned=true;
      try{ setTimeout(()=>toast('⚠️ 当前浏览器无法保存数据：名单已内置不会丢，但抽签记录仅在本次有效。建议用 Chrome/Edge 打开此文件'), 900); }catch(_){}
    }
  }
}
function defaultClasses(){
  if(typeof ROSTER_DATA !== 'undefined' && ROSTER_DATA.length){
    return ROSTER_DATA.map(x=>({ id:x.id, name:x.name, students:x.students.slice() }));
  }
  return [{ id:'c1', name:'一班', students:SAMPLE.slice() }];
}

const SAMPLE = ['张伟','王芳','李娜','刘洋','陈静','杨帆','赵磊','黄敏','周杰','吴丹','徐强','孙丽','马超','朱婷','胡军','郭雪','林涛','何雨','高翔','罗成','郑爽','梁雪','谢东','韩雪','唐浩','冯颖','董亮','萧然','程晨','曹阳'];

function seed(){
  if(!localStorage.getItem(LS.classes)){
    write(LS.classes, defaultClasses());
  }
  const dcls=defaultClasses();
  const st0=read(LS.state, {});
  if(!localStorage.getItem(LS.state)) write(LS.state, { currentId:dcls[0].id, drawnMap:{} });
  else if(dcls.length && !dcls.some(x=>x.id===st0.currentId)){ st0.currentId=dcls[0].id; write(LS.state, st0); }
  if(!localStorage.getItem(LS.settings)) write(LS.settings, { mode:'scroll', noRepeat:true, sound:true, count:1 });
  if(!localStorage.getItem(LS.logs)) write(LS.logs, []);
  const st = read(LS.state, {}), cls = read(LS.classes, []);
  if(cls.length && !cls.some(c=>c.id===st.currentId)){ st.currentId=cls[0].id; write(LS.state, st); }
}
function getClasses(){ return read(LS.classes, []); }
function saveClasses(c){ write(LS.classes, c); }
function getState(){ return read(LS.state, { currentId:null, drawnMap:{} }); }
function saveState(s){ write(LS.state, s); }
function getSettings(){ return Object.assign({ mode:'scroll', noRepeat:true, sound:true, count:1 }, read(LS.settings, {})); }
function saveSettings(s){ write(LS.settings, s); }
function getLogs(){ return read(LS.logs, []); }
function saveLogs(l){ write(LS.logs, l); }
function currentClass(){
  const cls=getClasses(), st=getState();
  return cls.find(c=>c.id===st.currentId) || cls[0] || null;
}
function currentDrawn(){
  const st=getState(), c=currentClass();
  return c ? (st.drawnMap[c.id]||[]) : [];
}
function candidates(){
  const c=currentClass(); if(!c) return [];
  const st=getSettings();
  if(st.noRepeat){ const d=new Set(currentDrawn()); return c.students.filter(n=>!d.has(n)); }
  return c.students.slice();
}
function markDrawn(name){
  const st=getState(), c=currentClass(); if(!c) return;
  if(!st.drawnMap[c.id]) st.drawnMap[c.id]=[];
  st.drawnMap[c.id].push(name);
  saveState(st);
  const l=getLogs(); l.push({ t:Date.now(), clsId:c.id, clsName:c.name, name });
  if(l.length>3000) l.splice(0, l.length-3000);
  saveLogs(l);
}
function resetDrawn(){
  const st=getState(), c=currentClass(); if(!c) return;
  if(st.drawnMap[c.id]) delete st.drawnMap[c.id];
  saveState(st);
}

/* ============ 工具 ============ */
const $ = id => document.getElementById(id);
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtTime(t){
  const d=new Date(t), p=n=>String(n).padStart(2,'0');
  return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
let toastTimer=null;
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; }, 2200);
}
function download(filename, content){
  const blob=new Blob([content], { type:'text/plain;charset=utf-8' });
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
}

/* ============ 渲染 ============ */
function renderHeader(){
  const c=currentClass();
  $('clsName').textContent = c?c.name:'未设置班级';
  $('clsCount').textContent = c?`${c.students.length} 人`:'0 人';
}
function renderStatus(){
  const pool=candidates(), drawn=currentDrawn();
  $('statusBar').textContent = pool.length
    ? `候选 ${pool.length} 人 · 已抽 ${drawn.length} 人`
    : (drawn.length? '本轮已全部抽完 · 点击「重置本轮」重新开始' : '候选 0 人 · 请先在「名单」里添加学生');
}
function renderToday(){
  const drawn=currentDrawn();
  $('todayList').innerHTML = drawn.length
    ? drawn.map(n=>`<span class="chip on">${esc(n)}</span>`).join('')
    : '<span class="empty">还没有抽签记录</span>';
}
function renderLogs(){
  const logs=getLogs().slice().reverse().slice(0,150);
  $('logList').innerHTML = logs.length
    ? logs.map(l=>`<div class="log-item"><span class="n">${esc(l.name)}</span><span class="t">${esc(l.clsName)} · ${fmtTime(l.t)}</span></div>`).join('')
    : '<div class="empty">暂无历史记录</div>';
}
function renderClsChips(){
  const cls=getClasses(), cur=currentClass();
  $('clsChips').innerHTML = cls.map(c=>`<button class="chip ${c.id===cur.id?'on':''}" data-cls="${c.id}">${esc(c.name)}</button>`).join('')
    + `<button class="chip-plus" id="btnAddCls" title="新建班级">+</button>`
    + (cls.length>1?`<button class="chip-del" id="btnDelCls" title="删除当前班级">−</button>`:'');
}
function loadRosterText(){
  const c=currentClass();
  $('rosterText').value = c? c.students.join('\n') : '';
}
function saveRosterFromText(){
  const cls=getClasses(), st=getState();
  const c=cls.find(x=>x.id===st.currentId) || cls[0]; if(!c) return;
  const names=[...new Set($('rosterText').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
  c.students=names; saveClasses(cls);
  renderHeader(); renderStatus(); renderToday(); renderClsChips(); loadRosterText();
  if(getSettings().mode==='wheel') drawWheel(wheelAngle);
  toast(`已保存名单 ${names.length} 人`);
}
function countLogsFor(name){
  return getLogs().filter(l=>l.name===name).length;
}

/* ============ 弹层 ============ */
function openMask(id){ $(id).hidden=false; }
function closeMasks(){ document.querySelectorAll('.mask').forEach(m=>m.hidden=true); }

/* ============ 班级操作 ============ */
function addClass(){
  const cls=getClasses(), st=getState();
  const id='c'+Date.now();
  cls.push({ id, name:`班级${cls.length+1}`, students:[] });
  saveClasses(cls); st.currentId=id; saveState(st);
  renderClsChips(); loadRosterText(); renderHeader(); renderStatus();
  toast('已新建班级，输入名单后点保存');
}
function delClass(){
  const cls=getClasses(), cur=currentClass(); if(!cur) return;
  if(!confirm(`确定删除班级「${cur.name}」及其全部名单？`)) return;
  const i=cls.findIndex(x=>x.id===cur.id); cls.splice(i,1);
  saveClasses(cls);
  const st=getState(); st.currentId = cls.length? cls[Math.min(i,cls.length-1)].id : null; saveState(st);
  renderClsChips(); loadRosterText(); renderHeader(); renderStatus(); renderToday();
  if(getSettings().mode==='wheel') drawWheel(wheelAngle);
  toast('已删除班级');
}
function switchClass(id){
  const st=getState(); st.currentId=id; saveState(st);
  renderClsChips(); loadRosterText(); renderHeader(); renderStatus(); renderToday();
  if(getSettings().mode==='wheel') drawWheel(wheelAngle);
}

/* ============ 抽签引擎：滚动模式（支持同时抽多人） ============ */
let spinTimer=null, spinFinal=[], spinPhase='idle'; /* idle|rolling|slow|done */
function pickMany(pool, n){
  const arr=pool.slice(), out=[];
  while(out.length<n && arr.length){ out.push(arr.splice(Math.floor(Math.random()*arr.length),1)[0]); }
  return out;
}
function drawCount(){
  const pool=candidates();
  return Math.max(1, Math.min(getSettings().count||1, pool.length));
}
function renderBigNames(count, cls){
  const box=$('bigNames');
  let html='';
  for(let i=0;i<count;i++) html+=`<div class="bigname-item ${count>1?'small':''}${cls?' '+cls:''}">?</div>`;
  box.innerHTML=html;
}
function startSpin(){
  const c=currentClass();
  if(!c || !c.students.length){ toast('名单为空，请先到「名单」里添加学生'); return; }
  const pool=candidates();
  if(!pool.length){ toast('本轮已全部抽完，已自动重置'); resetDrawn(); renderStatus(); renderToday(); return; }
  const want=getSettings().count||1;
  if(pool.length<want) toast(`候选不足，本次最多抽 ${pool.length} 人`);
  spinPhase='rolling';
  renderBigNames(Math.min(want,pool.length), 'spinning');
  $('btnStart').textContent='⏹ 停止'; $('btnStart').classList.add('stop');
  $('resultSub').hidden=true;
  $('hintText').innerHTML='滚动中…再按一次 <b>空格键</b> 提前揭晓';
  let tick=0;
  spinTimer=setInterval(()=>{
    tick++;
    document.querySelectorAll('.bigname-item').forEach(it=>{ it.textContent=pool[Math.floor(Math.random()*pool.length)]; });
    playSound('tick');
    if(spinPhase==='rolling' && tick>=70) beginSlow();
  }, 60);
}
function beginSlow(){
  if(spinPhase!=='rolling') return;
  spinPhase='slow';
  clearInterval(spinTimer);
  const pool=candidates();
  spinFinal=pickMany(pool, Math.min(pool.length, getSettings().count||1));
  let gap=110, locked=0;
  const again=()=>{
    const pool2=candidates();
    const items=[...document.querySelectorAll('.bigname-item')];
    items.forEach((it,i)=>{
      if(it.classList.contains('locked')) return;
      it.textContent = pool2.length && Math.random()<0.22 ? spinFinal[i] : pool2[Math.floor(Math.random()*pool2.length)];
    });
    playSound('tick');
    gap*=1.28;
    if(gap>=400 && locked<spinFinal.length){
      const it=items[locked];
      if(it){ it.textContent=spinFinal[locked]; it.classList.add('locked'); }
      locked++;
    }
    if(locked>=spinFinal.length) finishSpin();
    else spinTimer=setTimeout(again, gap);
  };
  spinTimer=setTimeout(again, gap);
}
function finishSpin(){
  clearTimeout(spinTimer);
  const names=spinFinal.length? spinFinal : ['?'];
  spinPhase='done';
  document.querySelectorAll('.bigname-item').forEach((it,i)=>{
    it.textContent=names[i]||'';
    it.classList.remove('spinning','locked');
    it.classList.add('hit');
  });
  $('btnStart').textContent='🎲 再来一次'; $('btnStart').classList.remove('stop');
  const cnts=names.map(n=>countLogsFor(n));
  $('resultSub').hidden=false;
  $('resultSub').textContent=`🎉 抽中 ${names.map(n=>`「${n}」`).join('、')} · 累计 ${cnts.join('/')} 次`;
  $('hintText').innerHTML='按 <b>空格键</b> 继续抽下一位';
  names.forEach(markDrawn);
  playSound('win');
  renderStatus(); renderToday();
}

/* ============ 抽签引擎：转盘模式（多人 = 自动连转） ============ */
let wheelAngle=0, wheelRaf=null, wheelState='idle', wheelT0=0, wheelDur=3800, wheelTotal=0, wheelForce=false;
let wheelPicked=[], wheelTarget=1, wheelPauseTimer=null;
function drawWheel(angle){
  const cv=$('wheelCv'), ctx=cv.getContext('2d');
  const dpr=window.devicePixelRatio||1, size=cv.clientWidth||400;
  if(cv.width!==size*dpr){ cv.width=size*dpr; cv.height=size*dpr; }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,size,size);
  const pool=candidates(), cx=size/2, cy=size/2, r=size/2-4;
  if(!pool.length){
    ctx.fillStyle='#1a2440'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8fa3bf'; ctx.font=`bold ${size*0.07}px "Microsoft YaHei"`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('本轮已抽完', cx, cy);
    return;
  }
  const n=pool.length, step=Math.PI*2/n;
  const colors=['#16a34a','#0e8f4a','#1d6b3c','#15803d'];
  for(let i=0;i<n;i++){
    const a0=angle+i*step;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a0,a0+step); ctx.closePath();
    ctx.fillStyle=colors[i%4]; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.fillStyle='#eafff2';
  const fs=Math.max(9, Math.min(22, Math.round(size*0.9/n)));
  ctx.font=`bold ${fs}px "Microsoft YaHei"`;
  ctx.textAlign='right'; ctx.textBaseline='middle';
  for(let i=0;i<n;i++){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle+i*step+step/2);
    ctx.fillText(pool[i], r-10, 0);
    ctx.restore();
  }
}
function startWheel(){
  const c=currentClass();
  if(!c || !c.students.length){ toast('名单为空，请先到「名单」里添加学生'); return; }
  const pool=candidates();
  if(!pool.length){ toast('本轮已全部抽完，已自动重置'); resetDrawn(); renderStatus(); renderToday(); return; }
  wheelPicked=[];
  wheelTarget=Math.min(getSettings().count||1, pool.length);
  if(pool.length<(getSettings().count||1)) toast(`候选不足，本次最多抽 ${wheelTarget} 人`);
  $('wheelResult').hidden=true;
  wheelSpinOnce();
}
function wheelSpinOnce(){
  wheelState='spin'; wheelForce=false;
  $('btnStart').textContent='⏹ 停止'; $('btnStart').classList.add('stop');
  wheelTotal=Math.PI*2*(3+Math.random()*2)+Math.random()*Math.PI*2;
  wheelT0=performance.now(); wheelDur=3200;
  const stepFn=(now)=>{
    const p=Math.min(1,(now-wheelT0)/wheelDur);
    const ease=1-Math.pow(1-p,3);
    wheelAngle=wheelTotal*ease;
    drawWheel(wheelAngle);
    if(p<1) wheelRaf=requestAnimationFrame(stepFn);
    else wheelStopOnce();
  };
  wheelRaf=requestAnimationFrame(stepFn);
}
function wheelFinalize(){
  wheelState='done';
  $('btnStart').textContent='🎲 再来一次'; $('btnStart').classList.remove('stop');
  document.querySelectorAll('.wheel-name').forEach(w=>w.classList.add('hit'));
  playSound('win');
  renderStatus(); renderToday();
}
function wheelStopOnce(){
  cancelAnimationFrame(wheelRaf); wheelRaf=null;
  const pool=candidates(), n=pool.length;
  let rel=(-Math.PI/2-wheelAngle)%(Math.PI*2); if(rel<0) rel+=Math.PI*2;
  const name=pool[Math.floor(rel/(Math.PI*2/n))] || pool[0];
  wheelPicked.push(name);
  markDrawn(name);
  $('wheelResult').innerHTML = wheelPicked.map(nm=>`<span class="wheel-name">${esc(nm)}</span>`).join('');
  $('wheelResult').hidden=false;
  if(wheelPicked.length < wheelTarget){
    playSound('tick');
    wheelPauseTimer=setTimeout(()=>{ wheelPauseTimer=null; $('wheelResult').hidden=true; wheelSpinOnce(); }, 700);
  } else {
    wheelFinalize();
  }
}
function wheelForceStop(){
  if(wheelPauseTimer){ clearTimeout(wheelPauseTimer); wheelPauseTimer=null; wheelFinalize(); return; }
  if(wheelState!=='spin') return;
  const used=performance.now()-wheelT0;
  wheelDur=Math.max(160, used*1.6);
}
/* ============ 音效（Web Audio 合成，无外部文件） ============ */
let actx=null;
function ac(){
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(actx && actx.state==='suspended') actx.resume();
  return actx;
}
function playSound(kind){
  const st=getSettings(); if(!st.sound) return;
  const a=ac(); if(!a) return;
  const t=a.currentTime;
  if(kind==='tick'){
    const o=a.createOscillator(), g=a.createGain();
    o.type='square'; o.frequency.value=1700+Math.random()*300;
    g.gain.setValueAtTime(0.05,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.03);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+0.04);
  } else if(kind==='win'){
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
      const o=a.createOscillator(), g=a.createGain();
      o.type='triangle'; o.frequency.value=f;
      const tt=t+i*0.09;
      g.gain.setValueAtTime(0.0001,tt);
      g.gain.exponentialRampToValueAtTime(0.22,tt+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,tt+0.4);
      o.connect(g); g.connect(a.destination); o.start(tt); o.stop(tt+0.45);
    });
  }
}

/* ============ 设置 ============ */
function renderSettings(){
  const st=getSettings();
  document.querySelectorAll('#segMode button').forEach(b=>b.classList.toggle('on', b.dataset.mode===st.mode));
  $('swNoRepeat').checked=st.noRepeat;
  $('swSound').checked=st.sound;
  $('cntVal').textContent=st.count||1;
}
function applyModeView(){
  const isWheel=getSettings().mode==='wheel';
  $('stageScroll').hidden=isWheel;
  $('stageWheel').hidden=!isWheel;
  if(isWheel){ requestAnimationFrame(()=>drawWheel(wheelAngle)); }
  resetStage();
}

/* ============ 导出 / 导入 ============ */
function exportTxt(){
  const c=currentClass(); if(!c) return;
  download(`${c.name}-名单.txt`, c.students.join('\n'));
}
function exportJson(){
  download(`抽签点名数据-${new Date().toISOString().slice(0,10)}.json`,
    JSON.stringify({ classes:getClasses(), state:getState(), settings:getSettings(), logs:getLogs() }, null, 1));
}
function importJson(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(!d || !Array.isArray(d.classes)) throw new Error('bad');
      write(LS.classes, d.classes);
      if(d.state) write(LS.state, d.state);
      if(d.settings) write(LS.settings, d.settings);
      if(Array.isArray(d.logs)) write(LS.logs, d.logs);
      const st=getState(), cls=getClasses();
      if(cls.length && !cls.some(c=>c.id===st.currentId)){ st.currentId=cls[0].id; saveState(st); }
      renderAll();
      toast('导入成功');
    }catch(e){ toast('导入失败：文件格式不正确'); }
  };
  r.readAsText(file,'utf-8');
}

/* ============ 主控 ============ */
function startBtnText(){
  const want=getSettings().count||1, pool=candidates();
  const n=Math.max(1, Math.min(want, pool.length||1));
  return n>1 ? `🎲 开始抽签（抽 ${n} 人）` : '🎲 开始抽签';
}
function startStop(){
  const st=getSettings();
  if(st.mode==='wheel'){
    if(wheelState==='spin') wheelForceStop();
    else startWheel();
  }else{
    if(spinPhase==='rolling') beginSlow();
    else if(spinPhase==='slow') { /* 减速中，等待揭晓 */ }
    else startSpin();
  }
}
function doReset(){
  if(spinPhase==='rolling'||spinPhase==='slow'){ clearInterval(spinTimer); clearTimeout(spinTimer); }
  if(wheelState==='spin'){ cancelAnimationFrame(wheelRaf); }
  if(wheelPauseTimer){ clearTimeout(wheelPauseTimer); wheelPauseTimer=null; }
  spinPhase='idle'; wheelState='idle'; wheelPicked=[];
  resetDrawn();
  resetStage();
  toast('已重置本轮，全部同学重新进入候选');
}
function resetStage(){
  spinPhase='idle'; wheelState='idle';
  renderBigNames(1);
  const it=document.querySelector('.bigname-item');
  if(it){ it.textContent='准备抽签'; it.classList.remove('spinning','hit','locked','small'); }
  $('hintText').innerHTML='按 <b>空格键</b> 或点击下方按钮开始抽签';
  $('resultSub').hidden=true;
  $('wheelResult').hidden=true; $('wheelResult').innerHTML='';
  $('btnStart').textContent=startBtnText();
  $('btnStart').classList.remove('stop');
  renderStatus(); renderToday();
}
function renderAll(){
  renderHeader(); renderStatus(); renderToday(); renderLogs();
  renderClsChips(); loadRosterText(); renderSettings();
  if(getSettings().mode==='wheel') requestAnimationFrame(()=>drawWheel(wheelAngle));
}

/* ============ 事件绑定 ============ */
$('btnStart').addEventListener('click', startStop);
$('btnReset').addEventListener('click', doReset);
$('btnRoster').addEventListener('click', ()=>{ openMask('maskRoster'); renderClsChips(); loadRosterText(); });
$('btnLogs').addEventListener('click', ()=>{ openMask('maskLogs'); renderToday(); renderLogs(); });
$('btnSettings').addEventListener('click', ()=>{ openMask('maskSettings'); renderSettings(); });

document.addEventListener('click', e=>{
  if(e.target.closest('[data-close]')) closeMasks();
  else if(e.target.classList && e.target.classList.contains('mask')) closeMasks();
});
$('clsChips').addEventListener('click', e=>{
  const c=e.target.closest('[data-cls]'); if(c){ switchClass(c.dataset.cls); return; }
  if(e.target.closest('#btnAddCls')) addClass();
  else if(e.target.closest('#btnDelCls')) delClass();
});
$('btnSaveRoster').addEventListener('click', saveRosterFromText);
$('btnSample').addEventListener('click', ()=>{
  $('rosterText').value=SAMPLE.join('\n');
  toast('已填入示例名单，点「保存名单」生效');
});
$('btnClearRoster').addEventListener('click', ()=>{ $('rosterText').value=''; toast('已清空输入框，点「保存名单」生效'); });
$('btnExportTxt').addEventListener('click', exportTxt);
$('btnExportJson').addEventListener('click', exportJson);
$('btnImportJson').addEventListener('click', ()=>$('importFile').click());
$('importFile').addEventListener('change', e=>{
  if(e.target.files && e.target.files[0]) importJson(e.target.files[0]);
  e.target.value='';
});
$('btnClearLogs').addEventListener('click', ()=>{
  if(!confirm('确定清空全部点名历史记录？')) return;
  saveLogs([]); renderLogs(); toast('已清空全部记录');
});
$('segMode').addEventListener('click', e=>{
  const b=e.target.closest('[data-mode]'); if(!b) return;
  const st=getSettings(); st.mode=b.dataset.mode; saveSettings(st);
  renderSettings(); applyModeView();
});
$('cntMinus').addEventListener('click', ()=>{
  const st=getSettings(); st.count=Math.max(1,(st.count||1)-1); saveSettings(st);
  renderSettings(); resetStage(); toast(`每次抽取 ${st.count} 人`);
});
$('cntPlus').addEventListener('click', ()=>{
  const st=getSettings(); st.count=Math.min(12,(st.count||1)+1); saveSettings(st);
  renderSettings(); resetStage(); toast(`每次抽取 ${st.count} 人`);
});
$('swNoRepeat').addEventListener('change', e=>{
  const st=getSettings(); st.noRepeat=e.target.checked; saveSettings(st);
  renderStatus(); toast(e.target.checked?'已开启「本轮不重复」':'已关闭「本轮不重复」');
});
$('swSound').addEventListener('change', e=>{
  const st=getSettings(); st.sound=e.target.checked; saveSettings(st);
  if(st.sound) playSound('win');
});

document.addEventListener('keydown', e=>{
  const tag=(document.activeElement||{}).tagName;
  if(tag==='INPUT'||tag==='TEXTAREA') return;
  if(e.code==='Space'){ e.preventDefault(); startStop(); }
  else if(e.key==='r'||e.key==='R') doReset();
  else if(e.key==='Escape') closeMasks();
});

/* ============ 初始化 ============ */
seed();
applyModeView();
renderAll();