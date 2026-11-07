// 開発用。実際の操作で、4件の確認・選択・再開を通して検証する。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
globalThis.FadeoutData = require('../data.js');
const E = require('../engine.js');
const sequences = [['chair','cup','hand','chair'],['hand','phone','phone'],['pudding','spoon','spoon'],['hand','plate','plate']];
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport:{width:1365,height:1000}, reducedMotion:'reduce'});
  const page = await context.newPage(), errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400) errors.push(r.status()+' '+r.url());});
  const output = path.join(__dirname,'../test-results'); await fs.mkdir(output,{recursive:true});
  const action = name=>page.locator(`[data-action="${name}"]`);
  const inspect = id=>page.locator(`.hotspot[data-id="${id}"]`).click();
  const screen = name=>page.locator(`#app[data-screen="${name}"]`).waitFor();
  const noOverflow = async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const saved = ()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fadeout.prototype.v1')));
  const screenshot = name=>page.screenshot({path:path.join(output,name),fullPage:true});
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await screen('intro'); await screenshot('intro-black.png');
    await page.locator('[data-intro-action="skip"]').click(); await screen('guide');
    await page.getByText('当機では、手放したい記憶の確認・整理・消去を受け付けております。',{exact:true}).waitFor();
    await action('accept-guide').click(); await screen('top');
    assert.equal(await page.locator('.top-menu button').count(),2);
    await page.getByRole('button',{name:/記憶の履歴確認・消去/}).waitFor();
    const main = await page.locator('.procedure-card').boundingBox(), guide = await page.locator('.guide-card').boundingBox();
    assert.ok(guide.width<main.width && guide.y>main.y+main.height && guide.x>main.x,'主ボタンの下・右寄せに利用案内');
    assert.equal(await page.locator('[data-action="erase"]').count(),0);
    assert.equal(await page.locator('body').evaluate(b=>getComputedStyle(b).backgroundColor),'rgb(245, 246, 247)');
    await screenshot('terminal-desktop.png');
    for(const width of [390,320]) {await page.setViewportSize({width,height:844});await noOverflow();}
    await page.setViewportSize({width:390,height:844});await screenshot('terminal-mobile.png');
    await action('history').click(); await screen('history');
    assert.equal(await page.locator('.history-item:disabled').count(),3);
    await page.locator('[data-index="0"]').click();await screen('final');
    assert.equal(await action('choose-keep').isDisabled(),true);
    await action('choose-erase').click();await screen('final');
    assert.deepEqual((await saved()).choices,[null,null,null,null]);
    await page.reload();await screen('final');await screenshot('episode-before-mobile.png');
    await action('read-memory').click();await screen('memory');
    assert.equal(await page.locator('#finish-button').isDisabled(),true);
    await inspect('hand');assert.ok(await page.locator('.narrative-hint').textContent());
    await inspect('chair');const before=await page.locator('.narrative-text').textContent();
    await inspect('cup');await inspect('calendar');await inspect('hand');
    await page.locator('.effect-reach').waitFor();
    assert.equal(await page.locator('#finish-button').isDisabled(),true);
    const geometry=await page.locator('#memory-scene').evaluate(s=>({w:s.clientWidth,h:s.clientHeight,view:s.parentElement.clientWidth}));
    assert.ok(geometry.w>geometry.view*1.3 && Math.abs(geometry.w/geometry.h-2)<.02);
    assert.equal(await page.locator('.hint-panel').getAttribute('open'),null);
    assert.equal(await page.locator('.spot-picker').getAttribute('open'),null);
    await action('scene-size').click();assert.equal(await page.locator('#scene-pan-hint').isVisible(),false);
    await action('scene-size').click();await inspect('chair');
    assert.notEqual(await page.locator('.narrative-text').textContent(),before);
    assert.equal(await page.locator('#finish-button').isEnabled(),true);
    await noOverflow();await screenshot('memory001-mobile.png');
    await page.setViewportSize({width:1365,height:1000});await screenshot('memory001-desktop.png');
    await page.reload();await screen('memory');
    // 戻るだけでは確認完了や次の解放にならない。
    await action('episode').click();await screen('final');assert.equal(await action('choose-keep').isDisabled(),true);
    await action('read-memory').click();await action('finish-memory').click();await screen('final');
    assert.equal(await action('choose-keep').isEnabled(),true);
    assert.equal(await page.locator('.erase-noise').count(),0,'確認後にノイズの更新を止める');
    await action('history').click();assert.equal(await page.locator('.history-item:disabled').count(),3,'確認だけでは解放しない');
    await page.locator('[data-index="0"]').click();await screen('final');
    await page.setViewportSize({width:390,height:844});await noOverflow();await screenshot('final-mobile.png');
    await action('choose-erase').click();await page.locator('#confirm-no').click();
    assert.deepEqual((await saved()).choices,[null,null,null,null],'キャンセルは選択を保存しない');
    const choices=['keep','erase','keep','erase'];
    for(let i=0;i<4;i++) {
      if(i>0) {
        await screen('final');await action('read-memory').click();await screen('memory');
        for(const id of sequences[i]) await inspect(id);
        await action('finish-memory').click();await screen('final');
      }
      await action('choose-'+choices[i]).click();
      assert.ok((await page.locator('#confirm-copy').textContent()).includes(`履歴00${i+1}「`));
      await page.locator('#confirm-yes').click();await screen('receipt');await noOverflow();
      assert.deepEqual((await saved()).choices,choices.map((c,j)=>j<=i?c:null));
      await page.reload();await screen('receipt');if(i===0) await screenshot('receipt-mobile.png');
      await action('next-episode').click();
      if(i<3) {await screen('final');assert.equal((await saved()).active,i+1);assert.equal(await action('choose-keep').isDisabled(),true);}
    }
    await screen('ending');assert.equal(await page.locator('.ending-screen').getAttribute('data-choice'),'mixed');
    assert.equal(await page.locator('.choice-records li').count(),4);
    await screenshot('results-mobile.png');await page.reload();await screen('ending');
    await action('review').click();await screen('history');
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'4');
    assert.equal(await page.locator('.history-item:disabled').count(),0);
    await page.locator('[data-index="0"]').focus();await page.keyboard.press('Enter');await screen('final');
    assert.equal(await action('choose-erase').count(),0,'確定後の選択は読み返しても変えない');
    await action('read-memory').click();await screen('memory');
    await page.locator('.hotspot[data-id="chair"]').focus();await page.keyboard.press('Space');
    await page.locator('#fragment-label').filter({hasText:'空いた椅子'}).waitFor();
    await page.locator('.hint-panel summary').click();await action('hint').click();
    await page.locator('.spot-picker summary').click();await page.locator('.spot-picker [data-id="calendar"]').click();
    await page.locator('#fragment-label').filter({hasText:'カレンダー'}).waitFor();
    await action('finish-memory').click();await screen('final');assert.deepEqual((await saved()).choices,choices);
    await page.setViewportSize({width:320,height:640});await noOverflow();
    await action('history').click();await noOverflow();await action('top').click();await noOverflow();
    await action('settings').click();await page.locator('#motion-setting').check();await page.locator('#sound-setting').check();
    await page.locator('#volume-setting').fill('0');await page.getByRole('button',{name:'設定を閉じる'}).click();
    await action('settings').click();await action('reset').click();await page.locator('#confirm-no').click();await screen('top');
    assert.deepEqual((await saved()).choices,choices);
    // 旧版で一括選択をしたセーブも、両方の結末を表示できる。
    for(const choice of ['erase','keep']) {
      const old=E.fresh();old.started=true;old.guideAccepted=true;
      for(let i=0;i<4;i++){for(const id of sequences[i]) E.inspect(old,i,id);E.finish(old,i);E.choose(old,i,choice);}
      delete old.choices;delete old.flowVersion;old.endingChoice=choice;old.route='ending';
      await page.evaluate(value=>localStorage.setItem('fadeout.prototype.v1',value),JSON.stringify(old));
      await page.reload();await screen('ending');
      assert.equal(await page.locator('.ending-screen').getAttribute('data-choice'),choice);
      assert.equal(await page.locator('.choice-records strong').filter({hasText:choice==='erase'?'消去済み':'残す'}).count(),4);
    }
    assert.deepEqual(errors,[]);
    console.log('Browser passed: grey/white menu layout, four separate choices, confirmation/cancel, next episode, mixed/all endings, archived review, save/resume, legacy saves, keyboard/settings, 320/390/1365px.');
  } finally {await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
