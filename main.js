(function () {
  'use strict';
  const D = window.FadeoutData, E = window.FadeoutEngine;
  let storage;
  try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('unavailable'); } }; }
  let state = E.load(storage), screen = 'intro', guideReturn = 'top', currentResponse = null, hintsVisible = false, sceneExpanded = true, pendingConfirm = null, sceneTimer = null;
  let activeIntro = null, activeButtonNoise = null, activePresent = null, monitorEntry = false;
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
    activeIntro?.setSound(state.settings.sound);
    activeIntro?.setReduced(reducedMotion());
    activeButtonNoise?.setReduced(reducedMotion());
    activePresent?.setReduced(reducedMotion());
  }
  function terminal(content, heading, code, status = 'お手続きを選択してください', inScreenHeading = false) {
    return `<section class="terminal-wrap${inScreenHeading ? ' terminal-guide' : ''}">${inScreenHeading ? '' : `<div class="terminal-heading"><div><span class="eyebrow">セルフサービス / 記憶の確認・消去</span><h1>${heading}</h1></div><span class="terminal-id">受付機 01</span></div>`}<div class="machine"><div class="machine-screen"><div class="machine-status"><span><i aria-hidden="true"></i>${status}</span><span>${code}</span></div><div class="terminal-content">${content}</div></div><div class="machine-plinth" aria-hidden="true"><span class="plinth-slot"></span><span class="plinth-caption">フェードアウト受付機 F-01</span></div></div></section>`;
  }
  function progressView() {
    const count = E.decided(state), available = E.unlocked(state);
    return `<section class="terminal-progress" aria-label="エピソードの手続き状況"><div class="progress-heading"><span>手続き済み</span><strong>${String(count).padStart(2, '0')}<span> / 04</span></strong><span class="verification-state">${count === 4 ? '全件完了' : '1件ずつ確認・選択します'}</span></div><div class="progress-track" role="progressbar" aria-label="手続きの進行状況" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${count}" aria-valuetext="4件中${count}件手続き済み">${D.memories.map((m, i) => `<span class="progress-segment ${state.choices[i] ? 'is-complete' : i < available ? 'is-current' : ''}" aria-hidden="true">${m.id}<small>${state.choices[i] === 'erase' ? '消去済み' : state.choices[i] === 'keep' ? '残す' : i < available ? '手続き中' : '未読込'}</small></span>`).join('')}</div></section>`;
  }
  function menuIcon(kind) {
    const paths = { history: '<path d="M3 7V5h6l3 3h9v12H3Z"/>', erase: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>', guide: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v.2"/>' };
    return `<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
  }
  function startIntro(replay=false) {
    activeIntro?.dispose(); activeButtonNoise?.dispose();activeButtonNoise=null; clearTimeout(sceneTimer);
    activePresent?.dispose();activePresent=null;
    audio.setIntro(false);
    screen='intro'; monitorEntry=false;
    guideReturn=replay && state.guideAccepted ? state.route : 'top';
    document.body.classList.add('intro-active');
    document.body.classList.remove('monitor-entry','monitor-session','reception-home-active','guide-active');
    document.querySelector('meta[name="theme-color"]').content='#050608';
    app.classList.remove('scene-transition'); app.dataset.screen='intro';
    audio.setScene(null);
    state.started=true;
    activeIntro=new window.FadeoutIntro({
      mount:app, lines:D.prologue, stage:replay?'prologue':state.introStage, line:replay?0:state.introLine, reduced:reducedMotion(), sound:state.settings.sound,
      onCheckpoint:({stage,line})=>{ audio.setIntro(['prologue','approach','monitor','title'].includes(stage),stage==='prologue'?3000:0); if(!replay) { state.introStage=stage; state.introLine=line; persist(); } },
      onMotion:()=>{ state.settings.reducedMotion=!state.settings.reducedMotion; syncSettings(); persist(); },
      onSound:()=>setSound(!state.settings.sound),
      onComplete:()=>{
        activeIntro=null;
        monitorEntry=true;
        if(!replay) { state.introStage='guide'; persist(); }
        render('guide');
      },
    });
    activeIntro.setPaused(document.hidden);
    app.focus({preventScroll:true});
  }
  function resumeGame() {
    if(state.guideAccepted) render(state.route,false);
    else if(state.introStage==='guide') { monitorEntry=true; render('guide',false); }
    else startIntro();
  }
  function soundGate() {
    screen='sound'; app.dataset.screen='sound';
    document.body.classList.add('intro-active');
    document.querySelector('meta[name="theme-color"]').content='#f5f6f7';
    app.innerHTML=`<section class="sound-gate" aria-labelledby="sound-gate-title"><div class="sound-gate-card"><svg class="sound-gate-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 25h10l13-11v36L23 39H13Z"/><path d="M43 23a15 15 0 0 1 0 18m6-25a25 25 0 0 1 0 32"/></svg><span class="eyebrow">フェードアウトはセルフでお願いします。</span><h1 id="sound-gate-title">このゲームは音が鳴ります</h1><p>BGMと効果音があります。<br>お好みの音量でお楽しみください。</p><label class="sound-gate-volume" for="start-volume"><span>音量 <output id="start-volume-value">${state.settings.volume}%</output></span><input id="start-volume" type="range" min="0" max="100" value="${state.settings.volume}"></label><div class="sound-gate-actions">${button('sound-start','音をオンにして始める','solid-button')}${button('silent-start','音なしで始める','text-button')}</div><p class="small-note">${state.started ? '前回の続きから再開します。' : '音の設定は、あとから変更できます。'}</p></div></section>`;
    app.focus({preventScroll:true});
  }
  function guideView() {
    return terminal(`<div class="guide-copy"><h1 class="guide-title">ご利用案内</h1>${D.guide.map(p => `<p>${esc(p)}</p>`).join('')}<div class="guide-notes">${D.guideNotes.map(p => `<p>${esc(p)}</p>`).join('')}</div><p class="guide-signature">フェードアウトはセルフでお願いします。</p>${button('accept-guide', '確認しました →', 'solid-button')}</div>`, 'ご利用案内', '案内表示中', '操作受付中', true);
  }
  function topView() {
    const count = E.decided(state);
    return terminal(`<div class="reception-home"><div class="reception-welcome"><h2>${count === 4 ? 'お手続きが完了しました。' : count ? 'お手続きを再開してください。' : '手続きを開始してください。'}</h2><p class="terminal-intro">記憶の確認から消去まで、<br>1件ずつ順にご案内します。</p></div><div class="top-menu">${button('history', `<span class="service-icon">${menuIcon('history')}</span><span class="service-copy"><strong><span>記憶の履歴</span><span>確認・消去</span></strong><small>記憶を確認し、消去の手続きを行います</small></span><span class="service-arrow" aria-hidden="true">›</span>`, 'menu-card procedure-card')}${button('guide', `${menuIcon('guide')}<strong>ご利用案内</strong><span class="service-arrow" aria-hidden="true">›</span>`, 'menu-card guide-card')}</div><div class="reception-footnote"><span>最終操作の代行はできません。</span><span>手続き済み ${String(count).padStart(2,'0')} / 04</span></div></div>`, 'フェードアウト受付機', '操作受付中', '受付機 01');
  }
  function historyView() {
    const available = E.unlocked(state);
    const rows = D.memories.map((m, i) => {
      const open = i < available, choice = state.choices[i];
      const status = choice === 'erase' ? '消去済み' : choice === 'keep' ? '残すを選択' : open ? '手続きへ' : '未読込';
      return button('open-episode', `<span class="history-number">${m.id}</span><span><strong>${open ? esc(m.title) : `エピソード ${i + 1}`}</strong><small>${open ? esc(m.place) : '前のエピソードで選択すると読み込まれます'}</small></span><span class="history-state">${status}<span aria-hidden="true">${open ? ' ›' : ''}</span></span>`, `history-item ${choice ? 'is-complete' : ''}`, `data-index="${i}" ${open ? '' : 'disabled'} aria-label="エピソード${i + 1} ${open ? esc(m.title) : 'まだ読み込まれていません'} ${status}"`);
    }).join('');
    return terminal(`${progressView()}<h2>エピソードを選択してください</h2><div class="history-list">${rows}</div><p class="history-next-note">記憶を確認し、消去するか残すかを決めると、次のエピソードへ進みます。手続き後も、手続き前の記録を読み返せます。</p>${E.decided(state) === 4 ? button('summary', '手続き結果を見る', 'solid-button summary-link') : ''}<div class="terminal-bottom">${button('top', '← 受付機に戻る', 'outline-button')}${button('guide', 'ご利用案内', 'text-button')}</div>`, '記憶の履歴確認・消去', 'エピソード選択', '操作受付中');
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
      <div class="memory-header"><div class="memory-title"><span class="memory-no">${m.id}</span><div><h1>${esc(m.title)}</h1><span class="eyebrow">${state.active===0?'過去の記憶 / ':''}${esc(m.place)}${state.choices[state.active] ? ' / 手続き前の記録' : ''}</span></div></div>${button('episode', '手続き画面へ →', 'back-button')}</div>
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
      <div class="memory-controls"><p class="memory-help" id="progress-copy"></p>${button('finish-memory', state.choices[state.active] ? '手続き画面に戻る →' : '消去するか選ぶ →', 'solid-button finish-button', 'id="finish-button" disabled')}</div>
      <div class="exploration-tools">
        <details class="hint-panel"><summary>ヒント・表示</summary><div class="hint-content"><p id="hint-copy" role="status">進め方に迷ったら、次の手がかりを確認できます。</p>${button('hint', '次の手がかりを確認', 'outline-button')}${button('labels', '調べる場所を絵に表示', 'text-button', 'aria-pressed="false"')}</div></details>
        <details class="spot-picker"><summary>調べる場所の一覧</summary><div class="spot-picker-buttons">${spotButtons}</div></details>
      </div>
    </section>`;
  }
  function finalView() {
    const m = D.memories[state.active], choice = state.choices[state.active], ready = state.completed.includes(state.active);
    const current = state.active===0 && !choice ? `<section class="procedure-step"><div class="step-label"><span>01</span><h3>対象者の現状確認</h3><small>${state.present001.finished?'確認済み':state.present001.entered?'確認途中':'確認待ち'}</small></div><p>まず、この記憶を持つ人の今の様子を確認します。</p>${button('read-present',state.present001.entered?'今の様子をもう一度見る →':'対象者の現状を確認する →','solid-button read-present-button')}</section>` : '';
    const memoryStep=state.active===0&&!choice?'02':'01', choiceStep=state.active===0&&!choice?'03':'02';
    return terminal(`<div class="episode-heading"><span class="section-label">エピソード ${String(state.active + 1).padStart(2,'0')} / 04</span><h2>${esc(m.title)}</h2><p class="terminal-intro">${esc(m.place)} / 履歴 ${m.id}</p></div>
      ${current}<section class="procedure-step"><div class="step-label"><span>${memoryStep}</span><h3>記憶を確認する</h3><small>${ready ? '確認済み' : '確認待ち'}</small></div><p>${choice ? '手続き前に保存された記録を読み返せます。' : '記憶の中を調べてから、この記憶を消去するか選択してください。'}</p>${button('read-memory', choice ? '手続き前の記録を読む →' : ready ? '記憶をもう一度確認する →' : '記憶を確認する →', 'solid-button read-memory-button')}</section>
      <section class="procedure-step"><div class="step-label"><span>${choiceStep}</span><h3>${choice ? '手続きの結果' : '消去するか選ぶ'}</h3><small>${choice ? '手続き済み' : ready ? '選択可能' : '確認後に選択'}</small></div>${choice ? `<p class="recorded-choice">${choice === 'erase' ? 'この記憶の消去手続きは完了しています。' : 'この記憶は、消去せずに残しました。'}</p>${button('show-receipt', '手続き結果を見る →', 'outline-button')}` : `<p>対象は、残された人の中にある、<strong>このエピソードのあなたに関する記憶</strong>です。他のエピソードはそれぞれ選びます。</p>${ready ? `<div class="final-cautions"><h3>実行前の確認事項</h3><ul>${D.finalNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></div>` : ''}<div class="final-actions">${button('choose-erase', `<strong>この記憶を消去する</strong>`, `outline-button choice-button erase-card ${ready ? '' : 'is-locked'}`, 'aria-describedby="erase-feedback"')}${button('choose-keep', 'この記憶を残す', 'outline-button choice-button', ready ? '' : 'disabled')}</div><p class="inline-status" id="erase-feedback" role="status">${ready ? '記憶の確認が完了しました。消去するか、残すかを選択してください。' : '記憶を確認するまで、消去の操作はできません。'}</p>`}</section>
      <div class="terminal-bottom">${button('history', '← エピソード一覧へ', 'text-button')}<span class="small-note">最終操作の代行はできません。</span></div>`, '記憶の確認・消去', choice ? '手続き済み' : ready ? '選択待ち' : '記憶の確認待ち', 'エピソード別手続き');
  }
  function receiptView() {
    const m = D.memories[state.active], erased = state.choices[state.active] === 'erase';
    return terminal(`<div class="procedure-receipt"><svg class="receipt-check" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="32" cy="32" r="29"/><path d="m18 32 9 9 19-20"/></svg><span class="eyebrow">エピソード ${String(state.active + 1).padStart(2,'0')} / 04</span><h2>${erased ? '消去手続きが完了しました。' : 'この記憶を残しました。'}</h2><p>履歴 ${m.id}「${esc(m.title)}」</p><p class="receipt-note">${erased ? 'このエピソードの記憶を対象に、消去を実行しました。' : 'このエピソードの記憶は、消去せずに残します。'}</p><p class="small-note">${D.episodeReceipts[state.choices[state.active]]}</p>${button('next-episode', E.decided(state) === 4 ? 'すべての手続き結果へ →' : `エピソード ${E.decided(state) + 1} へ →`, 'solid-button next-episode-button')}${button('history', 'エピソード一覧へ', 'text-button')}</div>`, '手続き結果', '処理完了', '選択を保存しました');
  }
  function endingView() {
    const choice = state.endingChoice, e = D.endings[choice];
    const records = D.memories.map((m,i) => `<li><span>${m.id} ${esc(m.title)}</span><strong>${state.choices[i] === 'erase' ? '消去済み' : '残す'}</strong></li>`).join('');
    return `<section class="ending-screen" data-choice="${choice}"><div class="ending-top"><span>FADE OUT / ${esc(e.label)}</span><span>4件の手続き完了</span></div><div class="ending-layout"><div class="ending-art" role="img" aria-label="同じ椅子とカップの残る食卓。日が差している。">${choice === 'keep' ? '<span class="ending-flower" aria-hidden="true"></span>' : ''}</div><div class="ending-text"><span class="eyebrow">手続き結果</span><h1>${esc(e.heading)}</h1><ul class="choice-records" aria-label="エピソードごとの選択">${records}</ul>${e.text.map(p => `<p>${esc(p)}</p>`).join('')}<p class="sound-ending">♪ ${esc(e.caption)}</p>${button('review', '手続き前の記録を読み返す', 'outline-button')}<p class="small-note" style="margin-top:18px">記録の閲覧では、確定した選択は変更されません。</p></div></div></section>`;
  }
  function render(next, focus = true) {
    activeIntro?.dispose(); activeIntro=null;
    activePresent?.dispose();activePresent=null;
    audio.setIntro(false);
    activeButtonNoise?.dispose();activeButtonNoise=null;
    const previous = screen;
    clearTimeout(sceneTimer); screen = next;
    document.body.classList.remove('intro-active');
    document.body.classList.toggle('monitor-entry',next==='guide'&&monitorEntry);
    document.body.classList.toggle('guide-active',next==='guide');
    document.body.classList.toggle('monitor-session',['guide','top','history','final','receipt'].includes(next));
    document.body.classList.toggle('reception-home-active', next === 'top');
    document.querySelector('meta[name="theme-color"]').content='#f5f6f7';
    if (['top', 'history', 'present', 'memory', 'final', 'receipt', 'ending'].includes(next)) { state.route = next; persist(); }
    const views = { guide: guideView, top: topView, history: historyView, present: ()=>window.FadeoutPresent.markup(window.FadeoutPresentData), memory: memoryView, final: finalView, receipt: receiptView, ending: endingView };
    app.innerHTML = views[next](); app.dataset.screen = next;
    if(next==='final' && !state.completed.includes(state.active) && !state.choices[state.active]) activeButtonNoise=new window.FadeoutButtonNoise(app.querySelector('.erase-card'),{reduced:reducedMotion(),paused:document.hidden});
    app.classList.toggle('scene-transition', previous !== next && (next === 'memory' || previous === 'memory' || next === 'ending'));
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    audio.setScene(next === 'present' ? 'night' : next === 'memory' ? D.memories[state.active].ambience : ['top', 'guide', 'history', 'final', 'receipt'].includes(next) ? 'terminal' : null);
    if(next==='present') {activePresent=new window.FadeoutPresent({mount:app.querySelector('.present-page'),data:window.FadeoutPresentData,progress:state.present001,reduced:reducedMotion(),onChange:persist,onSound:id=>audio.play(id)});activePresent.setPaused(document.hidden);}
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
    document.getElementById('progress-copy').textContent = canFinish ? state.choices[state.active] ? '手続き前の記録を閲覧しています。選択結果は変更されません。' : '確認完了：手続き画面で、この記憶を消去するか選べます。' : '調査中：絵の印から調べられます。再調査で反応が変わることがあります。';
    const hintCopy = document.getElementById('hint-copy');
    if (hintCopy && hintCopy.dataset.revealed) hintCopy.textContent = getHint()?.text || '必要な断片を確認しました。閲覧を終えられます。';
    if (currentResponse) {
      document.getElementById('fragment-label').textContent = currentResponse.label;
      document.getElementById('narrative-content').innerHTML = `<p class="narrative-text">${esc(currentResponse.text)}</p>${currentResponse.blockedHint ? `<p class="narrative-hint">${esc(currentResponse.blockedHint)}</p>` : ''}`;
      document.getElementById('sound-caption').textContent = currentResponse.caption || m.ambienceCaption;
    }
  }
  function setSound(value) { state.settings.sound = value; syncSettings(); if(value) { audio.unlock(); audio.ui('tap'); activeIntro?.setAudioError(''); } audio.setScene(screen === 'present' ? 'night' : screen === 'memory' ? D.memories[state.active].ambience : ['top', 'guide', 'history', 'final', 'receipt'].includes(screen) ? 'terminal' : null); persist(); }
  // A capture listener covers native buttons, intro controls and dialog buttons alike.
  // Starting sound is handled below so both AudioContext.resume and media.play share the gesture.
  document.addEventListener('click', event => {
    const b=event.target.closest('button,summary,a[data-action]');
    if(!b || b.matches(':disabled') || ['sound-start','silent-start'].includes(b.dataset.action) || b.id==='sound-toggle' || b.dataset.presentAction || b.dataset.introAction==='sound' || !state.settings.sound) return;
    audio.unlock();
    const action=b.dataset.action || b.dataset.introAction || b.id;
    audio.ui(['confirm-yes','authenticate','accept-guide'].includes(action) ? 'confirm' : ['confirm-no','top','history','episode','review','skip'].includes(action) ? 'back' : ['inspect','next'].includes(action) ? 'soft' : 'tap');
  },true);
  function askConfirmation(title, copy, onConfirm, confirmLabel) {
    pendingConfirm = onConfirm; document.getElementById('confirm-title').textContent = title; document.getElementById('confirm-copy').textContent = copy; document.getElementById('confirm-yes').textContent = confirmLabel || 'この選択で進める'; confirmDialog.showModal(); document.getElementById('confirm-no').focus();
  }
  document.addEventListener('click', async event => {
    const b = event.target.closest('[data-action]'); if (!b) return; event.preventDefault();
    const action = b.dataset.action;
    if(action==='sound-start' || action==='silent-start') {
      state.settings.sound=action==='sound-start'; syncSettings();
      if(state.settings.sound) {audio.unlock();audio.ui('confirm');}
      persist();resumeGame();return;
    }
    if (action === 'settings') { syncSettings(); settingsDialog.showModal(); return; }
    if (action === 'reset') { settingsDialog.close(); askConfirmation('最初からやり直しますか？', 'このブラウザに保存した進行と、各エピソードの選択をリセットします。', () => { state = E.fresh(); currentResponse = null; hintsVisible = false; syncSettings(); persist(); startIntro(); }, '進行をリセットする'); return; }
    // ブラウザの自動再生制限に対応。音は明示的にONにするまで鳴らさない。
    if(state.settings.sound) await audio.unlock(); audio.configure(state.settings);
    switch (action) {
      case 'home': if(state.guideAccepted) render('top'); else startIntro(); break;
      case 'replay-prologue': settingsDialog.close(); startIntro(true); break;
      case 'guide': guideReturn = screen === 'history' ? 'history' : 'top'; render('guide'); break;
      case 'accept-guide': state.guideAccepted = true; state.started = true; state.introStage='done'; state.introLine=0; monitorEntry=false; persist(); render(guideReturn); break;
      case 'top': render('top'); break;
      case 'history': render('history'); break;
      case 'open-episode': { const index = Number(b.dataset.index); if (Number.isInteger(index) && index >= 0 && index < E.unlocked(state)) { state.active = index; render('final'); } break; }
      case 'episode': render('final'); break;
      case 'read-present': if(state.active===0 && !state.choices[0])render('present');break;
      case 'finish-present': if(screen==='present' && state.active===0){state.present001.finished=true;currentResponse=null;hintsVisible=false;persist();render('memory');}break;
      case 'read-memory': currentResponse = null; hintsVisible = false; render(state.active===0 && !state.choices[0] && !state.present001.finished?'present':'memory'); break;
      case 'open-memory': { const index = Number(b.dataset.index); if (index < E.unlocked(state)) { state.active = index; currentResponse = null; hintsVisible = false; render('memory'); } break; }
      case 'inspect':
        currentResponse = E.inspect(state, state.active, b.dataset.id);
        if (currentResponse) { persist(); audio.play(currentResponse.sound); updateMemory(); if (currentResponse.sound === 'pause') { const scene = document.getElementById('memory-scene'); scene.classList.add('inspection-paused'); clearTimeout(sceneTimer); sceneTimer = setTimeout(() => scene.classList.remove('inspection-paused'), 2000); } if (currentResponse.newlyComplete) announce('この記憶の閲覧を終えられます。'); } break;
      case 'hint': { const hint = getHint(); const copy = document.getElementById('hint-copy'); copy.dataset.revealed = 'true'; copy.textContent = hint?.text || '必要な断片を確認しました。閲覧を終えられます。'; announce(copy.textContent); if (hint) { centerScene(hint.target); const spot = document.querySelector(`.hotspot[data-id="${hint.target}"]`); spot?.focus({ preventScroll: true }); } break; }
      case 'scene-size': sceneExpanded = !sceneExpanded; document.getElementById('scene-pan-hint').hidden = !sceneExpanded; document.getElementById('scene-viewport').classList.toggle('is-expanded', sceneExpanded); b.textContent = sceneExpanded ? '全体を見る' : '大きく見る'; b.setAttribute('aria-pressed', String(sceneExpanded)); b.setAttribute('aria-label', sceneExpanded ? '絵を縮小して全体を見る' : '絵を拡大して左右に動かす'); centerScene(); break;
      case 'labels': hintsVisible = !hintsVisible; document.getElementById('memory-scene').classList.toggle('show-labels', hintsVisible); b.setAttribute('aria-pressed', String(hintsVisible)); b.textContent = hintsVisible ? '絵の表示を静かにする' : '調べる場所を絵に表示'; break;
      case 'finish-memory': if (E.finish(state, state.active)) { currentResponse = null; persist(); render(state.route); } break;
      case 'choose-erase': case 'choose-keep': {
        if (state.choices[state.active]) break;
        if (!state.completed.includes(state.active)) { audio.play('error'); activeButtonNoise?.trigger(); document.getElementById('erase-feedback').textContent = '操作できません。先に記憶を確認してください。'; break; }
        const choice = action === 'choose-erase' ? 'erase' : 'keep', index = state.active, m = D.memories[index];
        askConfirmation(choice === 'erase' ? 'この記憶を消去しますか？' : 'この記憶を残しますか？', `履歴${m.id}「${m.title}」だけが対象です。` + (choice === 'erase' ? '消去後の影響は確認できません。確定後は、この手続きの選択を変更できません。' : 'この記憶は消去せずに残します。確定後は、この手続きの選択を変更できません。'), () => { if (E.choose(state,index,choice)) { persist(); render('receipt'); } }, choice === 'erase' ? 'この記憶を消去する' : 'この記憶を残す'); break;
      }
      case 'show-receipt': if(state.choices[state.active]) render('receipt'); break;
      case 'next-episode': if(E.decided(state) === 4) render('ending'); else { state.active = E.decided(state); render('final'); } break;
      case 'summary': if(E.outcome(state)) render('ending'); break;
      case 'review': render('history'); break;
    }
  });
  document.getElementById('confirm-yes').addEventListener('click', () => { const operation = pendingConfirm; pendingConfirm = null; confirmDialog.close(); operation?.(); });
  document.getElementById('confirm-no').addEventListener('click', () => { pendingConfirm = null; confirmDialog.close(); });
  confirmDialog.addEventListener('cancel', () => { pendingConfirm = null; });
  document.getElementById('sound-toggle').addEventListener('click', () => setSound(!state.settings.sound));
  document.getElementById('sound-setting').addEventListener('change', event => setSound(event.target.checked));
  document.getElementById('volume-setting').addEventListener('input', event => { state.settings.volume = Number(event.target.value); audio.configure(state.settings); persist(); });
  document.addEventListener('input', event => { if(event.target.id==='start-volume') { state.settings.volume=Number(event.target.value); document.getElementById('start-volume-value').textContent=state.settings.volume+'%';audio.configure(state.settings); } });
  document.getElementById('motion-setting').addEventListener('change', event => { state.settings.reducedMotion = event.target.checked; syncSettings(); persist(); });
  document.addEventListener('visibilitychange', () => { activeIntro?.setPaused(document.hidden);activeButtonNoise?.setPaused(document.hidden);activePresent?.setPaused(document.hidden);audio.setPaused(document.hidden); if (!document.hidden && state.settings.sound) audio.setScene(screen === 'present' ? 'night' : screen === 'memory' ? D.memories[state.active].ambience : ['top', 'guide', 'history', 'final', 'receipt'].includes(screen) ? 'terminal' : null); });
  motionPreference.addEventListener('change',()=>{activeIntro?.setReduced(reducedMotion());activeButtonNoise?.setReduced(reducedMotion());activePresent?.setReduced(reducedMotion());});
  syncSettings();
  audio.onMusicError=()=>activeIntro?.setAudioError('BGMを再生できませんでした。「音 OFF」にしてから、もう一度オンにして再試行できます。');
  soundGate();
})();
