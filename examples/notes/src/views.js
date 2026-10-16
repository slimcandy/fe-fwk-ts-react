// The table under the slider: one row per position, as in the course's
// "props / useState / input" table. It compares snapshots taken before and
// after a step; a changed cell shows its old value struck through.

import { flashChange, outputOf } from "./tracker.js";

// Note instances are numbered in mount order; the table doesn't show the
// numbers, it uses them to tell which component was unmounted.
let ids = new WeakMap();
let nextId = 1;

export function resetIds() {
  ids = new WeakMap();
  nextId = 1;
}

export function idOf(instance) {
  if (!ids.has(instance)) {
    ids.set(instance, nextId++);
  }
  return ids.get(instance);
}

// The notes, in order. Read from the tree App.render() returned last, and
// from the DOM for the inputs.
export function snapshot(app) {
  const ul = findUl(outputOf(app).vNode);
  return ul.children.map((vNode) => {
    const instance = vNode.fiberInstance;
    return {
      id: idOf(instance),
      key: vNode.props.key,
      text: instance.props.note.text,
      state: instance.state.mountedAs,
      input: instance.firstDOMElement.querySelector("input").value,
    };
  });
}

function findUl(vNode) {
  if (vNode.tag === "ul") {
    return vNode;
  }
  for (const child of vNode.children ?? []) {
    const found = !child.fiberInstance && findUl(child);
    if (found) {
      return found;
    }
  }
  return null;
}

function el(tag, className, ...children) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  element.append(...children.filter((child) => child != null));
  return element;
}

// One line per value: long texts end with "…", the full text is in the tooltip.
function value(text, className = "") {
  const span = el("span", `block max-w-[11ch] truncate ${className}`, text === "" ? "—" : text);
  span.title = text;
  return span;
}

function quoted(text) {
  return text ? `"${text}"` : "";
}

const CELL = "px-3 py-2 align-top first:pl-4 last:pr-4";
const OLD = "text-gray-400 line-through decoration-gray-400";

export function drawTable(container, before, after) {
  const head = el(
    "tr",
    "",
    ...["Position", "Key", "props", "state", "<input>"].map((title) =>
      el("th", `${CELL} text-left font-semibold whitespace-nowrap text-white`, title)
    )
  );

  const changed = [];
  const rows = after.map((row, index) => {
    const old = before[index];
    const cells = [
      { text: String(index + 1) },
      { text: row.key ?? "none", className: row.key == null ? "text-gray-400" : "text-fuchsia-300" },
      { text: row.text, then: old?.text },
      { text: row.state, then: old?.state },
      { text: quoted(row.input), then: old && quoted(old.input), className: "text-sky-300" },
    ];
    const isNew = before.length > 0 && old == null;
    const tr = el("tr", isNew ? "bg-emerald-400/10" : "");
    if (isNew) {
      changed.push(tr);
    }

    tr.append(
      ...cells.map(({ text, then, className = "" }, column) => {
        const td = el("td", CELL, value(text, className));
        if (column === 0 && isNew) {
          td.append(value("new", "text-emerald-300"));
        } else if (column >= 2 && old != null && then !== text) {
          td.append(value(then, OLD));
          changed.push(td);
        }
        return td;
      })
    );
    return tr;
  });

  const removed = before
    .filter((row) => !after.some((other) => other.id === row.id))
    .map((row) => {
      const td = el("td", `${CELL} text-gray-400`, `A note component was unmounted. It showed “${row.text}”.`);
      td.colSpan = 5;
      return el("tr", "", td);
    });

  queueMicrotask(() => changed.forEach(flashChange));

  container.replaceChildren(
    el(
      "table",
      "min-w-full divide-y divide-white/10",
      el("thead", "", head),
      el("tbody", "divide-y divide-white/10", ...rows, ...removed)
    )
  );
}
