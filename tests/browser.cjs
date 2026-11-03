// 開発用。PlaywrightとChromiumを用意した環境で npm run test:browser。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const screenshotDirectory = path.join(__dirname, '../test-results');
  await fs.mkdir(screenshotDirectory, { recursive: true });
  const action = name => page.locator(`[data-action="${name}"]`);
  const inspect = id => page.locator(`.hotspot[data-id="${id}"]`).click();
  const screen = async name => { await page.locator(`#app[data-screen="${name}"]`).waitFor(); };
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await screen('title'); await page.screenshot({ path: path.join(screenshotDirectory, 'title-desktop.png'), fullPage: true });
    await action('start').click(); await screen('prologue');
    await action('prologue-next').click(); await screen('guide');
    assert.ok(await page.getByText('当機では、手放したい記憶の確認・整理・消去を受け付けております。', { exact: true }).isVisible());
    await action('accept-guide').click(); await screen('top');
    await page.screenshot({ path: path.join(screenshotDirectory, 'terminal-desktop.png'), fullPage: true });
    await action('erase').click();
    await page.getByText('操作を受け付けられません。消去対象を確認できません。', { exact: true }).waitFor();
    await screen('top'); await action('history').click();
    assert.equal(await page.locator('.history-item:disabled').count(), 3);
    await page.locator('[data-index="0"]').click(); await screen('memory');
    assert.equal(await page.locator('#finish-button').isDisabled(), true);
    await inspect('hand'); assert.ok(await page.locator('.narrative-hint').textContent());
    await inspect('chair'); const chairBefore = await page.locator('.narrative-text').textContent();
    await inspect('cup'); await inspect('calendar'); await inspect('hand');
    await page.locator('.effect-reach').waitFor();
    assert.equal(await page.locator('#finish-button').isDisabled(), true);
    await page.screenshot({ path: path.join(screenshotDirectory, 'memory001-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await noOverflow();
    await inspect('chair');
    assert.notEqual(await page.locator('.narrative-text').textContent(), chairBefore);
    assert.equal(await page.locator('#finish-button').isEnabled(), true);
    await page.screenshot({ path: path.join(screenshotDirectory, 'memory001-mobile.png'), fullPage: true });
    // 再開時も同じ調査状態。戻る操作だけでは次を解放しない。
    await page.reload(); await action('start').click(); await screen('memory');
    assert.equal(await page.locator('#finish-button').isEnabled(), true);
    await action('history').click(); assert.equal(await page.locator('.history-item:disabled').count(), 3);
    await page.locator('[data-index="0"]').click(); await action('finish-memory').click();
    await screen('history'); assert.equal(await page.locator('.history-item:disabled').count(), 2);
    for (const [index, sequence] of [[1, ['hand', 'phone', 'phone']], [2, ['pudding', 'spoon', 'spoon']], [3, ['hand', 'plate', 'plate']]]) {
      await page.locator(`[data-index="${index}"]`).click(); await screen('memory'); await noOverflow();
      for (const id of sequence) await inspect(id);
      assert.equal(await page.locator('#finish-button').isEnabled(), true);
      await action('finish-memory').click();
    }
    await screen('top'); await noOverflow(); assert.equal(await page.locator('.is-locked').count(), 0);
    await page.screenshot({ path: path.join(screenshotDirectory, 'terminal-mobile.png'), fullPage: true });
    await action('erase').click(); await screen('final'); await noOverflow();
    await page.screenshot({ path: path.join(screenshotDirectory, 'final-mobile.png'), fullPage: true });
    await action('choose-erase').click(); await page.locator('#confirm-no').click(); await screen('final');
    await action('choose-erase').click(); await page.locator('#confirm-yes').click(); await screen('ending');
    assert.equal(await page.locator('.ending-screen').getAttribute('data-choice'), 'erase'); await noOverflow();
    await page.reload(); await action('start').click(); await screen('ending');
    await action('review').click(); await action('erase').click(); await action('choose-keep').click(); await page.locator('#confirm-yes').click(); await screen('ending');
    assert.equal(await page.locator('.ending-screen').getAttribute('data-choice'), 'keep');
    await action('settings').click(); await page.locator('#motion-setting').check();
    assert.equal(await page.locator('body').evaluate(b => b.classList.contains('reduced-motion')), true);
    await page.locator('#sound-setting').check(); assert.equal(await page.locator('#sound-toggle').textContent(), '音 ON');
    await page.locator('#volume-setting').fill('0');
    await page.getByRole('button', { name: '設定を閉じる' }).click();
    // キーボードだけで記録へ戻る。
    await action('review').focus(); await page.keyboard.press('Enter'); await screen('top');
    await action('history').focus(); await page.keyboard.press('Enter'); await screen('history');
    await page.locator('[data-index="0"]').focus(); await page.keyboard.press('Enter'); await screen('memory');
    await page.locator('.hotspot[data-id="chair"]').focus(); await page.keyboard.press('Space');
    await page.locator('#fragment-label').filter({ hasText: '空いた椅子' }).waitFor();
    await page.setViewportSize({ width: 320, height: 640 }); await noOverflow();
    await action('history').click(); await noOverflow(); await action('top').click(); await noOverflow();
    await action('settings').click(); await action('reset').click(); await page.locator('#confirm-no').click(); await screen('top');
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: 4 memories, revisit changes, both endings, save/resume, keyboard, settings, widths 320/390/1365.');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
