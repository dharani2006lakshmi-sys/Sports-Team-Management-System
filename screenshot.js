const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new"
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///D:/backup git/coachhub/index.html', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'D:\\backup git\\coachhub\\preview.png' });
  await browser.close();
})();
