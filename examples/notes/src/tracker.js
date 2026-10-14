// Watches the two kinds of "render" this demo is about:
//
// - framework renders: a component's render() ran. It only builds plain
//   JavaScript objects (the virtual DOM), so it's cheap.
// - DOM writes: the page's DOM really changed. MutationObserver sees every
//   node added or removed, every attribute and every text change.
//
// Components wrap what render() returns in `rendered(this, "Name", vNode)`.
// Everything that happens in one task is reported together.

// Wide-gamut colours from style.css (--color-render, --color-write): on a
// Display P3 screen they're brighter than any sRGB colour; elsewhere the
// browser maps them to the closest colour it can show.
function color(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const FLASH = { duration: 2400, easing: "cubic-bezier(0.2, 0, 0, 1)" };

const outputs = new WeakMap();
let renders = [];
let scheduled = false;
let silent = false;
let quiet = false;
let observer;
let records = [];
let onReport = () => {};

// The last tree each component returned, for the virtual DOM view.
export function outputOf(component) {
  return outputs.get(component);
}

export function rendered(component, name, vNode) {
  outputs.set(component, { name, vNode });
  if (!silent) {
    renders.push({ component, name });
  }
  schedule();
  return vNode;
}

// While silent, renders and DOM writes happen but aren't reported: the page
// uses it to replay the steps before the one it shows.
export function setSilent(value) {
  observer?.takeRecords();
  records = [];
  renders = [];
  silent = value;
}

// While quiet, nothing flashes and nothing logs: the page uses it to measure
// every step once, on load.
export function setQuiet(value) {
  quiet = value;
}

// Whether what happens now is shown to the visitor.
export function isShown() {
  return !silent && !quiet;
}

export function watch(root, callback) {
  onReport = callback;
  // The browser may deliver records here before flush() runs; keep them.
  observer = new MutationObserver((delivered) => records.push(...delivered));
  observer.observe(root, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
  });
}

function schedule() {
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(flush);
  }
}

function flush() {
  scheduled = false;
  if (silent) {
    return;
  }
  const writes = [...records, ...observer.takeRecords()].flatMap(describe);
  onReport({ renders, writes });
  records = [];
  renders = [];
}

export function flashRender(element) {
  if (quiet) {
    return;
  }
  element?.animate(
    [
      { outline: `3px solid ${color("--color-render")}`, outlineOffset: "-3px" },
      { outline: "3px solid transparent", outlineOffset: "-3px" },
    ],
    FLASH
  );
}

export function flashChange(element) {
  if (quiet) {
    return;
  }
  element?.animate([{ backgroundColor: color("--color-change") }, { backgroundColor: "transparent" }], FLASH);
}

export function flashWrite(element) {
  if (quiet) {
    return;
  }
  element?.animate([{ backgroundColor: color("--color-write") }, { backgroundColor: "transparent" }], FLASH);
}

function tag(node) {
  return node instanceof Element ? `<${node.localName}>` : "text";
}

// One entry per DOM write, counted the same way as in the tests against React.
// Writes inside an element that was already taken off the page (the framework
// empties removed elements) don't reach the page, so they aren't counted.
function describe(record) {
  if (!record.target.isConnected) {
    return [];
  }

  switch (record.type) {
    case "childList":
      return [
        ...[...record.addedNodes].map((node) => ({ text: `added ${tag(node)}`, node })),
        ...[...record.removedNodes].map((node) => ({ text: `removed ${tag(node)}`, node: record.target })),
      ];
    case "attributes":
      return [{ text: `set ${record.attributeName} on ${tag(record.target)}`, node: record.target }];
    case "characterData":
      return [{ text: `changed text in ${tag(record.target.parentElement)}`, node: record.target }];
    default:
      return [];
  }
}
