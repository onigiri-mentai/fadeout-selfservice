const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {enter}=require('./helpers.cjs');
const E=require('../engine.js');
const URL=process.env.GAME_URL||'http://127.0.0.1:8000';
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference',hasTouch:true});
  const initial=E.fresh();initial.started=true;initial.guideAccepted=true;
  await context.addInitScript(s=>{if(!localStorage.getItem('fadeout.prototype.v1'))localStorage.setItem('fadeout.prototype.v1',s);},JSON.stringify(initial));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  const act=a=>page.locator(`[data-action="${a}"]`),present=a=>page.locator(`.present-hotspot[data-present-action="${a}"]`);
  const screen=s=>page.locator(`#app[data-screen="${s}"]`).waitFor();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fadeout.prototype.v1')));
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const output=path.join(__dirname,'../test-results');await fs.mkdir(output,{recursive:true});
  try{
    await page.goto(URL);await enter(page);await screen('top');await act('history').click();await page.locator('[data-index="0"]').click();await screen('final');
    await act('read-present').click();await screen('present');await page.locator('.present-image').evaluate(i=>i.decode());
    assert.equal(await page.locator('.present-hotspot').count(),3,'記憶画面と共通の丸印で場所を示す');
    assert.equal(await page.locator('.present-hand,.reach-token,.reach-rail').count(),0,'主人公の姿や手の操作UIを描かない');
    assert.equal(await page.locator('.present-places').evaluate(e=>e.open),false,'場所一覧は最初は閉じる');
    assert.equal(await act('finish-present').isEnabled(),true,'操作順や待機を強制しない');
    assert.ok((await page.locator('.present-response').textContent()).includes('嗚咽'));
    await noOverflow();await page.screenshot({path:path.join(output,'present-mobile.png'),fullPage:true});
    // スマホでも直接絵の丸印を押せる。手の絵やドラッグは使わない。
    for(const spot of await page.locator('.present-hotspot').all()){
      const box=await spot.boundingBox();assert.ok(box.width>=44 && box.height>=44);
      assert.ok(await spot.locator('.spot-dot').isVisible());
    }
    await present('reach').tap();
    await page.screenshot({path:path.join(output,'present-reach-mobile.png'),fullPage:true});
    assert.equal((await saved()).present001.reach,1);assert.ok((await page.locator('.present-response').textContent()).includes('触れられない'));
    await present('reach').focus();await page.keyboard.press('Enter');
    assert.equal((await saved()).present001.reach,2);assert.ok((await page.locator('.present-response').textContent()).includes('もう一度'));
    // タッチ操作、再タップ、何も動かない小物に異なる反応。
    await present('window').tap();assert.equal((await saved()).present001.window,1);
    assert.ok((await page.locator('.present-response').textContent()).includes('涙は、まだ止まっていない'));
    assert.equal(await page.locator('.has-breeze').count(),1);
    await present('object').focus();await page.keyboard.press('Space');assert.ok((await page.locator('.present-response').textContent()).includes('画面は暗いまま'));
    const before=await saved();await page.reload();await enter(page);await screen('present');
    assert.deepEqual((await saved()).present001,before.present001,'途中の試みと文章を復元');
    assert.equal(await page.locator('.present-stage.is-near').count(),1);
    await act('settings').click();await page.locator('#motion-setting').check();await page.getByRole('button',{name:'設定を閉じる'}).click();
    await present('window').click();assert.equal(await page.locator('.present-curtain').evaluate(e=>getComputedStyle(e).animationName),'none');
    await present('reach').click();assert.equal(await page.locator('.present-hand').count(),0);
    await page.locator('.present-places summary').click();
    await page.locator('.present-actions [data-present-action="object"]').click();
    assert.ok((await page.locator('.present-response').textContent()).includes('画面は暗いまま'));
    await page.locator('.present-places summary').click();
    for(const width of [320,1365]){await page.setViewportSize({width,height:900});await noOverflow();}
    await page.screenshot({path:path.join(output,'present-desktop.png'),fullPage:true});
    await act('settings').click();await page.locator('#volume-setting').fill('0');await page.locator('#sound-setting').check();await page.getByRole('button',{name:'設定を閉じる'}).click();await present('window').click();
    assert.equal(await page.locator('#intro-bgm').evaluate(m=>m.paused),true,'OP曲は現状確認で流れない');
    await act('finish-present').click();await screen('memory');assert.equal((await saved()).present001.finished,true);
    assert.ok((await page.locator('.memory-title').textContent()).includes('過去の記憶'));
    for(const id of ['chair','cup','hand','chair'])await page.locator(`.hotspot[data-id="${id}"]`).click();
    await act('finish-memory').click();await screen('final');assert.equal(await act('choose-keep').isEnabled(),true);
    assert.equal(await page.locator('.erase-noise').count(),0);await act('choose-keep').click();await page.locator('#confirm-yes').click();await screen('receipt');
    assert.equal((await saved()).choices[0],'keep');await act('next-episode').click();await screen('final');assert.equal((await saved()).active,1);
    assert.equal(await act('read-present').count(),0,'002〜004へは展開しない');await act('read-memory').click();await screen('memory');
    assert.deepEqual(errors,[]);
    // 窓辺→背中の逆順でも成立し、やり直しのタップを要求しない。
    const other=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const start=E.fresh();start.started=true;start.guideAccepted=true;start.route='present';
    await other.addInitScript(s=>localStorage.setItem('fadeout.prototype.v1',s),JSON.stringify(start));
    const reverse=await other.newPage();await reverse.goto(URL);await enter(reverse);
    await reverse.locator('.present-hotspot[data-present-action="window"]').click();await reverse.locator('.present-hotspot[data-present-action="reach"]').click();
    assert.ok((await reverse.locator('.present-response').textContent()).includes('感触はない'));
    await reverse.locator('[data-action="finish-present"]').click();await reverse.locator('#app[data-screen="memory"]').waitFor();await other.close();
    console.log('Present001 passed: invisible protagonist, subtle hotspots, tap/keyboard/list, distinct unreachable touch and breeze, repeats/reverse order, no mandatory wait, captions/mute/reduced motion, 320/390/1365px, save/resume, current→memory→unchanged choice, no other-episode expansion.');
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
