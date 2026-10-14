import { createApp } from "fe-fwk-ts-react";

import { App, currentApp, setNotes } from "./app.js";
import { drawDOM } from "./inspect.js";
import { STEPS, explain } from "./scenario.js";
import { flashRender, flashWrite, setSilent, watch } from "./tracker.js";
import { drawTable, resetIds, snapshot } from "./views.js";
import "./style.css";

const root = document.getElementById("root");
const sliders = document.querySelectorAll("[data-step]");
const keyBox = document.getElementById("use-keys");
const table = document.getElementById("table");
const domView = document.getElementById("dom");

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
// then applies the last one for real, so the page always shows one step.
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
    slider.setAttribute("aria-valuetext", `${step + 1}. ${STEPS[step].title}`);
  }
  for (const mark of document.querySelectorAll("[data-mark]")) {
    mark.setAttribute("aria-current", String(Number(mark.dataset.mark) === step));
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

  drawTable(table, before, snapshot(currentApp()));
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

// Step labels under each slider, placed under the step they name. The thumb
// is 20px wide (style.css), so step i sits at 10px + i/6 of the rest. On
// phones the labels are tilted 45° so they don't overlap.
function drawMarks(container) {
  const last = STEPS.length - 1;
  container.replaceChildren(
    ...STEPS.map(({ label }, index) => {
      const mark = document.createElement("button");
      mark.type = "button";
      mark.dataset.mark = String(index);
      mark.textContent = label;
      mark.tabIndex = -1;
      const align =
        index === 0 ? "sm:-translate-x-[10px]" : index === last ? "sm:-translate-x-[calc(100%-10px)]" : "sm:-translate-x-1/2";
      mark.className = `absolute top-0 origin-top-left rotate-45 text-xs/4 whitespace-nowrap text-gray-500 hover:text-gray-900 aria-[current=true]:font-semibold aria-[current=true]:text-gray-900 sm:rotate-0 dark:text-gray-400 dark:hover:text-white dark:aria-[current=true]:text-white ${align}`;
      mark.style.left = `calc(10px + ${index / last} * (100% - 20px))`;
      mark.addEventListener("click", () => show(index));
      return mark;
    })
  );
}

watch(root, report);
for (const container of document.querySelectorAll("[data-marks]")) {
  drawMarks(container);
}
for (const slider of sliders) {
  slider.addEventListener("input", () => show(Number(slider.value)));
}
keyBox.addEventListener("change", () => show(step));
show(0);
