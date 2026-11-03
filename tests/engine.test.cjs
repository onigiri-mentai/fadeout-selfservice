const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.FadeoutData = require('../data.js');
const E = require('../engine.js');

function finishOne(state, i) {
  const sequences = [['chair', 'cup', 'hand', 'chair'], ['phone', 'hand', 'phone'], ['spoon', 'pudding', 'spoon'], ['plate', 'hand', 'plate']];
  for (const id of sequences[i]) E.inspect(state, i, id);
  assert.equal(E.canFinish(state, i), true);
  assert.equal(E.finish(state, i), true);
}
test('履歴の順番と、閲覧終了による解放を守る', () => {
  const s = E.fresh();
  assert.equal(E.unlocked(s), 1);
  assert.equal(E.inspect(s, 1, 'phone'), null);
  assert.equal(E.finish(s, 0), false);
  for (let i = 0; i < 4; i++) {
    finishOne(s, i);
    assert.equal(E.unlocked(s), Math.min(4, i + 2));
  }
  assert.deepEqual(s.completed, [0, 1, 2, 3]);
  assert.equal(s.route, 'top');
  assert.equal(E.finish(s, 0), true);
  assert.equal(s.completed.length, 4);
});
test('001は手を先に調べても詰まらず、椅子を再調査して意味が変わる', () => {
  const s = E.fresh();
  const firstHand = E.inspect(s, 0, 'hand');
  assert.ok(firstHand.blockedHint);
  assert.equal(s.memories[0].clues.includes('hand'), false);
  const firstChair = E.inspect(s, 0, 'chair');
  E.inspect(s, 0, 'cup');
  const hand = E.inspect(s, 0, 'hand');
  assert.equal(hand.sound, 'pause');
  assert.ok(s.memories[0].effects.includes('reach'));
  assert.equal(E.canFinish(s, 0), false);
  const secondChair = E.inspect(s, 0, 'chair');
  assert.notEqual(secondChair.text, firstChair.text);
  assert.equal(secondChair.newlyComplete, true);
  assert.equal(E.canFinish(s, 0), true);
  assert.equal(s.memories[0].clues.includes('calendar'), false, '任意のカレンダーは強制しない');
});
test('後続履歴も、関連断片を先に見たときに再調査を省略しない', () => {
  const s = E.fresh(); finishOne(s, 0); finishOne(s, 1);
  E.inspect(s, 2, 'pudding');
  E.inspect(s, 2, 'spoon');
  assert.equal(E.canFinish(s, 2), false);
  E.inspect(s, 2, 'spoon');
  assert.equal(E.canFinish(s, 2), true);
});
test('全ての最初の調査順から、001を完了できる', () => {
  function permutations(list) { return list.length ? list.flatMap((v, i) => permutations(list.filter((_, j) => i !== j)).map(p => [v, ...p])) : [[]]; }
  for (const sequence of permutations(['chair', 'cup', 'calendar', 'hand'])) {
    const s = E.fresh(); sequence.forEach(id => E.inspect(s, 0, id));
    E.inspect(s, 0, 'hand'); E.inspect(s, 0, 'chair');
    assert.equal(E.canFinish(s, 0), true, sequence.join(','));
  }
});
test('保存・復元は調査と選択を保持し、壊れたデータと保存不可でも動く', () => {
  let value = null;
  const storage = { getItem: () => value, setItem: (_, v) => { value = v; } };
  const s = E.fresh(); for (let i = 0; i < 4; i++) finishOne(s, i);
  s.endingChoice = 'erase'; s.route = 'ending'; s.settings.sound = true;
  assert.equal(E.save(storage, s), true);
  assert.deepEqual(E.load(storage), s);
  value = '{bad'; assert.deepEqual(E.load(storage), E.fresh());
  value = JSON.stringify({ ...E.fresh(), completed: [0, 1, 2, 3], endingChoice: 'erase', route: 'ending' });
  assert.equal(E.load(storage).completed.length, 0);
  assert.equal(E.load(storage).endingChoice, null);
  assert.equal(E.save({ setItem() { throw new Error('quota'); } }, s), false);
});
