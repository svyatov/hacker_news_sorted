import { captureVariants, injectExtension, setupBrowser } from './screenshots/browser';
import { SCREENSHOT_VIEWPORT } from './screenshots/constants';

async function main() {
  const { browser, page } = await setupBrowser({ viewport: SCREENSHOT_VIEWPORT });
  await injectExtension(page);
  await captureVariants(page);
  await browser.close();
  console.log('Done! All screenshots generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
