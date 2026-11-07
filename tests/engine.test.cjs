const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.FadeoutData = require('../data.js');
const E = require('../engine.js');

function finishOne(state, i, choice = 'keep') {
  const sequences = [['chair', 'cup', 'hand', 'chair'], ['phone', 'hand', 'phone'], ['spoon', 'pudding', 'spoon'], ['plate', 'hand', 'plate']];
  for (const id of sequences[i]) E.inspect(state, i, id);
  assert.equal(E.canFinish(state, i), true);
  assert.equal(E.finish(state, i), true);
  assert.equal(E.choose(state, i, choice), true);
}
test('確認と選択を1件ずつ行い、選択確定までは次を解放しない', () => {
  const s = E.fresh();
  assert.equal(E.unlocked(s), 1);
  assert.equal(E.inspect(s, 1, 'phone'), null);
  assert.equal(E.finish(s, 0), false);
  assert.equal(E.choose(s, 0, 'erase'), false);
  for (const id of ['chair','cup','hand','chair']) E.inspect(s,0,id);
  assert.equal(E.choose(s,0,'erase'),false,'閲覧完了を確定してから選ぶ');
  assert.equal(E.finish(s,0),true);
  assert.equal(s.route,'final');
  assert.equal(E.unlocked(s),1);
  assert.equal(E.inspect(s,1,'phone'),null);
  assert.equal(E.choose(s,1,'keep'),false,'次のエピソードを飛ばせない');
  assert.equal(E.choose(s,0,'erase'),true);
  assert.equal(E.choose(s,0,'keep'),false,'確定した選択は上書きしない');
  assert.equal(E.unlocked(s),2);
  for (let i = 1; i < 4; i++) {
    finishOne(s, i);
    assert.equal(E.unlocked(s), Math.min(4, i + 2));
  }
  assert.deepEqual(s.completed, [0, 1, 2, 3]);
  assert.equal(s.route, 'receipt');
  assert.equal(s.endingChoice,'mixed');
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
  const s = E.fresh(); for (let i = 0; i < 4; i++) finishOne(s, i, 'erase');
  s.endingChoice = 'erase'; s.route = 'ending'; s.settings.sound = true;
  assert.equal(E.save(storage, s), true);
  assert.deepEqual(E.load(storage), s);
  value = '{bad'; assert.deepEqual(E.load(storage), E.fresh());
  value = JSON.stringify({ ...E.fresh(), completed: [0, 1, 2, 3], endingChoice: 'erase', route: 'ending' });
  assert.equal(E.load(storage).completed.length, 0);
  assert.equal(E.load(storage).endingChoice, null);
  assert.equal(E.save({ setItem() { throw new Error('quota'); } }, s), false);
});
test('導入の途中を保存し、v0.2以前のセーブは進行を保って再開できる', () => {
  const s=E.fresh(); s.started=true; s.introStage='approach'; s.introLine=3;
  const storage={getItem:()=>JSON.stringify(s)};
  assert.equal(E.load(storage).introStage,'approach');
  assert.equal(E.load(storage).introLine,3);
  s.introStage='title';
  assert.equal(E.load(storage).introStage,'title');
  s.introStage='authenticating';
  assert.equal(E.load(storage).introStage,'authenticating');
  s.introStage='authenticated';
  assert.equal(E.load(storage).introStage,'authenticated');
  finishOne(s,0); s.guideAccepted=true; s.active=1; s.route='history';
  delete s.introStage; delete s.introLine;
  const restored=E.load(storage);
  assert.equal(restored.introStage,'done');
  assert.deepEqual(restored.completed,[0]);
  assert.equal(restored.active,1);
  assert.equal(restored.route,'history');
});
test('消去・残すの全16組と、途中の選択・結果画面を復元できる', () => {
  for(let mask=0;mask<16;mask++) {
    const s=E.fresh();
    for(let i=0;i<4;i++) {
      finishOne(s,i,mask & (1<<i) ? 'erase' : 'keep');
      assert.deepEqual(E.load({getItem:()=>JSON.stringify(s)}),s);
    }
    assert.equal(s.endingChoice,mask===0?'keep':mask===15?'erase':'mixed');
  }
});
test('旧セーブの調査を保ち、未選択の結果は作らず、旧一括選択だけ引き継ぐ', () => {
  const old=E.fresh();
  for(let i=0;i<4;i++) finishOne(old,i);
  delete old.choices; delete old.flowVersion;
  old.endingChoice=null; old.route='final';old.active=3;
  let restored=E.load({getItem:()=>JSON.stringify(old)});
  assert.deepEqual(restored.completed,[0,1,2,3]);
  assert.deepEqual(restored.memories,old.memories);
  assert.deepEqual(restored.choices,[null,null,null,null]);
  assert.equal(restored.active,0);assert.equal(E.unlocked(restored),1);
  assert.equal(E.choose(restored,0,'erase'),true);assert.equal(E.unlocked(restored),2);
  old.endingChoice='erase';old.route='ending';
  restored=E.load({getItem:()=>JSON.stringify(old)});
  assert.deepEqual(restored.choices,['erase','erase','erase','erase']);
  assert.equal(restored.route,'ending');
  const invalid={...restored,choices:[null,'keep','keep','keep'],route:'receipt',active:3};
  restored=E.load({getItem:()=>JSON.stringify(invalid)});
  assert.deepEqual(restored.choices,[null,null,null,null]);
  assert.equal(restored.route,'final');assert.equal(restored.active,0);
});
