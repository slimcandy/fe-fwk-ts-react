import { createApp } from "fe-fwk-ts-react";

import { App, currentApp, setNotes } from "./app.js";
import { drawDOM, drawVirtualDOM } from "./inspect.js";
import { STEPS, explain } from "./scenario.js";
import { flashRender, flashWrite, setSilent, watch } from "./tracker.js";
import "./style.css";

const root = document.getElementById("root");
const sliders = document.querySelectorAll("[data-step]");
const keyBox = document.getElementById("use-keys");
const virtualView = document.getElementById("vdom");
const domView = document.getElementById("dom");

let app;
let step = 0;

// Shows step `target`: remounts the app, silently replays the steps before it,
// then applies the last one for real, so the panel always shows one step.
function show(target) {
  step = target;
  const keyed = keyBox.checked;

  setSilent(true);
  app?.unmount();
  if (step > 0) {
    app = createApp(App, { notes: STEPS[0].notes, keyed });
    app.mount(root);
    for (let i = 1; i < step; i++) {
      setNotes(STEPS[i].notes);
    }
    setSilent(false);
    setNotes(STEPS[step].notes);
  } else {
    setSilent(false);
    app = createApp(App, { notes: STEPS[0].notes, keyed });
    app.mount(root);
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

  // The two views, redrawn for this step, then the flashes.
  const virtualRows = drawVirtualDOM(virtualView, currentApp());
  const domRows = drawDOM(domView, root);

  for (const { component } of renders) {
    const element = component.firstDOMElement;
    flashRender(element instanceof HTMLElement ? element : null);
    flashRender(virtualRows.get(component));
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
show(0);
