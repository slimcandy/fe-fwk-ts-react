import { createApp } from "fe-fwk-ts-react";

import { App } from "./app.js";
import { watch } from "./tracker.js";
import "./style.css";

const root = document.getElementById("root");
const panel = document.getElementById("panel");
const total = { renders: 0, writes: 0 };

// The panel lives outside #root, so updating it is never counted as a DOM write.
function show({ label, renders, writes }) {
  total.renders += renders.length;
  total.writes += writes.length;

  for (const element of document.querySelectorAll("[data-renders]")) {
    element.textContent = renders.length;
  }
  for (const element of document.querySelectorAll("[data-writes]")) {
    element.textContent = writes.length;
  }
  panel.querySelector("[data-label]").textContent = label || "Last action";
  panel.querySelector("[data-total]").textContent =
    `Since the page loaded: ${total.renders} renders, ${total.writes} DOM writes.`;
  fill(panel.querySelector("[data-render-list]"), group(renders), "No component rendered.");
  fill(panel.querySelector("[data-write-list]"), group(writes), "Nothing changed in the DOM.");
}

// ["Note", "Note", "App"] → ["Note × 2", "App"]
function group(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts].map(([item, count]) => (count > 1 ? `${item} × ${count}` : item));
}

function fill(list, items, empty) {
  list.replaceChildren(
    ...(items.length ? items : [empty]).map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      if (!items.length) {
        li.className = "text-gray-400 dark:text-gray-500";
      }
      return li;
    })
  );
}

watch(root, show);
createApp(App).mount(root);
