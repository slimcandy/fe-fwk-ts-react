// The judge: real React. The same keyed list is rendered by this runtime and by
// react-dom, the same edits are applied to both, and after every edit the two
// DOMs must be identical. Mutation counts are recorded too: they don't have to
// match React's, but they show how much real DOM work each edit costs.
import fc from "fast-check";
import { Fragment, createElement as h } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import { createApp, createComponent, createElement } from "..";
import { VDOMType } from "../types";

import type { FragmentVNode, ReactElement } from "../types";
import type { Root } from "react-dom/client";

interface Item {
  id: number;
  text: string;
}

// This runtime: a list of keyed Item components, like the notes example.
// With `inFragment`, the list renders a fragment (a heading, then the items)
// after another item, so its children don't start at index 0 of their parent.
function mountOurs(container: HTMLElement, items: Item[], inFragment: boolean) {
  let list: { setState(state: object): void } | undefined;

  const ItemView = createComponent({
    render() {
      const { text } = this.props as Item;
      return createElement("li", {}, [text]);
    },
  } as never);

  const List = createComponent({
    state() {
      return { items };
    },
    render() {
      // Keep a handle on the instance to change its state from the test.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      list = this;
      const { items } = this.state as { items: Item[] };
      const children = items.map(({ id, text }) =>
        createElement(ItemView, { key: id, text })
      );
      return inFragment
        ? ({
            type: VDOMType.FRAGMENT,
            children: [createElement("li", {}, ["Notes"]), ...children],
          } as FragmentVNode)
        : createElement("ul", {}, children);
    },
  } as never);

  const Root = createComponent({
    render(): ReactElement {
      return createElement("ul", {}, [
        createElement("li", {}, ["Top"]),
        createElement(List),
      ]);
    },
  } as never);

  createApp(inFragment ? Root : List).mount(container);

  return (next: Item[]) => list!.setState({ items: next });
}

// React: the same tree with function components.
function ItemViewReact({ text }: { text: string }) {
  return h("li", null, text);
}

function ListReact({
  items,
  inFragment,
}: {
  items: Item[];
  inFragment: boolean;
}) {
  const children = items.map(({ id, text }) =>
    h(ItemViewReact, { key: id, text })
  );
  return inFragment
    ? h(
        "ul",
        null,
        h("li", null, "Top"),
        h(Fragment, null, h("li", null, "Notes"), children)
      )
    : h("ul", null, children);
}

function mountReact(
  container: HTMLElement,
  items: Item[],
  inFragment: boolean
) {
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(h(ListReact, { items, inFragment })));

  return (next: Item[]) =>
    flushSync(() => root.render(h(ListReact, { items: next, inFragment })));
}

const roots: Root[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.innerHTML = "";
});

// Counts real DOM writes made by `update`.
function countMutations(container: HTMLElement, update: () => void) {
  const observer = new MutationObserver(() => {});
  observer.observe(container, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
  });
  update();
  const records = observer.takeRecords();
  observer.disconnect();

  return records.reduce(
    (count, record) =>
      count +
      (record.type === "childList"
        ? record.addedNodes.length + record.removedNodes.length
        : 1),
    0
  );
}

function setup(items: Item[], inFragment = false) {
  const ours = document.createElement("div");
  const react = document.createElement("div");
  document.body.append(ours, react);

  const updateOurs = mountOurs(ours, items, inFragment);
  const updateReact = mountReact(react, items, inFragment);

  return {
    ours,
    react,
    apply(next: Item[]) {
      return {
        ours: countMutations(ours, () => updateOurs(next)),
        react: countMutations(react, () => updateReact(next)),
      };
    },
  };
}

const notes = [
  "Buy milk",
  "Call mum",
  "Read the book",
  "Fix the bike",
  "Plan the trip",
].map((text, id) => ({ id, text }));

// Named edits, as in the notes demo. The counts are kept in the snapshot so
// the demo page can quote them.
const edits: Record<string, (items: Item[]) => Item[]> = {
  "add to the top": (items) => [{ id: 99, text: "New note" }, ...items],
  "add to the end": (items) => [...items, { id: 99, text: "New note" }],
  "edit one": (items) =>
    items.map((item) =>
      item.id === 2 ? { ...item, text: "Read it again" } : item
    ),
  "remove one": (items) => items.filter((item) => item.id !== 2),
  "move last to top": (items) => [
    items[items.length - 1],
    ...items.slice(0, -1),
  ],
  reverse: (items) => [...items].reverse(),
  "same items": (items) => items.map((item) => ({ ...item })),
};

describe("renders the same DOM as React", () => {
  for (const [name, edit] of Object.entries(edits)) {
    test(name, () => {
      const { ours, react, apply } = setup(notes);
      expect(ours.innerHTML).toBe(react.innerHTML);

      const mutations = apply(edit(notes));

      expect(ours.innerHTML).toBe(react.innerHTML);
      expect(mutations).toMatchSnapshot();
    });
  }
});

// Random lists, random sequences of edits: the DOM must still match React's.
const itemArb = fc.record({
  id: fc.integer({ min: 0, max: 30 }),
  text: fc.string({ maxLength: 6 }),
});
const list = fc.uniqueArray(itemArb, {
  selector: (item) => item.id,
  maxLength: 12,
});

// A component whose fragment becomes empty, even halfway through a patch, has
// no element left to find its position by: the same limitation as the book's
// code. So the fragment always starts with a heading that never changes.
for (const inFragment of [false, true]) {
  test(`random edits keep the DOM identical to React's${inFragment ? " (list in a fragment)" : ""}`, () => {
    fc.assert(
      fc.property(
        list,
        fc.array(list, { minLength: 1, maxLength: 5 }),
        (first, steps) => {
          const { ours, react, apply } = setup(first, inFragment);
          try {
            for (const step of steps) {
              apply(step);
              expect(ours.innerHTML).toBe(react.innerHTML);
            }
          } finally {
            roots.splice(0).forEach((root) => root.unmount());
            document.body.innerHTML = "";
          }
        }
      ),
      { numRuns: 300 }
    );
  });
}
