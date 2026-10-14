// Two read-only views, drawn outside the app so drawing them is never counted
// as a DOM write of the app:
// - the virtual DOM: the objects the components' render() returned
// - the real DOM: the nodes on the page, like the Elements panel in DevTools

import { outputOf } from "./tracker.js";

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
const DIM = "text-gray-500";
const STRING = "text-emerald-300";

function quote(text) {
  return `"${text}"`;
}

// ---- Virtual DOM ----

export function drawVirtualDOM(container, app) {
  const rows = new Map();
  const lines = [];

  function component(instance, vNode, depth, index) {
    const { name, vNode: output } = outputOf(instance);
    const key = vNode?.props?.key;
    const parts = [[`<${name}`, NAME]];
    if (key != null) {
      parts.push([" key=", DIM], [quote(key), KEY]);
    } else if (index != null) {
      parts.push([` key: none, position ${index + 1}`, DIM]);
    }
    parts.push([">", NAME]);
    if (instance.props.note) {
      parts.push(["  props.note.text=", DIM], [quote(instance.props.note.text), STRING]);
    }
    if (instance.state.mountedAs) {
      parts.push(["  state.mountedAs=", DIM], [quote(instance.state.mountedAs), STRING]);
    }
    const line = row(depth, parts);
    rows.set(instance, line);
    lines.push(line);
    node(output, depth + 1);
  }

  function node(vNode, depth, index) {
    if (vNode.fiberInstance) {
      component(vNode.fiberInstance, vNode, depth, index);
      return;
    }
    if (vNode.tag === undefined) {
      lines.push(row(depth, [[quote(vNode.value), STRING]]));
      return;
    }
    const [only] = vNode.children;
    if (vNode.children.length === 1 && only.tag === undefined && !only.fiberInstance) {
      lines.push(row(depth, [[`<${vNode.tag}>`, TAG], [quote(only.value), STRING], [`</${vNode.tag}>`, TAG]]));
      return;
    }
    lines.push(row(depth, [[`<${vNode.tag}>`, TAG]]));
    const isList = vNode.tag === "ul";
    vNode.children.forEach((child, i) => node(child, depth + 1, isList ? i : undefined));
  }

  component(app, null, 0);
  container.replaceChildren(...lines);
  return rows;
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
