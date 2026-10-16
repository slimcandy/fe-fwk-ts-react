// The real DOM: the nodes on the page, like the Elements panel in DevTools.
// Drawn outside the app, so drawing it is never counted as a DOM write.

const TEXT = 3;
const ELEMENT = 1;

function row(depth, parts) {
  const div = document.createElement("div");
  div.className = "rounded-sm px-2 whitespace-pre";
  div.style.paddingLeft = `${0.5 + depth * 1.25}rem`;
  for (const [text, className] of parts) {
    const span = document.createElement("span");
    span.textContent = text;
    if (className) {
      span.className = className;
    }
    div.append(span);
  }
  return div;
}

const TAG = "text-sky-300";
const NAME = "text-amber-300";
const KEY = "text-fuchsia-300";
const DIM = "text-gray-400";
const STRING = "text-emerald-300";

function quote(text) {
  return `"${text}"`;
}

// ---- Real DOM ----

export function drawDOM(container, root) {
  const rows = new Map();
  const lines = [];

  function node(domNode, depth) {
    if (domNode.nodeType === TEXT) {
      const line = row(depth, [[quote(domNode.data), STRING]]);
      rows.set(domNode, line);
      lines.push(line);
      return;
    }
    if (domNode.nodeType !== ELEMENT) {
      return;
    }
    const tag = domNode.localName;
    if (tag === "input") {
      // `value` is a property, not an attribute: DevTools wouldn't show it.
      const line = row(depth, [
        ["<input>", TAG],
        ["  .value=", DIM],
        [quote(domNode.value), domNode.value ? STRING : DIM],
      ]);
      rows.set(domNode, line);
      lines.push(line);
      return;
    }
    const [only] = domNode.childNodes;
    if (domNode.childNodes.length === 1 && only.nodeType === TEXT) {
      const line = row(depth, [[`<${tag}>`, TAG], [only.data, "text-gray-100"], [`</${tag}>`, TAG]]);
      rows.set(domNode, line);
      rows.set(only, line);
      lines.push(line);
      return;
    }
    const line = row(depth, [[`<${tag}>`, TAG]]);
    rows.set(domNode, line);
    lines.push(line);
    for (const child of domNode.childNodes) {
      node(child, depth + 1);
    }
    lines.push(row(depth, [[`</${tag}>`, TAG]]));
  }

  for (const child of root.childNodes) {
    node(child, 0);
  }
  container.replaceChildren(...lines);
  return rows;
}
