(function () {
  'use strict';
  const D = window.FadeoutData, E = window.FadeoutEngine;
  let storage;
  try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('unavailable'); } }; }
  let state = E.load(storage), screen = 'intro', guideReturn = 'top', currentResponse = null, hintsVisible = false, sceneExpanded = true, pendingConfirm = null, sceneTimer = null;
  let activeIntro = null, activeButtonNoise = null, monitorEntry = false;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => state.settings.reducedMotion || motionPreference.matches;
  const audio = new window.FadeoutAudio();
  const app = document.getElementById('app'), settingsDialog = document.getElementById('settings-dialog'), confirmDialog = document.getElementById('confirm-dialog');
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (action, label, className = 'outline-button', attrs = '') => `<button class="${className}" data-action="${action}" ${attrs}>${label}</button>`;
  const announce = text => { const node = document.getElementById('announcer'); node.textContent = ''; requestAnimationFrame(() => { node.textContent = text; }); };
  function persist() { const ok = E.save(storage, state); document.getElementById('storage-note').textContent = ok ? '' : 'このブラウザでは保存できません。この画面を開いている間は遊べます。'; return ok; }
  function syncSettings() {
    document.body.classList.toggle('reduced-motion', state.settings.reducedMotion);
    const toggle = document.getElementById('sound-toggle');
    toggle.textContent = state.settings.sound ? '音 ON' : '音 OFF';
    toggle.setAttribute('aria-label', state.settings.sound ? '音をオフにする' : '音をオンにする'); toggle.setAttribute('aria-pressed', String(state.settings.sound));
    document.getElementById('sound-setting').checked = state.settings.sound;
    document.getElementById('volume-setting').value = state.settings.volume;
    document.getElementById('motion-setting').checked = state.settings.reducedMotion;
    audio.configure(state.settings);
    activeIntro?.setReduced(reducedMotion());
    activeButtonNoise?.setReduced(reducedMotion());
  }
  function terminal(content, heading, code, status = 'お手続きを選択してください') {
    return `<section class="terminal-wrap"><div class="terminal-heading"><div><span class="eyebrow">セルフサービス / 記憶の確認・消去</span><h1>${heading}</h1></div><span class="terminal-id">受付機 01</span></div><div class="machine"><div class="machine-screen"><div class="machine-status"><span><i aria-hidden="true"></i>${status}</span><span>${code}</span></div><div class="terminal-content">${content}</div></div><div class="machine-plinth" aria-hidden="true"><span class="plinth-slot"></span><span class="plinth-caption">フェードアウト受付機 F-01</span></div></div></section>`;
  }
  function progressView() {
    const count = state.completed.length, available = E.unlocked(state);
    return `<section class="terminal-progress" aria-label="履歴の確認状況"><div class="progress-heading"><span>確認済み履歴</span><strong>${String(count).padStart(2, '0')}<span> / 04</span></strong><span class="verification-state">${count === 4 ? '照合完了' : '消去対象を照合中'}</span></div><div class="progress-track" role="progressbar" aria-label="履歴の確認状況" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${count}" aria-valuetext="4件中${count}件確認済み">${D.memories.map((m, i) => `<span class="progress-segment ${state.completed.includes(i) ? 'is-complete' : i < available ? 'is-current' : ''}" aria-hidden="true">${m.id}<small>${state.completed.includes(i) ? '確認済み' : i < available ? '確認待ち' : '未読込'}</small></span>`).join('')}</div></section>`;
  }
  function menuIcon(kind) {
    const paths = { history: '<path d="M5 5h14v16H5zM8 2h8v5H8zM8 11h8m-8 4h8"/>', erase: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>', guide: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3v.2"/>' };
    return `<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
  }
  function startIntro(replay=false) {
    activeIntro?.dispose(); activeButtonNoise?.dispose();activeButtonNoise=null; clearTimeout(sceneTimer);
    screen='intro'; monitorEntry=false;
    guideReturn=replay && state.guideAccepted ? state.route : 'top';
    document.body.classList.add('intro-active');
    document.body.classList.remove('monitor-entry','monitor-session');
    document.querySelector('meta[name="theme-color"]').content='#050608';
    app.classList.remove('scene-transition'); app.dataset.screen='intro';
    audio.setScene(null);
    state.started=true;
    activeIntro=new window.FadeoutIntro({
      mount:app, lines:D.prologue, stage:replay?'prologue':state.introStage, line:replay?0:state.introLine, reduced:reducedMotion(),
      onCheckpoint:({stage,line})=>{ if(!replay) { state.introStage=stage; state.introLine=line; persist(); } },
      onMotion:()=>{ state.settings.reducedMotion=!state.settings.reducedMotion; syncSettings(); persist(); },
      onComplete:()=>{
        activeIntro=null;
        monitorEntry=true;
        if(!replay) { state.introStage='guide'; persist(); }
        render('guide'); audio.play('boot');
      },
    });
    activeIntro.setPaused(document.hidden);
    app.focus({preventScroll:true});
  }
  function guideView() {
    return terminal(`<div class="guide-copy"><span class="section-label">お手続きの前に</span>${D.guide.map(p => `<p>${esc(p)}</p>`).join('')}<div class="guide-notes">${D.guideNotes.map(p => `<p>${esc(p)}</p>`).join('')}</div><p class="guide-signature">フェードアウトはセルフでお願いします。</p>${button('accept-guide', '確認しました →', 'solid-button')}</div>`, 'ご利用案内', '案内表示中', '操作受付中');
  }
  function topView() {
    const ready = state.completed.length === 4;
    return terminal(`${progressView()}<h2>ご希望の操作を選択してください</h2><p class="terminal-intro">${ready ? '4件の履歴を確認しました。最終確認へ進めます。' : 'はじめに「記憶の履歴」で、4件の記録を確認してください。'}</p><div class="top-menu">${button('history', `<span class="menu-card-top">${menuIcon('history')}<span class="menu-state">操作可能</span></span><strong>記憶の履歴</strong><small>記憶を調べる・読み返す</small><span class="menu-arrow" aria-hidden="true">→</span>`, 'menu-card history-card')}${button('erase', `<span class="menu-card-top">${menuIcon('erase')}<span class="menu-state">${ready ? '操作可能' : '照合待ち'}</span></span><strong>記憶を消去</strong><small>${ready ? '消去するか、残すかを選択' : '4件の履歴を確認後に操作できます'}</small><span class="menu-arrow" aria-hidden="true">→</span>`, `menu-card erase-card ${ready ? '' : 'is-locked'}`, 'aria-describedby="erase-feedback"')}${button('guide', `${menuIcon('guide')}<span><strong>ご利用案内</strong><small>手続きと操作方法の確認</small></span><span class="menu-arrow" aria-hidden="true">→</span>`, 'menu-card guide-card')}</div><p class="inline-status" id="erase-feedback" role="status">${ready ? '照合完了：消去後の影響は、最終確認画面でご確認ください。' : '照合中：確認した履歴のみが、消去の対象になります。'}</p>`, 'フェードアウト受付機', ready ? '照合完了' : '照合中', '操作受付中');
  }
  function historyView() {
    const available = E.unlocked(state);
    const rows = D.memories.map((m, i) => {
      const open = i < available, done = state.completed.includes(i);
      return button('open-memory', `<span class="history-number">${m.id}</span><span><strong>${open ? esc(m.title) : `履歴 ${m.id}`}</strong><small>${open ? esc(m.place) : '前の履歴を確認すると読み込まれます'}</small></span><span class="history-state">${done ? '閲覧済み' : open ? '閲覧可能' : '未読込'}<span aria-hidden="true">${open ? ' →' : ''}</span></span>`, `history-item ${done ? 'is-complete' : ''}`, `data-index="${i}" ${open ? '' : 'disabled'} aria-label="履歴${m.id} ${open ? esc(m.title) : 'まだ読み込まれていません'} ${done ? '閲覧済み' : ''}"`);
    }).join('');
    return terminal(`${progressView()}<h2>閲覧する履歴を選択してください</h2><div class="history-list">${rows}</div><p class="history-next-note">${state.completed.length === 4 ? '4件とも確認済みです。閲覧済みの記憶は、何度でも調べられます。' : '記憶の中を調べて「閲覧を終える」を押すと、次の履歴が読み込まれます。'}</p><div class="terminal-bottom">${button('top', '← 受付機に戻る', 'outline-button')}${button('guide', 'ご利用案内', 'text-button')}</div>`, '記憶の履歴', '履歴選択', '操作受付中');
  }
  // 生成画の上に置く、差し替え可能な色鉛筆・輪郭のレイヤー。座標は1000×500。
  function sceneEffects(index) {
    const effects = [
      `<g class="draw-effect e-ring"><ellipse cx="668" cy="386" rx="40" ry="8" fill="none" stroke="#695e4c" stroke-width="2" stroke-dasharray="17 3" opacity=".6"/></g><g class="draw-effect e-calendar" fill="none" stroke="#72634e" opacity=".5"><path d="M673 104h14m-14 9h22m-11 10h19" stroke-width="2"/></g><g class="draw-effect e-reach"><path d="M524 294q40-17 71-6l-7 78q-38 15-65-4Z" fill="#8b9aa25a"/><path class="hand-trace" d="M869 212q-35 41-37 86l-16 45q-6 10-8 0l8-45m20 39-17 25m16-6-10 16" stroke="#5f5141" stroke-width="3" fill="none" opacity=".35"/></g><g class="draw-effect e-recognition"><path d="M127 251 297 248 314 486 286 486 272 309 145 313 132 488 105 488Z" fill="none" stroke="#706f5955" stroke-width="2"/><ellipse cx="570" cy="368" rx="51" ry="12" fill="#7c8f9f29"/></g>`,
      `<g class="draw-effect e-phone"><path d="m383 379 146-4 55 20-140 13Z" fill="#87959844"/><path d="m424 385 33 0m-24 4 44-1" stroke="#d8dfd6" stroke-width="2"/></g><g class="draw-effect e-curtain"><path d="M140 0 165 390" stroke="#c4bb9855" stroke-width="9"/></g><g class="draw-effect e-recognition"><ellipse cx="819" cy="418" rx="56" ry="20" fill="#9e8a9f30"/></g>`,
      `<g class="draw-effect e-pudding"><path d="M248 185 326 185 316 267 263 268Z" fill="#c9b66a42"/><path d="M341 183 416 183 405 260 355 263Z" fill="#c3ad5b3b"/></g><g class="draw-effect e-warmth"><path d="M263 246h55v18h-55Zm92-6h49v19h-49Z" fill="#b4794749"/><ellipse cx="755" cy="419" rx="67" ry="12" fill="#c7b67b39"/></g>`,
      `<g class="draw-effect e-voices"><path d="M480 146h23m31-11h12m-9 26h25" stroke="#9a9c734d" stroke-width="4"/></g><g class="draw-effect e-pause"><ellipse cx="744" cy="316" rx="44" ry="17" fill="#8f97a43b"/></g><g class="draw-effect e-together"><ellipse cx="314" cy="376" rx="105" ry="25" fill="#b5a37c32"/><path d="m717 300 92 20" stroke="#b68c7959" stroke-width="17"/></g>`,
    ];
    return `<svg class="scene-effects" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">${effects[index]}</svg>`;
  }
  function memoryView() {
    const m = D.memories[state.active];
    const spots = m.hotspots.map(h => button('inspect', `<span class="spot-dot" aria-hidden="true"></span><span class="spot-label">${esc(h.label)}</span>`, 'hotspot', `data-id="${h.id}" style="left:${h.x}%;top:${h.y}%" aria-label="${esc(h.label)}を調べる"`)).join('');
    const spotButtons = m.hotspots.map(h => button('inspect', esc(h.label), '', `data-id="${h.id}"`)).join('');
    return `<section class="memory-page">
      <div class="memory-header"><div class="memory-title"><span class="memory-no">${m.id}</span><div><h1>${esc(m.title)}</h1><span class="eyebrow">${esc(m.place)}</span></div></div>${button('history', '履歴一覧へ →', 'back-button')}</div>
      <div class="memory-layout">
        <div class="scene-viewport is-expanded" id="scene-viewport" tabindex="0" role="region" aria-label="記憶の絵。拡大表示では左右に動かして調べられます。">
          <div class="scene" id="memory-scene" role="group" aria-label="調べられる記憶の絵">
            <div class="scene-art" role="img" aria-label="${esc(m.imageDescription)}" style="background-image:url('${m.image}');background-position:${m.panel % 2 ? 'right' : 'left'} ${m.panel > 1 ? 'bottom' : 'top'}"></div>
            ${sceneEffects(state.active)}<span class="scene-index" aria-hidden="true">履歴 ${m.id} / ${esc(m.time)}</span>${spots}
          </div>
        </div>
        <div class="scene-toolbar"><div><p class="sound-caption" id="sound-caption">${esc(m.ambienceCaption)}</p><span class="scene-pan-hint" id="scene-pan-hint">← 絵を左右に動かせます →</span></div>${button('scene-size', '全体を見る', 'scene-size-button', 'aria-pressed="true" aria-label="絵を縮小して全体を見る"')}</div>
        <div class="narrative-panel"><div class="narrative-meta">調べたもの<strong id="fragment-label">風景</strong></div><div id="narrative-content" aria-live="polite" aria-atomic="true"><p class="narrative-text">${esc(m.intro)}</p><p class="narrative-hint">絵の丸い印をタップして調べてください。</p></div></div>
      </div>
      <div class="memory-controls"><p class="memory-help" id="progress-copy"></p>${button('finish-memory', '閲覧を終える →', 'solid-button finish-button', 'id="finish-button" disabled')}</div>
      <div class="exploration-tools">
        <details class="hint-panel"><summary>ヒント・表示</summary><div class="hint-content"><p id="hint-copy" role="status">進め方に迷ったら、次の手がかりを確認できます。</p>${button('hint', '次の手がかりを確認', 'outline-button')}${button('labels', '調べる場所を絵に表示', 'text-button', 'aria-pressed="false"')}</div></details>
        <details class="spot-picker"><summary>調べる場所の一覧</summary><div class="spot-picker-buttons">${spotButtons}</div></details>
      </div>
    </section>`;
  }
  function finalView() {
    return terminal(`<h2>消去する内容をご確認ください</h2><p class="terminal-intro">対象は、残された人の中にある、あなたに関する記憶です。</p>
      <dl class="final-info"><div><dt>確認済み履歴</dt><dd><strong>4件 / 4件</strong></dd></div><div><dt>消去する範囲</dt><dd>この受付機で確認した記憶</dd></div><div><dt>習慣・気持ちへの影響</dt><dd>確認できません</dd></div></dl>
      <div class="final-cautions"><h3>実行前の確認事項</h3><ul>${D.finalNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></div>
      <p class="final-question">消去するか、残すかを選択してください。</p><div class="final-actions">${button('choose-erase', '消去を実行する', 'outline-button choice-button')}${button('choose-keep', '消去しないことを決める', 'outline-button choice-button')}${button('history', '記憶の履歴に戻る', 'text-button')}</div><p class="final-note">※最終操作の代行はできません。</p>`, '最終確認', '照合完了', '選択待ち');
  }
  function endingView() {
    const choice = state.endingChoice, e = D.endings[choice];
    return `<section class="ending-screen" data-choice="${choice}"><div class="ending-top"><span>FADE OUT / ${esc(e.label)}</span><span>処理終了</span></div><div class="ending-layout"><div class="ending-art" role="img" aria-label="同じ椅子とカップの残る食卓。日が差している。">${choice === 'keep' ? '<span class="ending-flower" aria-hidden="true"></span>' : ''}</div><div class="ending-text"><span class="eyebrow">AFTER THE PROCEDURE</span><h1>${esc(e.heading)}</h1>${e.text.map(p => `<p>${esc(p)}</p>`).join('')}<p class="sound-ending">♪ ${esc(e.caption)}</p>${button('review', '手続き前の記録を読み返す', 'outline-button')}<p class="small-note" style="margin-top:18px">もう一方の選択も、記録を読み返してから試せます。</p></div></div></section>`;
  }
  function render(next, focus = true) {
    activeIntro?.dispose(); activeIntro=null;
    activeButtonNoise?.dispose();activeButtonNoise=null;
    const previous = screen;
    clearTimeout(sceneTimer); screen = next;
    document.body.classList.remove('intro-active');
    document.body.classList.toggle('monitor-entry',next==='guide'&&monitorEntry);
    document.body.classList.toggle('monitor-session',['guide','top','history','final'].includes(next));
    document.querySelector('meta[name="theme-color"]').content=next==='guide'&&monitorEntry?'#f4f7fa':'#f3f5ef';
    if (['top', 'history', 'memory', 'final', 'ending'].includes(next)) { state.route = next; persist(); }
    const views = { guide: guideView, top: topView, history: historyView, memory: memoryView, final: finalView, ending: endingView };
    app.innerHTML = views[next](); app.dataset.screen = next;
    if(next==='top' && state.completed.length<4) activeButtonNoise=new window.FadeoutButtonNoise(app.querySelector('.erase-card'),{reduced:reducedMotion(),paused:document.hidden});
    app.classList.toggle('scene-transition', previous !== next && (next === 'memory' || previous === 'memory' || next === 'ending'));
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    audio.setScene(next === 'memory' ? D.memories[state.active].ambience : ['top', 'guide', 'history', 'final'].includes(next) ? 'terminal' : null);
    if (next === 'memory') { sceneExpanded = true; updateMemory(); requestAnimationFrame(centerScene); }
    if (next === 'ending') audio.play(D.endings[state.endingChoice].sound);
  }
  function centerScene(target) {
    const viewport = document.getElementById('scene-viewport'), scene = document.getElementById('memory-scene');
    if (!viewport || !scene) return;
    const spot = D.memories[state.active].hotspots.find(s => s.id === target);
    viewport.scrollLeft = Math.max(0, Math.min(scene.clientWidth - viewport.clientWidth, scene.clientWidth * (spot ? spot.x / 100 : .53) - viewport.clientWidth / 2));
  }
  function getHint() {
    const m = D.memories[state.active], clues = state.memories[state.active].clues;
    return m.hints.find(h => !clues.includes(h.unless));
  }
  function updateMemory() {
    const m = D.memories[state.active], progress = state.memories[state.active], canFinish = E.canFinish(state, state.active);
    const scene = document.getElementById('memory-scene');
    scene.className = `scene ${progress.effects.map(e => 'effect-' + e).join(' ')} ${hintsVisible ? 'show-labels' : ''}`;
    document.querySelectorAll('[data-action="inspect"]').forEach(b => {
      const spot = m.hotspots.find(s => s.id === b.dataset.id);
      b.classList.toggle('visited', progress.clues.includes(spot.id)); b.classList.toggle('is-visited', progress.clues.includes(spot.id));
      const revisit = progress.clues.includes(spot.id) && spot.variants?.some(v => v.when.every(c => progress.clues.includes(c)) && !progress.clues.includes(v.grant));
      b.classList.toggle('changed', !!revisit); b.setAttribute('aria-label', `${spot.label}を${revisit ? 'もう一度' : ''}調べる`);
    });
    document.getElementById('finish-button').disabled = !canFinish;
    document.getElementById('progress-copy').textContent = canFinish ? '確認完了：閲覧を終えられます。続けて調べることもできます。' : '調査中：絵の印から調べられます。再調査で反応が変わることがあります。';
    const hintCopy = document.getElementById('hint-copy');
    if (hintCopy && hintCopy.dataset.revealed) hintCopy.textContent = getHint()?.text || '必要な断片を確認しました。閲覧を終えられます。';
    if (currentResponse) {
      document.getElementById('fragment-label').textContent = currentResponse.label;
      document.getElementById('narrative-content').innerHTML = `<p class="narrative-text">${esc(currentResponse.text)}</p>${currentResponse.blockedHint ? `<p class="narrative-hint">${esc(currentResponse.blockedHint)}</p>` : ''}`;
      document.getElementById('sound-caption').textContent = currentResponse.caption || m.ambienceCaption;
    }
  }
  async function setSound(value) { state.settings.sound = value; await audio.unlock(); syncSettings(); audio.setScene(screen === 'memory' ? D.memories[state.active].ambience : ['top', 'guide', 'history', 'final'].includes(screen) ? 'terminal' : null); if (value) audio.play('boot'); persist(); }
  function askConfirmation(title, copy, onConfirm, confirmLabel) {
    pendingConfirm = onConfirm; document.getElementById('confirm-title').textContent = title; document.getElementById('confirm-copy').textContent = copy; document.getElementById('confirm-yes').textContent = confirmLabel || 'この選択で進める'; confirmDialog.showModal(); document.getElementById('confirm-no').focus();
  }
  document.addEventListener('click', async event => {
    const b = event.target.closest('[data-action]'); if (!b) return; event.preventDefault();
    const action = b.dataset.action;
    if (action === 'settings') { syncSettings(); settingsDialog.showModal(); return; }
    if (action === 'reset') { settingsDialog.close(); askConfirmation('最初からやり直しますか？', 'このブラウザに保存した進行と最後の選択をリセットします。', () => { state = E.fresh(); currentResponse = null; hintsVisible = false; syncSettings(); persist(); startIntro(); }, '進行をリセットする'); return; }
    // ブラウザの自動再生制限に対応。音は明示的にONにするまで鳴らさない。
    await audio.unlock(); audio.configure(state.settings);
    switch (action) {
      case 'home': if(state.guideAccepted) render('top'); else startIntro(); break;
      case 'replay-prologue': settingsDialog.close(); startIntro(true); break;
      case 'guide': guideReturn = screen === 'history' ? 'history' : 'top'; render('guide'); break;
      case 'accept-guide': state.guideAccepted = true; state.started = true; state.introStage='done'; state.introLine=0; monitorEntry=false; persist(); render(guideReturn); break;
      case 'top': render('top'); break;
      case 'history': render('history'); break;
      case 'open-memory': { const index = Number(b.dataset.index); if (index < E.unlocked(state)) { state.active = index; currentResponse = null; hintsVisible = false; render('memory'); } break; }
      case 'erase':
        if (state.completed.length === 4) render('final');
        else { audio.play('error'); activeButtonNoise?.trigger(); document.getElementById('erase-feedback').textContent = '操作を受け付けられません。消去対象を確認できません。'; } break;
      case 'inspect':
        currentResponse = E.inspect(state, state.active, b.dataset.id);
        if (currentResponse) { persist(); audio.play(currentResponse.sound); updateMemory(); if (currentResponse.sound === 'pause') { const scene = document.getElementById('memory-scene'); scene.classList.add('inspection-paused'); clearTimeout(sceneTimer); sceneTimer = setTimeout(() => scene.classList.remove('inspection-paused'), 2000); } if (currentResponse.newlyComplete) announce('この記憶の閲覧を終えられます。'); } break;
      case 'hint': { const hint = getHint(); const copy = document.getElementById('hint-copy'); copy.dataset.revealed = 'true'; copy.textContent = hint?.text || '必要な断片を確認しました。閲覧を終えられます。'; announce(copy.textContent); if (hint) { centerScene(hint.target); const spot = document.querySelector(`.hotspot[data-id="${hint.target}"]`); spot?.focus({ preventScroll: true }); } break; }
      case 'scene-size': sceneExpanded = !sceneExpanded; document.getElementById('scene-pan-hint').hidden = !sceneExpanded; document.getElementById('scene-viewport').classList.toggle('is-expanded', sceneExpanded); b.textContent = sceneExpanded ? '全体を見る' : '大きく見る'; b.setAttribute('aria-pressed', String(sceneExpanded)); b.setAttribute('aria-label', sceneExpanded ? '絵を縮小して全体を見る' : '絵を拡大して左右に動かす'); centerScene(); break;
      case 'labels': hintsVisible = !hintsVisible; document.getElementById('memory-scene').classList.toggle('show-labels', hintsVisible); b.setAttribute('aria-pressed', String(hintsVisible)); b.textContent = hintsVisible ? '絵の表示を静かにする' : '調べる場所を絵に表示'; break;
      case 'finish-memory': if (E.finish(state, state.active)) { currentResponse = null; persist(); render(state.route); } break;
      case 'choose-erase': case 'choose-keep': { const choice = action === 'choose-erase' ? 'erase' : 'keep'; askConfirmation(choice === 'erase' ? '消去を実行しますか？' : '消去せず、記憶を残しますか？', choice === 'erase' ? '確認された、あなたに関する記憶を対象に手続きを行います。消去後の影響は確認できません。' : '確認された記憶は、そのまま残ります。この選択で手続きを終えます。', () => { if (state.completed.length !== 4) return; state.endingChoice = choice; persist(); render('ending'); }, choice === 'erase' ? '消去を実行する' : '消去せずに終える'); break; }
      case 'review': state.endingChoice = null; persist(); render('top'); break;
    }
  });
  document.getElementById('confirm-yes').addEventListener('click', () => { const operation = pendingConfirm; pendingConfirm = null; confirmDialog.close(); operation?.(); });
  document.getElementById('confirm-no').addEventListener('click', () => { pendingConfirm = null; confirmDialog.close(); });
  confirmDialog.addEventListener('cancel', () => { pendingConfirm = null; });
  document.getElementById('sound-toggle').addEventListener('click', () => setSound(!state.settings.sound));
  document.getElementById('sound-setting').addEventListener('change', event => setSound(event.target.checked));
  document.getElementById('volume-setting').addEventListener('input', event => { state.settings.volume = Number(event.target.value); audio.configure(state.settings); persist(); });
  document.getElementById('motion-setting').addEventListener('change', event => { state.settings.reducedMotion = event.target.checked; syncSettings(); persist(); });
  document.addEventListener('visibilitychange', () => { activeIntro?.setPaused(document.hidden);activeButtonNoise?.setPaused(document.hidden); if (document.hidden) audio.stopScene(); else if (state.settings.sound) audio.setScene(screen === 'memory' ? D.memories[state.active].ambience : ['top', 'guide', 'history', 'final'].includes(screen) ? 'terminal' : null); });
  motionPreference.addEventListener('change',()=>{activeIntro?.setReduced(reducedMotion());activeButtonNoise?.setReduced(reducedMotion());});
  syncSettings();
  if(state.guideAccepted) render(state.route,false);
  else if(state.introStage==='guide') { monitorEntry=true; render('guide',false); }
  else startIntro();
})();
