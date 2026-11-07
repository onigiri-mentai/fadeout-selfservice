async function enter(page, sound = false) {
  await page.locator('#app[data-screen="sound"]').waitFor();
  await page.locator(`[data-action="${sound ? 'sound-start' : 'silent-start'}"]`).click();
}
module.exports = { enter };
