// Regression tests for five slips made while porting the book's code.
// Each test describes what the official repo (angelsolaorbaiceta/fe-fwk-book) does.
import { beforeEach, describe, expect, test } from "vitest";

import { createApp, createComponent, createElement } from "..";
import { destroyDOM } from "../destroy-dom";
import { mountDOM } from "../mount-dom";
import { patchDOM } from "../patch-dom";
import { VDOMType } from "../types";
import { areVNodesEqual } from "../vnode-equal";

import type { FragmentVNode, ReactElement, TextVNode } from "../types";

function text(value: string): TextVNode {
  return { type: VDOMType.TEXT, value } as TextVNode;
}

function fragment(children: ReactElement[]): FragmentVNode {
  return { type: VDOMType.FRAGMENT, children } as FragmentVNode;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("text and fragment nodes are equal to nodes of the same type", () => {
  test("two text nodes are equal, whatever their text", () => {
    expect(areVNodesEqual(text("a"), text("b"))).toBe(true);
  });

  test("two fragments are equal", () => {
    expect(areVNodesEqual(fragment([]), fragment([]))).toBe(true);
  });

  test("changing a text patches the existing Text node instead of replacing it", () => {
    const oldVNode = createElement("p", {}, ["Hello"]);
    mountDOM(oldVNode, document.body);
    const textNode = document.body.querySelector("p")!.firstChild;

    patchDOM(oldVNode, createElement("p", {}, ["Bye"]), document.body);

    expect(document.body.innerHTML).toBe("<p>Bye</p>");
    expect(document.body.querySelector("p")!.firstChild).toBe(textNode);
  });
});

describe("moving children of a component that renders a fragment", () => {
  test("keeps the order right when the fragment doesn't start at index 0", () => {
    let list: { setState(state: object): void } | undefined;

    const List = createComponent({
      state() {
        return { items: ["a", "b", "c"] };
      },
      render() {
        // Keep a handle on the instance to change its state from the test.
        list = this;
        const { items } = this.state as { items: string[] };
        return fragment(
          items.map((item) => createElement("li", { key: item }, [item]))
        );
      },
    } as never);

    const Root = createComponent({
      render() {
        return createElement("ul", {}, [
          createElement("li", {}, ["first"]),
          createElement(List),
        ]);
      },
    } as never);

    createApp(Root).mount(document.body);
    list!.setState({ items: ["c", "a", "b"] });

    expect(document.body.innerHTML).toBe(
      "<ul><li>first</li><li>c</li><li>a</li><li>b</li></ul>"
    );
  });

  test("doesn't shift a nested list by the component's offset", () => {
    let list: { setState(state: object): void } | undefined;

    const List = createComponent({
      state() {
        return { items: ["a"] };
      },
      render() {
        list = this;
        const { items } = this.state as { items: string[] };
        return fragment([
          createElement("li", {}, ["Notes"]),
          createElement("li", {}, [
            createElement(
              "ol",
              {},
              items.map((item) => createElement("li", { key: item }, [item]))
            ),
          ]),
        ]);
      },
    } as never);

    const Root = createComponent({
      render() {
        return createElement("ul", {}, [
          createElement("li", {}, ["first"]),
          createElement(List),
        ]);
      },
    } as never);

    createApp(Root).mount(document.body);
    list!.setState({ items: ["b", "a"] });

    expect(document.body.querySelector("ol")!.innerHTML).toBe(
      "<li>b</li><li>a</li>"
    );
  });
});

describe("mounting a fragment at a position", () => {
  test("index 0 inserts before the existing children, not after them", () => {
    document.body.innerHTML = "<p>last</p>";

    mountDOM(
      fragment([
        createElement("p", {}, ["one"]),
        createElement("p", {}, ["two"]),
      ]),
      document.body,
      0
    );

    expect(document.body.innerHTML).toBe("<p>one</p><p>two</p><p>last</p>");
  });
});

describe("destroying an unknown node", () => {
  test("names the node type in the error message", () => {
    expect(() => destroyDOM({ type: "unknown" } as never)).toThrow(/unknown/);
  });
});
