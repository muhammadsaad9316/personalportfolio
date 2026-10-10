// On the local site: playwright-cli run-code --filename=scripts/project-routes-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const routes = ["/work", "/work/time-mardan", "/work/miru-closet", "/work/danx-detailing"];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(origin + route);
      if (response.status() !== 200) throw new Error(`${route}: ${response.status()}`);
      await page.evaluate(() => document.fonts.ready);
      if (await page.locator("main h1").count() !== 1) throw new Error(`${route}: missing title`);
      if (route !== "/work" && await page.locator("main section").count() !== 4) {
        throw new Error(`${route}: incomplete story`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`${route}: horizontal overflow at ${width}px`);
    }
  }
  const missing = await page.goto(origin + "/work/not-a-project");
  if (missing.status() !== 404) throw new Error("Unknown project should return 404");
  return "Four project routes passed at 1440px and 390px; unknown project returned 404.";
}
