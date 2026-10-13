import { beforeEach, expect, test, vi } from "vitest";

import { createElement } from "../create-element";
import { destroyDOM } from "../destroy-dom";
import { createComponent } from "../fiber";
import { mountDOM } from "../mount-dom";
import { VDOMType } from "../types";

import type { FragmentVNode, ReactElement, TextVNode } from "../types";

function text(value: string): TextVNode {
  return { type: VDOMType.TEXT, value };
}

function fragment(children: ReactElement[]): FragmentVNode {
  return { type: VDOMType.FRAGMENT, children };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

test("destroy a text element", async () => {
  const vdom = text("hello");

  await mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe("hello");
  expect(vdom.domElement).toBeInstanceOf(Text);

  await destroyDOM(vdom);
  expect(document.body.innerHTML).toBe("");
  expect(allElementsHaveBeenDestroyed(vdom)).toBe(true);
});

test("destroy an html element and its children", async () => {
  const vdom = createElement("div", {}, [text("hello")]);

  await mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe("<div>hello</div>");
  expect(vdom.domElement).toBeInstanceOf(HTMLDivElement);

  await destroyDOM(vdom);
  expect(document.body.innerHTML).toBe("");
  expect(allElementsHaveBeenDestroyed(vdom)).toBe(true);
});

test("remove an html element event listeners", async () => {
  const handler = vi.fn();
  const vdom = createElement("button", { on: { click: handler } }, [
    text("hello"),
  ]);

  await mountDOM(vdom, document.body);
  const buttonEl = vdom.domElement;
  buttonEl.click();

  expect(handler).toHaveBeenCalledTimes(1);

  await destroyDOM(vdom);
  buttonEl.click();

  expect(handler).toHaveBeenCalledTimes(1);
});

test("destroy an html element and its children recursively", async () => {
  const vdom = createElement("div", {}, [
    createElement("p", {}, [text("hello")]),
    createElement("span", {}, [text("world")]),
  ]);

  await mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe(
    "<div><p>hello</p><span>world</span></div>"
  );
  expect(vdom.domElement).toBeInstanceOf(HTMLDivElement);

  await destroyDOM(vdom);
  expect(document.body.innerHTML).toBe("");
  expect(allElementsHaveBeenDestroyed(vdom)).toBe(true);
});

test("destroy a fragment", async () => {
  const vdom = fragment([
    createElement("div", {}, [text("hello")]),
    createElement("span", {}, [text("world")]),
  ]);

  await mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe("<div>hello</div><span>world</span>");

  await destroyDOM(vdom);
  expect(document.body.innerHTML).toBe("");
  expect(allElementsHaveBeenDestroyed(vdom)).toBe(true);
});

test("destroy a fragment recursively", async () => {
  const vdom = fragment([
    createElement("span", {}, ["hello"]),
    fragment([createElement("span", {}, [text("world")])]),
  ]);

  await mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe("<span>hello</span><span>world</span>");

  await destroyDOM(vdom);
  expect(document.body.innerHTML).toBe("");
  expect(allElementsHaveBeenDestroyed(vdom)).toBe(true);
});

test("destroy a component with subcomponents", async () => {
  const ChildComponent = createComponent({
    render() {
      return createElement("p", {}, ["body"]);
    },
  } as never);
  const ParentComponent = createComponent({
    render() {
      return fragment([
        createElement("h1", {}, ["Title"]),
        createElement(ChildComponent),
      ]);
    },
  } as never);
  const vdom = createElement("div", {}, [createElement(ParentComponent)]);

  await mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe("<div><h1>Title</h1><p>body</p></div>");

  await destroyDOM(vdom);
  expect(document.body.innerHTML).toBe("");
  expect(allElementsHaveBeenDestroyed(vdom)).toBe(true);
});

function allElementsHaveBeenDestroyed(vdom: ReactElement): boolean {
  if (vdom.domElement) {
    return false;
  }

  return "children" in vdom
    ? vdom.children.every(allElementsHaveBeenDestroyed)
    : true;
}
