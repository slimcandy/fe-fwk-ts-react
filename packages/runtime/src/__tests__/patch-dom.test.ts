import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createElement } from "../create-element";
import { createComponent } from "../fiber";
import { mountDOM } from "../mount-dom";
import { patchDOM } from "../patch-dom";
import { VDOMType } from "../types";

import type { ComponentInstance } from "../fiber";
import type {
  FiberVNode,
  FragmentVNode,
  ReactElement,
  TextVNode,
} from "../types";

type Self<P, S = object> = ComponentInstance & { props: P; state: S };

function text(value: string): TextVNode {
  return { type: VDOMType.TEXT, value };
}

function fragment(children: ReactElement[]): FragmentVNode {
  return { type: VDOMType.FRAGMENT, children };
}

function singleHtmlLine(str: TemplateStringsArray) {
  return str[0].replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

beforeEach(() => {
  document.body.innerHTML = "";
});

test("no change", async () => {
  const oldVdom = createElement("div", {}, ["hello"]);
  const newVdom = createElement("div", {}, ["hello"]);

  const vdom = await patch(oldVdom, newVdom);

  expect(document.body.innerHTML).toEqual("<div>hello</div>");
  expect(newVdom.domElement).toBe(vdom.domElement);
});

test("change the root node", async () => {
  const oldVdom = createElement("div", {}, ["hello"]);
  const newVdom = createElement("span", {}, ["hello"]);

  const vdom = await patch(oldVdom, newVdom);

  expect(document.body.innerHTML).toEqual("<span>hello</span>");
  expect(vdom.domElement).toBeInstanceOf(HTMLSpanElement);
  expect(newVdom.domElement).toBe(vdom.domElement);
});

test("change the root node, mount in same index", async () => {
  const staticVdom = createElement("p", {}, ["bye"]);
  await mountDOM(staticVdom, document.body);

  const oldVdom = createElement("div", {}, ["hello"]);
  const newVdom = createElement("span", {}, ["hello"]);
  await mountDOM(oldVdom, document.body, 0);
  await patchDOM(oldVdom, newVdom, document.body);

  expect(document.body.innerHTML).toEqual("<span>hello</span><p>bye</p>");
});

test("sets the el in the new vdom", async () => {
  const oldVdom = createElement("div", {}, ["hello"]);
  const newVdom = createElement("div", {}, ["hello"]);

  const vdom = await patch(oldVdom, newVdom);

  expect(newVdom.domElement).toBe(vdom.domElement);
});

test("patch text", async () => {
  const oldVdom = text("foo");
  const newVdom = text("bar");

  await patch(oldVdom, newVdom);

  expect(document.body.innerHTML).toEqual("bar");
});

describe("patch fragments", () => {
  test("nested fragments, add child", async () => {
    const oldVdom = fragment([fragment([text("foo")])]);
    const newVdom = fragment([
      fragment([text("foo"), text("bar")]),
      createElement("p", {}, ["baz"]),
    ]);

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual("foobar<p>baz</p>");
  });

  test("nested fragments, add child at index", async () => {
    const oldVdom = fragment([text("A"), fragment([text("B"), text("C")])]);
    const newVdom = fragment([
      fragment([text("X")]),
      text("A"),
      fragment([text("B"), fragment([text("Y")]), text("C")]),
    ]);

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual("XABYC");
  });

  test("nested fragments, remove child", async () => {
    const oldVdom = fragment([
      fragment([text("X")]),
      text("A"),
      fragment([text("B"), fragment([text("Y")]), text("C")]),
    ]);
    const newVdom = fragment([text("A"), fragment([text("B"), text("C")])]);

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual("ABC");
  });

  test("nested fragments, move child", async () => {
    const oldVdom = fragment([text("A"), fragment([text("B"), text("C")])]);
    const newVdom = fragment([
      fragment([text("B")]),
      text("A"),
      fragment([text("C")]),
    ]);

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual("BAC");
  });
});

describe("patch attributes", () => {
  test("add attribute", async () => {
    const oldVdom = createElement("div", {});
    const newVdom = createElement("div", { id: "foo" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual('<div id="foo"></div>');
  });

  test("remove attribute", async () => {
    const oldVdom = createElement("div", { id: "foo" });
    const newVdom = createElement("div", {});

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual("<div></div>");
  });

  test("update the value of an attribute", async () => {
    const oldVdom = createElement("div", { id: "foo" });
    const newVdom = createElement("div", { id: "bar" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual('<div id="bar"></div>');
  });
});

describe("patch class", () => {
  test("from empty string to string", async () => {
    // Need to prevent an empty class to be removed from the classList (that throws an error)
    // `SyntaxError: The token provided must not be empty.`
    const oldVdom = createElement("div", { class: "" });
    const newVdom = createElement("div", { class: "foo" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual('<div class="foo"></div>');
  });

  test("from string to empty string", async () => {
    // Need to prevent an empty class to be removed from the classList (that throws an error)
    // `SyntaxError: The token provided must not be empty.`
    const oldVdom = createElement("div", { class: "foo" });
    const newVdom = createElement("div", { class: "" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual('<div class=""></div>');
  });

  test("from no class to string", async () => {
    const oldVdom = createElement("div", {});
    const newVdom = createElement("div", { class: "foo" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual('<div class="foo"></div>');
  });

  test("from string to no class", async () => {
    const oldVdom = createElement("div", { class: "foo" });
    const newVdom = createElement("div", {});

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toEqual('<div class=""></div>');
  });

  test("change string value", async () => {
    const oldVdom = createElement("div", { class: "foo" });
    const newVdom = createElement("div", { class: "bar" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="bar"></div>');
  });

  test("from a string to an array of classes", async () => {
    const oldVdom = createElement("div", { class: "foo" });
    const newVdom = createElement("div", { class: ["foo", "bar"] });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo bar"></div>');
  });

  test("from an array of classes to a string", async () => {
    const oldVdom = createElement("div", { class: ["foo", "bar"] });
    const newVdom = createElement("div", { class: "foo" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo"></div>');
  });

  test("from an array of classes to a string", async () => {
    const oldVdom = createElement("div", { class: ["foo", "bar"] });
    const newVdom = createElement("div", { class: "foo" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo"></div>');
  });

  test("add class to array", async () => {
    const oldVdom = createElement("div", { class: ["foo"] });
    const newVdom = createElement("div", { class: ["foo", "bar"] });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo bar"></div>');
  });

  test("remove class from array", async () => {
    const oldVdom = createElement("div", { class: ["foo", "bar"] });
    const newVdom = createElement("div", { class: ["foo"] });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo"></div>');
  });

  test("add class to string", async () => {
    const oldVdom = createElement("div", { class: "foo" });
    const newVdom = createElement("div", { class: "foo bar" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo bar"></div>');
  });

  test("remove class from string", async () => {
    const oldVdom = createElement("div", { class: "foo bar" });
    const newVdom = createElement("div", { class: "foo" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div class="foo"></div>');
  });
});

describe("patch style", () => {
  test("add a new style", async () => {
    const oldVdom = createElement("div");
    const newVdom = createElement("div", { style: { color: "red" } });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div style="color: red;"></div>');
  });

  test("remove a style", async () => {
    const oldVdom = createElement("div", { style: { color: "red" } });
    const newVdom = createElement("div");

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div style=""></div>');
  });

  test("change a style", async () => {
    const oldVdom = createElement("div", { style: { color: "red" } });
    const newVdom = createElement("div", { style: { color: "blue" } });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<div style="color: blue;"></div>');
  });
});

describe("patch event handlers", () => {
  test("update event handler", async () => {
    const oldHandler = vi.fn();
    const oldVdom = createElement("button", { on: { click: oldHandler } }, [
      "Click me",
    ]);
    const newHandler = vi.fn();
    const newVdom = createElement("button", { on: { click: newHandler } }, [
      "Click me",
    ]);

    await patch(oldVdom, newVdom);

    document.body.querySelector<HTMLElement>("button")!.click();

    expect(oldHandler).not.toHaveBeenCalled();
    expect(newHandler).toHaveBeenCalled();
    expect(newVdom.listeners).not.toBeUndefined();
  });

  test("remove event handler", async () => {
    const oldHandler = vi.fn();
    const oldVdom = createElement("button", { on: { click: oldHandler } }, [
      "Click me",
    ]);
    const newVdom = createElement("button", {}, ["Click me"]);

    await patch(oldVdom, newVdom);

    document.body.querySelector<HTMLElement>("button")!.click();

    expect(oldHandler).not.toHaveBeenCalled();
    expect(newVdom.listeners).toStrictEqual({});
  });

  test("unchanged event handler preserves listener reference", async () => {
    const handler = vi.fn();
    const oldVdom = createElement("button", { on: { click: handler } }, [
      "Click me",
    ]);
    const newVdom = createElement("button", { on: { click: handler } }, [
      "Click me",
    ]);

    await patch(oldVdom, newVdom);

    expect(newVdom.listeners!.click).toBe(oldVdom.listeners!.click);

    document.body.querySelector<HTMLElement>("button")!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("multiple patches with unchanged handlers do not accumulate listeners", async () => {
    const handler = vi.fn();

    const vdom1 = createElement("button", { on: { click: handler } }, [
      "Click me",
    ]);
    await mountDOM(vdom1, document.body);
    const vdom2 = createElement("button", { on: { click: handler } }, [
      "Click me",
    ]);
    patchDOM(vdom1, vdom2, document.body);
    const vdom3 = createElement("button", { on: { click: handler } }, [
      "Click me",
    ]);
    patchDOM(vdom2, vdom3, document.body);
    const vdom4 = createElement("button", { on: { click: handler } }, [
      "Click me",
    ]);
    patchDOM(vdom3, vdom4, document.body);

    document.body.querySelector<HTMLElement>("button")!.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(vdom2.listeners!.click).toBe(vdom1.listeners!.click);
    expect(vdom3.listeners!.click).toBe(vdom2.listeners!.click);
    expect(vdom4.listeners!.click).toBe(vdom3.listeners!.click);
  });
});

describe("patch children", () => {
  describe("text vnode", () => {
    test("added at the end", async () => {
      const oldVdom = createElement("div", {}, ["A"]);
      const newVdom = createElement("div", {}, ["A", "B"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>AB</div>");
    });

    test("added at the beginning", async () => {
      const oldVdom = createElement("div", {}, ["B"]);
      const newVdom = createElement("div", {}, ["A", "B"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>AB</div>");
    });

    test("added in the middle", async () => {
      const oldVdom = createElement("div", {}, ["A", "B"]);
      const newVdom = createElement("div", {}, ["A", "B", "C"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>ABC</div>");
    });

    test("removed from the end", async () => {
      const oldVdom = createElement("div", {}, ["A", "B"]);
      const newVdom = createElement("div", {}, ["A"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>A</div>");
    });

    test("removed from the beginning", async () => {
      const oldVdom = createElement("div", {}, ["A", "B"]);
      const newVdom = createElement("div", {}, ["B"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>B</div>");
    });

    test("removed from the middle", async () => {
      const oldVdom = createElement("div", {}, ["A", "B", "C"]);
      const newVdom = createElement("div", {}, ["A", "C"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>AC</div>");
    });

    test("changed", async () => {
      const oldVdom = createElement("div", {}, ["A"]);
      const newVdom = createElement("div", {}, ["B"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>B</div>");
    });

    test("moved around", async () => {
      const oldVdom = createElement("div", {}, ["A", "B", "C"]);
      const newVdom = createElement("div", {}, ["C", "A", "B"]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div>CAB</div>");
    });

    test("recursively", async () => {
      const oldVdom = fragment([
        createElement("p", {}, ["A"]),
        createElement("span", {}, ["B"]),
        createElement("div", {}, ["C"]),
      ]);
      const newVdom = fragment([
        createElement("div", {}, ["C"]),
        createElement("span", { id: "b" }, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe('<div>C</div><span id="b">B</span>');
    });
  });

  describe("element vnode", () => {
    test("added at the end", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", { id: "b" }, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        '<div><span>A</span><span id="b">B</span></div>'
      );
    });

    test("added at the beginning", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["B"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", { id: "a" }, ["A"]),
        createElement("span", {}, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        '<div><span id="a">A</span><span>B</span></div>'
      );
    });

    test("added in the middle", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["C"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", { id: "b" }, ["B"]),
        createElement("span", {}, ["C"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        '<div><span>A</span><span id="b">B</span><span>C</span></div>'
      );
    });

    test("removed from the end", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div><span>A</span></div>");
    });

    test("removed from the beginning", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", {}, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<div><span>B</span></div>");
    });

    test("removed from the middle", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
        createElement("span", {}, ["C"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["C"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        "<div><span>A</span><span>C</span></div>"
      );
    });

    test("moved around", async () => {
      const oldVdom = createElement("div", {}, [
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
        createElement("span", {}, ["C"]),
      ]);
      const newVdom = createElement("div", {}, [
        createElement("span", {}, ["C"]),
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        "<div><span>C</span><span>A</span><span>B</span></div>"
      );
    });
  });

  describe("fragment vnode", () => {
    test("add element at the end", async () => {
      const oldVdom = fragment([createElement("span", {}, ["A"])]);
      const newVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", { id: "b" }, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        '<span>A</span><span id="b">B</span>'
      );
    });

    test("add element at the beginning", async () => {
      const oldVdom = fragment([createElement("span", {}, ["B"])]);
      const newVdom = fragment([
        createElement("span", { id: "a" }, ["A"]),
        createElement("span", {}, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        '<span id="a">A</span><span>B</span>'
      );
    });

    test("add element in the middle", async () => {
      const oldVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["C"]),
      ]);
      const newVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", { id: "b" }, ["B"]),
        createElement("span", {}, ["C"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        '<span>A</span><span id="b">B</span><span>C</span>'
      );
    });

    test("remove element from the end", async () => {
      const oldVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);
      const newVdom = fragment([createElement("span", {}, ["A"])]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<span>A</span>");
    });

    test("remove element from the beginning", async () => {
      const oldVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);
      const newVdom = fragment([createElement("span", {}, ["B"])]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<span>B</span>");
    });

    test("remove element from the middle", async () => {
      const oldVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
        createElement("span", {}, ["C"]),
      ]);
      const newVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["C"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<span>A</span><span>C</span>");
    });

    test("append fragment", async () => {
      const oldVdom = fragment([createElement("span", {}, ["A"])]);
      const newVdom = fragment([
        createElement("span", {}, ["A"]),
        fragment([createElement("span", {}, ["B"])]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe("<span>A</span><span>B</span>");
    });

    test("move children around", async () => {
      const oldVdom = fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
        createElement("span", {}, ["C"]),
      ]);
      const newVdom = fragment([
        createElement("span", {}, ["C"]),
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);

      await patch(oldVdom, newVdom);

      expect(document.body.innerHTML).toBe(
        "<span>C</span><span>A</span><span>B</span>"
      );
    });
  });

  describe("child component with fragment vnode as top node and an offset > 0", () => {
    test("moves children of a nested element vnode correctly", () => {
      const Child = createComponent({
        render(this: Self<{ swapped: boolean }>) {
          const children = this.props.swapped
            ? [
                createElement("h2"),
                createElement("h1"),
                createElement("h3"),
                createElement("h4"),
              ]
            : [
                createElement("h1"),
                createElement("h2"),
                createElement("h3"),
                createElement("h4"),
              ];

          return fragment([
            createElement("p"),
            createElement("div", {}, children),
            createElement("span"),
          ]);
        },
      } as never);

      const Root = createComponent({
        render(this: Self<{ swapped: boolean }>) {
          return fragment([
            createElement("p"),
            createElement("p"),
            createElement("p"),
            createElement("p"),
            createElement(Child, { swapped: this.props.swapped }),
            createElement("p"),
          ]);
        },
      } as never);

      const root = new Root({ swapped: false });
      root.mount(document.body);

      expect(document.body.innerHTML).toBe(
        singleHtmlLine`
          <p></p>
          <p></p>
          <p></p>
          <p></p>
          <p></p>
          <div>
            <h1></h1>
            <h2></h2>
            <h3></h3>
            <h4></h4>
          </div>
          <span></span>
          <p></p>
        `
      );

      root.updateProps({ swapped: true });

      expect(document.body.innerHTML).toBe(
        singleHtmlLine`
          <p></p>
          <p></p>
          <p></p>
          <p></p>
          <p></p>
          <div>
            <h2></h2>
            <h1></h1>
            <h3></h3>
            <h4></h4>
          </div>
          <span></span>
          <p></p>
        `
      );
    });
  });
});

describe("patch vdom with component host", () => {
  const component = { count: 5 };
  const props = {
    on: {
      // Use method syntax to bind the component to the event handler.
      // Arrow function"s `this` can"t be bound.
      click(this: { count: number }) {
        this.count++;
      },
    },
  };

  afterEach(() => {
    component.count = 5;
  });

  test("when the root node changes, bounds the component to the event handlers", async () => {
    const oldVdom = createElement("button", {}, ["Click"]);
    const newVdom = createElement("div", props, ["Click"]);

    await patch(oldVdom, newVdom, component as never);
    document.querySelector<HTMLElement>("div")!.click();

    expect(document.body.innerHTML).toBe("<div>Click</div>");
    expect(component.count).toBe(6);
  });

  test("when a child node is added, bounds its event handlers to the component", async () => {
    const oldVdom = createElement("div", {}, ["hi"]);
    const newVdom = createElement("div", {}, [
      "hi",
      createElement("button", props, ["Click"]),
    ]);

    await patch(oldVdom, newVdom, component as never);
    document.querySelector<HTMLElement>("button")!.click();

    expect(document.body.innerHTML).toBe("<div>hi<button>Click</button></div>");
    expect(component.count).toBe(6);
  });

  test("when an event is patched, binds the event handler to the component", async () => {
    const oldVdom = createElement("button", {}, ["Click"]);
    const newVdom = createElement("button", props, ["Click"]);

    await patch(oldVdom, newVdom, component as never);
    document.querySelector<HTMLElement>("button")!.click();

    expect(document.body.innerHTML).toBe("<button>Click</button>");
    expect(component.count).toBe(6);
  });

  test("when a child node is moved, binds its event handlers to the component", async () => {
    const oldVdom = fragment([
      createElement("span", {}, ["A"]),
      createElement("button", {}, ["B"]),
    ]);
    const newVdom = fragment([
      createElement("button", props, ["B"]),
      createElement("span", {}, ["A"]),
    ]);

    await patch(oldVdom, newVdom, component as never);
    document.querySelector<HTMLElement>("button")!.click();

    expect(document.body.innerHTML).toBe("<button>B</button><span>A</span>");
    expect(component.count).toBe(6);
  });

  test("when a child node is moved naturally (noop), binds its event handlers to the component", async () => {
    const oldVdom = fragment([createElement("button", {}, ["A"])]);
    const newVdom = fragment([createElement("button", props, ["A"])]);

    await patch(oldVdom, newVdom, component as never);
    document.querySelector<HTMLElement>("button")!.click();

    expect(document.body.innerHTML).toBe("<button>A</button>");
    expect(component.count).toBe(6);
  });
});

describe("patch component with props", () => {
  const Component = createComponent({
    render(this: Self<{ text: string }>) {
      return createElement("span", { class: "foo" }, [this.props.text]);
    },
  } as never);

  test("the new prop is patched into the DOM", async () => {
    const oldVdom = createElement(Component, { text: "one" });
    const newVdom = createElement(Component, { text: "two" });

    await patch(oldVdom, newVdom);

    expect(document.body.innerHTML).toBe('<span class="foo">two</span>');
  });

  test("the component instance is preserved (the component isn't re-created)", async () => {
    const oldVdom = createElement(Component, { text: "one" });
    const newVdom = createElement(Component, { text: "two" });

    await patch(oldVdom, newVdom);

    expect((newVdom as FiberVNode).fiberInstance).toBe(
      (oldVdom as FiberVNode).fiberInstance
    );
  });
});

describe("patch keyed component list", () => {
  // A component with internal state
  const Component = createComponent({
    state() {
      return { highlighted: false };
    },

    render(this: Self<{ text: string }, { highlighted: boolean }>) {
      const { highlighted } = this.state;
      const { text } = this.props;

      return createElement(
        "span",
        {
          class: highlighted ? "highlighted" : "",
          id: text,
          on: {
            click: () => this.setState({ highlighted: !highlighted }),
          },
        },
        [text]
      );
    },
  } as never);

  test("swap two components", async () => {
    const oldVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "b", text: "B" }),
    ]);
    const newVdom = fragment([
      createElement(Component, { key: "b", text: "B" }),
      createElement(Component, { key: "a", text: "A" }),
    ]);

    await mountDOM(oldVdom, document.body);

    // Change the internal state of the first component.
    document.querySelector<HTMLElement>("#A")!.click();
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="B">B</span>
      `
    );

    await patchDOM(oldVdom, newVdom, document.body);

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="B">B</span>
      <span id="A" class="highlighted">A</span>
      `
    );
  });

  test("the key is not passed as prop to the component", async () => {
    const oldVdom = createElement(Component, { key: "a", text: "A" });
    const newVdom = createElement(Component, { key: "a", text: "B" });

    await patch(oldVdom, newVdom);

    const component = (newVdom as FiberVNode).fiberInstance;
    expect(component.props).toEqual({ text: "B" });
  });

  test("add a new component in the middle", async () => {
    const oldVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "b", text: "B" }),
    ]);
    const newVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "c", text: "C" }),
      createElement(Component, { key: "b", text: "B" }),
    ]);

    await mountDOM(oldVdom, document.body);

    // Change the internal state of the two components
    document.querySelector<HTMLElement>("#A")!.click();
    document.querySelector<HTMLElement>("#B")!.click();
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="B" class="highlighted">B</span>
      `
    );

    await patchDOM(oldVdom, newVdom, document.body);

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="C">C</span>
      <span id="B" class="highlighted">B</span>
      `
    );
  });

  test("remove a component in the middle", async () => {
    const oldVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "b", text: "B" }),
      createElement(Component, { key: "c", text: "C" }),
    ]);
    const newVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "c", text: "C" }),
    ]);

    await mountDOM(oldVdom, document.body);

    // Change the internal state of the middle component
    document.querySelector<HTMLElement>("#B")!.click();
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A">A</span>
      <span id="B" class="highlighted">B</span>
      <span id="C">C</span>
      `
    );

    patchDOM(oldVdom, newVdom, document.body);

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A">A</span>
      <span id="C">C</span>
      `
    );
  });

  test("when a component changes its key, loses it's internal state (it's recreated)", async () => {
    const oldVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "b", text: "B" }),
    ]);
    const newVdom = fragment([
      createElement(Component, { key: "a", text: "A" }),
      createElement(Component, { key: "c", text: "C" }),
    ]);

    await mountDOM(oldVdom, document.body);

    // Change the internal state of two components
    document.querySelector<HTMLElement>("#A")!.click();
    document.querySelector<HTMLElement>("#B")!.click();
    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="B" class="highlighted">B</span>
      `
    );

    await patchDOM(oldVdom, newVdom, document.body);

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span id="A" class="highlighted">A</span>
      <span id="C">C</span>
      `
    );
  });
});

/**
 * These cases are interesting because, the indices of the list operations over the children
 * of the component require an offset: the number of children before the component's first child.
 *
 * The component patches its view, independently of the other components above it, but when
 * the component isn't the first child of the parent, the indices of the list operations
 * need to be offset.
 *
 * At mounting time, that offset is the passed index to the `mount()` method.
 * But things can move around, and the component can be moved to a different position.
 */
describe("components inside children arrays", () => {
  const SwapComponent = createComponent({
    state() {
      return { swap: false };
    },
    render(this: Self<object, { swap: boolean }>) {
      return fragment([
        createElement("span", {}, ["B"]),
        this.state.swap
          ? createElement("p", {}, ["XX"])
          : createElement("span", {}, ["C"]),
      ]);
    },
  } as never);

  const MoveComponent = createComponent({
    state() {
      return { move: false };
    },
    render(this: Self<object, { move: boolean }>) {
      if (this.state.move) {
        return fragment([
          createElement("p", {}, ["C"]),
          createElement("span", {}, ["B"]),
        ]);
      }

      return fragment([
        createElement("span", {}, ["B"]),
        createElement("p", {}, ["C"]),
      ]);
    },
  } as never);

  test("swapping an item (remove + add) inside a component that goes after an element in the same parent node", async () => {
    // Parent element is a <div>
    // The component inside the <div> goes after the <span> (at index 1)
    const vdom = createElement("div", {}, [
      createElement("span", {}, ["A"]),
      createElement(SwapComponent),
    ]);
    await mountDOM(vdom, document.body);

    const component = (vdom.children[1] as FiberVNode).fiberInstance;
    await component.setState({ swap: true });

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <div>
        <span>A</span>
        <span>B</span>
        <p>XX</p>
      </div>
      `
    );
  });

  test("moving an item inside a component that goes after an element in the same parent node", async () => {
    // Parent element is a <div>
    // The component inside the <div> goes after the <span> (at index 1)
    const vdom = createElement("div", {}, [
      createElement("span", {}, ["A"]),
      createElement(MoveComponent),
    ]);
    await mountDOM(vdom, document.body);

    const component = (vdom.children[1] as FiberVNode).fiberInstance;
    await component.setState({ move: true });

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <div>
        <span>A</span>
        <p>C</p>
        <span>B</span>
      </div>
      `
    );
  });

  test("swapping an item (remove + add) inside a component that goes after an element in a fragment", async () => {
    // Parent element is the <body>
    // The component inside the <body> goes after the <span> (at index 1)
    const vdom = fragment([
      createElement("span", {}, ["A"]),
      createElement(SwapComponent),
    ]);
    await mountDOM(vdom, document.body);

    const component = (vdom.children[1] as FiberVNode).fiberInstance;
    await component.setState({ swap: true });

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span>A</span>
      <span>B</span>
      <p>XX</p>
      `
    );
  });

  test("moving an item inside a component that goes after an element in a fragment", async () => {
    // Parent element is the <body>
    // The component inside the <body> goes after the <span> (at index 1)
    const vdom = fragment([
      createElement("span", {}, ["A"]),
      createElement(MoveComponent),
    ]);
    await mountDOM(vdom, document.body);

    const component = (vdom.children[1] as FiberVNode).fiberInstance;
    await component.setState({ move: true });

    expect(document.body.innerHTML).toBe(
      singleHtmlLine`
      <span>A</span>
      <p>C</p>
      <span>B</span>
      `
    );
  });
});

test("patch component where the top-level element changes between renders", async () => {
  const Component = createComponent({
    render(this: Self<{ show: boolean }>) {
      if (this.props.show) {
        return createElement("div", {}, ["A"]);
      }

      return createElement("span", {}, ["B"]);
    },
  } as never);

  const oldVdom = createElement(Component, { show: true });
  const newVdom = createElement(Component, { show: false });
  await mountDOM(oldVdom, document.body);

  expect(document.body.innerHTML).toBe("<div>A</div>");
  expect(oldVdom.domElement).toBeInstanceOf(HTMLDivElement);

  await patchDOM(oldVdom, newVdom, document.body);

  expect(document.body.innerHTML).toBe("<span>B</span>");
  expect(newVdom.domElement).toBeInstanceOf(HTMLSpanElement);
});

/**
 * As reported by @Raven-79 in Issue #267 (https://github.com/angelsolaorbaiceta/fe-fwk-book/issues/267)
 * when two components whose top level element is a fragment are swapped, the patching algorithm
 * doesn't work as expected, even when the keys are provided.
 */
test("patch two keyed components with top level fragments", async () => {
  const Component = createComponent({
    render() {
      return fragment([
        createElement("span", {}, ["A"]),
        createElement("span", {}, ["B"]),
      ]);
    },
  } as never);

  const oldVdom = fragment([
    createElement(Component, { key: "a" }),
    createElement(Component, { key: "b" }),
  ]);
  const newVdom = fragment([
    createElement(Component, { key: "b" }),
    createElement(Component, { key: "a" }),
  ]);

  await patch(oldVdom, newVdom);

  expect(document.body.innerHTML).toBe(
    singleHtmlLine`
      <span>A</span><span>B</span>
      <span>A</span><span>B</span>
    `
  );
});

async function patch(
  oldVdom: ReactElement,
  newVdom: ReactElement,
  hostComponent: ComponentInstance | null = null
) {
  await mountDOM(oldVdom, document.body);
  return patchDOM(oldVdom, newVdom, document.body, hostComponent);
}
