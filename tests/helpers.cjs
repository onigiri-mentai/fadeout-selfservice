async function enter(page, sound = false) {
  await page.locator('#app[data-screen="sound"]').waitFor();
  await page.locator(`[data-action="${sound ? 'sound-start' : 'silent-start'}"]`).click();
}
async function continuePresent(page) {
  if(await page.locator('#app[data-screen="present"]').count())await page.locator('[data-action="finish-present"]').click();
}
module.exports = { enter, continuePresent };
