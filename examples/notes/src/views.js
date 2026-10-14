// Three ways to show what one step did to each note: its component instance,
// props, state, and the value of its native <input>. They read the same
// snapshots, taken before and after the step.

import { flashWrite, outputOf } from "./tracker.js";

// Note instances are numbered in the order they're mounted: #1, #2… Note's
// render() calls idOf(this). The page resets the numbers when it remounts.
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

// The notes, in order: one row per position. Read from the tree App.render()
// returned last, and from the DOM for the inputs.
export function snapshot(app) {
  const ul = findUl(outputOf(app).vNode);
  return ul.children.map((vNode, index) => {
    const instance = vNode.fiberInstance;
    return {
      id: idOf(instance),
      position: index + 1,
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

function value(text, className = "") {
  return el("span", className, text === "" ? "—" : text);
}

const CHANGED = "text-gray-400 line-through decoration-gray-400";

// ---- A. The course table: one row per position ----

export function drawTable(container, before, after) {
  const head = el(
    "tr",
    "",
    ...["Pos", "Key", "#", "props", "state", "<input>"].map((title) =>
      el("th", "px-2 py-2 text-left font-semibold whitespace-nowrap text-white first:pl-4", title)
    )
  );

  const rows = after.map((row, index) => {
    const old = before[index];
    const quoted = (text) => (text ? `"${text}"` : "");
    const cells = [
      { text: String(row.position) },
      { text: row.key ?? "—", className: row.key == null ? "text-gray-500" : "text-fuchsia-300" },
      { text: `#${row.id}`, then: old && `#${old.id}`, className: "text-amber-300" },
      { text: row.text, then: old?.text },
      { text: row.state, then: old?.state },
      { text: quoted(row.input), then: old && quoted(old.input) },
    ];

    return el(
      "tr",
      "",
      ...cells.map(({ text, then, className }, column) => {
        const td = el("td", "px-2 py-2 align-top first:pl-4", value(text, className));
        if (column < 2 || !before.length) {
          return td;
        }
        if (old == null) {
          if (column === 2) {
            td.append(el("br"), value("new row", "text-emerald-300"));
          }
          queueMicrotask(() => flashWrite(td));
        } else if (then !== text) {
          td.append(el("br"), value(then, CHANGED));
          queueMicrotask(() => flashWrite(td));
        }
        return td;
      })
    );
  });

  const removed = before
    .filter((row) => !after.some((other) => other.id === row.id))
    .map((row) => {
      const td = el("td", "px-3 py-2 text-gray-500", `instance #${row.id} unmounted (it showed “${row.text}”)`);
      td.colSpan = 6;
      td.classList.add("pl-4");
      return el("tr", "", td);
    });

  container.replaceChildren(
    el(
      "table",
      "min-w-full divide-y divide-white/10",
      el("thead", "", head),
      el("tbody", "divide-y divide-white/10", ...rows, ...removed)
    )
  );
}

// ---- B. Before → after, lines join the same instance ----

const ROW = 40;

export function drawBeforeAfter(container, before, after) {
  const height = Math.max(before.length, after.length, 1) * ROW;

  function column(title, rows, other) {
    return el(
      "div",
      "min-w-0",
      el("p", "mb-2 text-gray-400", title),
      ...rows.map((row) => {
        const isNew = !other.some((o) => o.id === row.id);
        return el(
          "div",
          `flex h-9 items-center gap-2 overflow-hidden rounded-md px-2 mb-1 ${isNew ? "bg-emerald-400/15" : "bg-white/5"}`,
          el("span", "text-amber-300", `#${row.id}`),
          el("span", "truncate text-gray-100", row.text),
          row.input ? el("span", "ml-auto shrink-0 rounded bg-white/10 px-1 text-sky-300", "⌨ " + row.input) : null
        );
      })
    );
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 100 ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "mt-7 h-full w-full overflow-visible");
  svg.style.height = `${height}px`;
  for (const [from, row] of before.entries()) {
    const to = after.findIndex((other) => other.id === row.id);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const y1 = from * ROW + 18;
    if (to === -1) {
      line.setAttribute("d", `M0 ${y1} L40 ${y1}`);
      line.setAttribute("stroke", "oklch(0.7 0.2 25)");
      line.setAttribute("stroke-dasharray", "3 3");
    } else {
      const y2 = to * ROW + 18;
      line.setAttribute("d", `M0 ${y1} C50 ${y1} 50 ${y2} 100 ${y2}`);
      line.setAttribute("stroke", from === to ? "oklch(0.6 0 0)" : "var(--color-render)");
    }
    line.setAttribute("fill", "none");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(line);
  }

  container.replaceChildren(
    el(
      "div",
      "grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] gap-2 px-4 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]",
      column("Before", before, after),
      el("div", "", svg),
      column("After", after, before)
    ),
    el(
      "p",
      "mt-3 px-4 text-gray-400",
      "#N is a component instance. A sloped line: the instance moved with its note. A flat line: it stayed in its row and got new props. ⌨ is text in the native <input>."
    )
  );
}

// ---- C. One card per instance, sliding to its new position ----

const lastTop = new Map();

export function drawCards(container, before, after) {
  const cards = after.map((row) => {
    const old = before.find((other) => other.id === row.id);
    const field = (label, now, then) => {
      const changed = old != null && now !== then;
      return el(
        "div",
        "flex gap-3",
        el("dt", "w-14 shrink-0 text-gray-500", label),
        el(
          "dd",
          "min-w-0 break-words",
          value(now, "text-gray-100"),
          changed ? el("span", "ml-2", value(then, CHANGED)) : null
        )
      );
    };
    const card = el(
      "article",
      "rounded-md bg-white/5 px-3 py-2 inset-ring inset-ring-white/10",
      el(
        "p",
        "flex gap-2",
        el("span", "font-semibold text-amber-300", `Note #${row.id}`),
        el("span", "text-gray-500", `position ${row.position}`),
        el("span", row.key == null ? "text-gray-500" : "text-fuchsia-300", row.key == null ? "no key" : `key "${row.key}"`),
        old == null && before.length ? el("span", "ml-auto text-emerald-300", "mounted") : null
      ),
      el(
        "dl",
        "mt-1 space-y-0.5",
        field("props", row.text, old?.text),
        field("state", row.state, old?.state),
        field("input", row.input ? `"${row.input}"` : "", old && (old.input ? `"${old.input}"` : ""))
      )
    );
    card.dataset.id = row.id;
    return card;
  });

  const gone = before
    .filter((row) => !after.some((other) => other.id === row.id))
    .map((row) =>
      el("p", "rounded-md border border-dashed border-white/15 px-3 py-2 text-gray-500", `Note #${row.id} unmounted (${row.text})`)
    );

  container.replaceChildren(el("div", "space-y-2 px-4", ...cards, ...gone));

  // Slide every card from where its instance was before (FLIP).
  for (const card of cards) {
    const top = card.offsetTop;
    const was = lastTop.get(card.dataset.id);
    if (was != null && was !== top) {
      card.animate([{ transform: `translateY(${was - top}px)` }, { transform: "none" }], {
        duration: 900,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      });
    } else if (was == null && before.length) {
      flashWrite(card);
    }
  }
  lastTop.clear();
  for (const card of cards) {
    lastTop.set(card.dataset.id, card.offsetTop);
  }
}
