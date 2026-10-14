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
    // The thumb's tooltip shows the step, as macOS does for a slider value.
    slider.title = `${step + 1}. ${STEPS[step].title}`;
    slider.style.setProperty("--fill", `calc(5px + ${step / (STEPS.length - 1)} * (100% - 10px))`);
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

// Tick marks and labels under each slider, placed under the step they name:
// step i sits at 5px + i/6 of the track (the thumb is 10px wide). On phones
// the labels are tilted 45° so they don't overlap.
function drawMarks(container) {
  const last = STEPS.length - 1;
  container.replaceChildren(
    ...STEPS.flatMap(({ label }, index) => {
      const left = `calc(5px + ${index / last} * (100% - 10px))`;

      const tick = document.createElement("span");
      tick.setAttribute("aria-hidden", "true");
      tick.className = "absolute top-0 h-1.5 w-px -translate-x-1/2 bg-gray-400 dark:bg-gray-500";
      tick.style.left = left;

      const mark = document.createElement("button");
      mark.type = "button";
      mark.dataset.mark = String(index);
      mark.tabIndex = -1;
      // "Edit 2nd" → "Edit 2<sup>nd</sup>"
      for (const part of label.split(/(?<=\d)(st|nd|rd|th)\b/)) {
        if (/^(st|nd|rd|th)$/.test(part)) {
          const sup = document.createElement("sup");
          sup.textContent = part;
          mark.append(sup);
        } else {
          mark.append(part);
        }
      }
      const align =
        index === 0 ? "sm:-translate-x-[5px]" : index === last ? "sm:-translate-x-[calc(100%-5px)]" : "sm:-translate-x-1/2";
      mark.className = `absolute top-2.5 origin-top-left rotate-45 cursor-pointer text-xs/4 whitespace-nowrap text-gray-500 hover:text-gray-900 aria-[current=true]:font-semibold aria-[current=true]:text-gray-900 sm:rotate-0 dark:text-gray-400 dark:hover:text-white dark:aria-[current=true]:text-white ${align}`;
      mark.style.left = left;
      mark.addEventListener("click", () => show(index));
      return [tick, mark];
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
