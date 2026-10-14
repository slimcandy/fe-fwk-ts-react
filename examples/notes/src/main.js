import { createApp } from "fe-fwk-ts-react";

import { App, currentApp, setNotes } from "./app.js";
import { drawDOM } from "./inspect.js";
import { STEPS, explain } from "./scenario.js";
import { flashRender, flashWrite, setSilent, watch } from "./tracker.js";
import { drawBeforeAfter, drawCards, drawTable, resetIds, snapshot } from "./views.js";
import "./style.css";

const root = document.getElementById("root");
const sliders = document.querySelectorAll("[data-step]");
const keyBox = document.getElementById("use-keys");
const domView = document.getElementById("dom");
const views = {
  table: [document.getElementById("view-table"), drawTable],
  lines: [document.getElementById("view-lines"), drawBeforeAfter],
  cards: [document.getElementById("view-cards"), drawCards],
};

let app;
let step = 0;
let before = [];

// The visitor doesn't type: the demo types into the first note's <input>.
function typeDraft() {
  root.querySelector("input").value = "my draft";
}

function mount(keyed) {
  resetIds();
  app = createApp(App, { notes: STEPS[0].notes, keyed });
  app.mount(root);
  typeDraft();
}

// Shows step `target`: remounts the app, silently replays the steps before it,
// then applies the last one for real, so the panel always shows one step.
function show(target) {
  step = target;
  const keyed = keyBox.checked;

  setSilent(true);
  app?.unmount();
  if (step > 0) {
    mount(keyed);
    for (let i = 1; i < step; i++) {
      setNotes(STEPS[i].notes);
    }
    before = snapshot(currentApp());
    setSilent(false);
    setNotes(STEPS[step].notes);
  } else {
    before = [];
    setSilent(false);
    mount(keyed);
  }

  for (const slider of sliders) {
    slider.value = String(step);
  }
  const { title } = STEPS[step];
  for (const element of document.querySelectorAll("[data-title]")) {
    element.textContent = `${step + 1}. ${title}`;
  }
  document.querySelector("[data-note]").textContent = explain(STEPS[step], keyed);
}

function report({ renders, writes }) {
  for (const element of document.querySelectorAll("[data-renders]")) {
    element.textContent = renders.length;
  }
  for (const element of document.querySelectorAll("[data-writes]")) {
    element.textContent = writes.length;
  }

  list(
    document.querySelector("[data-render-list]"),
    renders.map(({ name, component }) =>
      component.props.note ? `${name}.render()  ${component.props.note.text}` : `${name}.render()`
    ),
    "No render() ran."
  );
  list(
    document.querySelector("[data-write-list]"),
    writes.map(({ text }) => text),
    "Nothing changed on the page."
  );

  // The views, redrawn for this step, then the flashes.
  const after = snapshot(currentApp());
  for (const [container, draw] of Object.values(views)) {
    draw(container, before, after);
  }
  const domRows = drawDOM(domView, root);

  for (const { component } of renders) {
    const element = component.firstDOMElement;
    flashRender(element instanceof HTMLElement ? element : null);
  }
  for (const { node } of writes) {
    flashWrite(node instanceof HTMLElement ? node : node.parentElement);
    flashWrite(domRows.get(node));
  }
}

function list(element, items, empty) {
  element.replaceChildren(
    ...(items.length ? items : [empty]).map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      if (!items.length) {
        li.className = "list-none text-gray-500";
      }
      return li;
    })
  );
}

watch(root, report);
for (const slider of sliders) {
  slider.addEventListener("input", () => show(Number(slider.value)));
}
keyBox.addEventListener("change", () => show(step));

// Tabs: three ways to show the same step.
const tabs = document.querySelectorAll("[data-view]");
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      other.setAttribute("aria-selected", String(other === tab));
      views[other.dataset.view][0].hidden = other !== tab;
    }
    show(step);
  });
}
show(0);
