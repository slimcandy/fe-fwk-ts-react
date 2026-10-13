// Watches the two kinds of "render" this demo is about:
//
// - framework renders: a component's render() ran. It only builds plain
//   JavaScript objects (the virtual DOM), so it's cheap.
// - DOM writes: the browser's DOM really changed. MutationObserver sees every
//   node added or removed, every attribute and every text change.
//
// Components call `rendered(this)` from render(); event handlers call
// `action("…")`. Everything that happens in one task is reported together.

const RENDER = [
  { outline: "2px solid rgb(245 158 11 / 0.9)", outlineOffset: "-2px" },
  { outline: "2px solid rgb(245 158 11 / 0)", outlineOffset: "-2px" },
];
const WRITE = [
  { backgroundColor: "rgb(45 212 191 / 0.45)" },
  { backgroundColor: "rgb(45 212 191 / 0)" },
];

let renders = [];
let label = "First render";
let scheduled = false;
let observer;
let onReport = () => {};

function schedule() {
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(flush);
  }
}

export function rendered(component, name) {
  renders.push({ component, name });
  schedule();
}

export function action(text) {
  label = text;
  schedule();
}

export function watch(root, callback) {
  onReport = callback;
  observer = new MutationObserver(() => {});
  observer.observe(root, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
  });
}

function flush() {
  scheduled = false;
  const records = observer.takeRecords();
  const writes = records.flatMap(describe);

  for (const { component } of renders) {
    const element = component.firstDOMElement;
    if (element instanceof HTMLElement) {
      element.animate(RENDER, { duration: 900, easing: "ease-out" });
    }
  }
  for (const { flash } of writes) {
    flash?.animate(WRITE, { duration: 900, easing: "ease-out" });
  }

  onReport({
    label,
    renders: renders.map(({ name }) => name),
    writes: writes.map(({ text }) => text),
  });
  renders = [];
  label = "";
}

function tag(node) {
  return node instanceof Element ? `<${node.localName}>` : "text";
}

function visible(node) {
  return node instanceof HTMLElement ? node : node.parentElement;
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
        ...[...record.addedNodes].map((node) => ({
          text: `added ${tag(node)}`,
          flash: visible(node),
        })),
        ...[...record.removedNodes].map((node) => ({
          text: `removed ${tag(node)}`,
        })),
      ];
    case "attributes":
      return [
        {
          text: `set ${record.attributeName} on ${tag(record.target)}`,
          flash: visible(record.target),
        },
      ];
    case "characterData":
      return [
        {
          text: `changed text in ${tag(record.target.parentElement)}`,
          flash: visible(record.target),
        },
      ];
    default:
      return [];
  }
}
