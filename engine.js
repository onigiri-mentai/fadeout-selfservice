/* DOMから独立した進行・保存処理。調査条件はdata.jsだけで変更できます。 */
(function (root) {
  'use strict';
  const KEY = 'fadeout.prototype.v1';
  const fresh = () => ({ version: 1, started: false, guideAccepted: false, introStage: 'prologue', introLine: 0, route: 'top', active: 0, completed: [], memories: Array.from({ length: 4 }, () => ({ clues: [], effects: [] })), endingChoice: null, settings: { sound: false, volume: 35, reducedMotion: false } });
  const hasAll = (list, required) => required.every(id => list.includes(id));
  function load(storage) {
    try {
      const s = JSON.parse(storage.getItem(KEY));
      if (!s || s.version !== 1) return fresh();
      const state = fresh();
      state.started = !!s.started;
      state.guideAccepted = !!s.guideAccepted;
      state.introStage = state.guideAccepted ? 'done' : ['prologue','wide','approach','monitor','title','guide'].includes(s.introStage) ? s.introStage : 'prologue';
      state.introLine = Number.isInteger(s.introLine) ? Math.max(0,Math.min(root.FadeoutData.prologue.length-1,s.introLine)) : 0;
      state.settings = { sound: s.settings?.sound === true, volume: Math.max(0, Math.min(100, Number(s.settings?.volume) || 0)), reducedMotion: s.settings?.reducedMotion === true };
      if (Array.isArray(s.memories) && s.memories.length === 4) state.memories = s.memories.map(m => ({ clues: Array.isArray(m?.clues) ? m.clues.filter(v => typeof v === 'string') : [], effects: Array.isArray(m?.effects) ? m.effects.filter(v => typeof v === 'string') : [] }));
      // 完了履歴は必須断片を確認済みの連続した履歴だけ復元する。
      for (let i = 0; i < 4; i++) {
        if (s.completed?.includes(i) && canFinish(state, i) && (i === 0 || state.completed.includes(i - 1))) state.completed.push(i);
        else break;
      }
      state.active = Number.isInteger(s.active) && s.active >= 0 && s.active < unlocked(state) ? s.active : 0;
      state.endingChoice = state.completed.length === 4 && ['erase', 'keep'].includes(s.endingChoice) ? s.endingChoice : null;
      state.route = ['top', 'history', 'memory', 'final', 'ending'].includes(s.route) ? s.route : 'top';
      if (state.route === 'final' && state.completed.length < 4 || state.route === 'ending' && !state.endingChoice) state.route = 'top';
      return state;
    } catch { return fresh(); }
  }
  function save(storage, state) { try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
  function unlocked(state) { return Math.min(4, state.completed.length + 1); }
  function canFinish(state, index) { return hasAll(state.memories[index].clues, root.FadeoutData.memories[index].required); }
  function inspect(state, index, id) {
    if (index >= unlocked(state) || index < 0) return null;
    const memory = root.FadeoutData.memories[index];
    const spot = memory.hotspots.find(h => h.id === id);
    if (!spot) return null;
    const progress = state.memories[index];
    const variant = spot.variants?.find(v => hasAll(progress.clues, [...v.when, spot.id]));
    const blocked = spot.blocked && !hasAll(progress.clues, spot.blocked.unless);
    const before = canFinish(state, index);
    if (!blocked || variant) {
      if (!progress.clues.includes(id)) progress.clues.push(id);
      if (variant?.grant && !progress.clues.includes(variant.grant)) progress.clues.push(variant.grant);
      const effect = variant?.effect || spot.effect;
      if (effect && !progress.effects.includes(effect)) progress.effects.push(effect);
    }
    // 手だけは前提が揃った最初の調査で動く。再調査の強制はしない。
    let response = variant?.response || spot.base;
    if (spot.blocked && !blocked && !variant) {
      const unlockedVariant = spot.variants?.find(v => hasAll(progress.clues, v.when));
      if (unlockedVariant) {
        if (unlockedVariant.grant && !progress.clues.includes(unlockedVariant.grant)) progress.clues.push(unlockedVariant.grant);
        if (unlockedVariant.effect && !progress.effects.includes(unlockedVariant.effect)) progress.effects.push(unlockedVariant.effect);
        response = unlockedVariant.response;
      }
    }
    return { ...response, label: spot.label, blockedHint: blocked ? spot.blocked.hint : null, effect: progress.effects.at(-1), newlyComplete: !before && canFinish(state, index) };
  }
  function finish(state, index) {
    if (index >= unlocked(state) || !canFinish(state, index)) return false;
    if (!state.completed.includes(index)) state.completed.push(index);
    state.route = index === 3 ? 'top' : 'history';
    return true;
  }
  root.FadeoutEngine = { KEY, fresh, load, save, unlocked, canFinish, inspect, finish };
  if (typeof module !== 'undefined') module.exports = root.FadeoutEngine;
})(typeof window !== 'undefined' ? window : globalThis);
