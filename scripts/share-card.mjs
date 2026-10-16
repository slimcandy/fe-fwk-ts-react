// Makes the link-preview card (Open Graph, 1200×630) and the home-screen icon
// (180×180) from the page itself, into examples/notes/public/share/.
// Run after `npm run build:site`, against the local preview:
//   npm start &
//   node scripts/share-card.mjs [url]
// The card is an sRGB JPEG: link previews often drop colour profiles.
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const out = new URL("../examples/notes/public/share/", import.meta.url);
const browser = await chromium.launch();

// The card: the title, the lead and the step slider, in the light scheme.
const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: "light" });
await card.goto(url, { waitUntil: "networkidle" });
await card.evaluate(() => document.fonts.ready);
await card.addStyleTag({
  content: `
    nav, #demo > :not(:nth-child(3)), #how, #run, footer { display: none !important }
    body > div { padding-top: 3.25rem !important }
    header { max-width: 62rem !important }
    h1 { font-size: 4.75rem !important; line-height: 1.05 !important }
    header p.text-lg\\/8 { font-size: 1.4rem !important; line-height: 2rem !important; margin-top: 1.5rem !important }
    #demo { margin-top: 2.25rem !important }
  `,
});
// Step 3 of 6, so the track is part filled and the two counts aren't zero.
await card.evaluate(() => {
  const slider = document.getElementById("step-top");
  slider.value = "2";
  slider.dispatchEvent(new Event("input"));
});
await card.waitForTimeout(2600); // the flashes fade out
await card.screenshot({
  path: new URL("card-1200x630.jpg", out).pathname,
  type: "jpeg",
  quality: 88,
  animations: "disabled",
});

// The icon: the favicon's three bars on a square; iOS rounds the corners itself.
const svg = await (await card.request.get(new URL("/favicon.svg", url).href)).text();
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<body style="margin:0;background:#111827">${svg
    .replace('<rect width="32" height="32" rx="7"', '<rect width="32" height="32"')
    .replace("<svg ", '<svg width="180" height="180" ')}</body>`
);
await icon.screenshot({ path: new URL("apple-touch-icon.png", out).pathname });

await browser.close();
console.log("share card and icon written to examples/notes/public/share/");
