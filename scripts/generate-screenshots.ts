import { captureVariants, injectExtension, setupBrowser } from './screenshots/browser';

async function main() {
  const { browser, page } = await setupBrowser();
  await injectExtension(page);
  await captureVariants(page);
  await browser.close();
  console.log('Done! All screenshots generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
