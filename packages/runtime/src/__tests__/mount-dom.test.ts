import { beforeEach, expect, test, vi } from "vitest";

import { createElement } from "../create-element";
import { createComponent } from "../fiber";
import { mountDOM } from "../mount-dom";
import { nextTick } from "../scheduler";
import { VDOMType } from "../types";

import type { ComponentInstance } from "../fiber";
import type { FragmentVNode, ReactElement, TextVNode } from "../types";

// Dropped (the port keeps the parent component in a private `#parentFiberInstance`
// field and the rendered vNode in a private `#vNode` field, so neither can be
// inspected from the outside):
// - "mount a component with a parent component"
// - "child components keep a reference to their parent component"

type Self<P> = ComponentInstance & { props: P };

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
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

test("can't mount an element without a host element", () => {
  const vdom = createElement("div", {}, [text("hello")]);
  expect(() => mountDOM(vdom, undefined as never)).toThrow();
});

test("mount a text element in a host element", () => {
  const vdom = text("hello");
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe("hello");
});

test("save the created text element in the vdom", () => {
  const vdom = text("hello");
  mountDOM(vdom, document.body);
  const el = vdom.domElement!;

  expect(el).toBeInstanceOf(Text);
  expect(el.textContent).toBe("hello");
});

test("mount an element in a host element", () => {
  const vdom = createElement("div", {}, [text("hello")]);
  mountDOM(vdom, document.body);
  expect(document.body.innerHTML).toBe("<div>hello</div>");
});

test("save the created element in the vdom", () => {
  const vdom = createElement("div");
  mountDOM(vdom, document.body);
  const el = vdom.domElement;

  expect(el).toBeInstanceOf(HTMLDivElement);
});

test("can't mount a fragment without a parent element", () => {
  const vdom = fragment([text("hello")]);
  expect(() => mountDOM(vdom, undefined as never)).toThrow();
});

test("mount a fragment in a host element", () => {
  const vdom = fragment([text("hello, "), text("world")]);
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe("hello, world");
});

test("mount a fragment inside a fragment inside a host element", () => {
  const vdom = fragment([
    createElement("p", {}, ["foo"]),
    fragment([
      createElement("p", {}, ["bar"]),
      createElement("p", {}, ["baz"]),
    ]),
  ]);
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe("<p>foo</p><p>bar</p><p>baz</p>");
});

test("all nested fragments el references point to the parent element (where they are mounted)", () => {
  const vdomOne = fragment([text("hello, "), text("world")]);
  const vdomTwo = fragment([vdomOne]);
  const vdomThree = fragment([vdomTwo]);

  mountDOM(vdomThree, document.body);

  expect(vdomThree.domElement).toBe(document.body);
  expect(vdomTwo.domElement).toBe(document.body);
  expect(vdomOne.domElement).toBe(document.body);
});

test("mount fragment with children that have attributes", () => {
  const vdom = fragment([
    createElement("span", { id: "foo" }, [text("hello, ")]),
    createElement("span", { id: "bar" }, [text("world")]),
  ]);
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe(
    '<span id="foo">hello, </span><span id="bar">world</span>'
  );
});

test("mount an element with id", () => {
  const vdom = createElement("div", { id: "foo" });
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe('<div id="foo"></div>');
});

test("mount an element with class", () => {
  const vdom = createElement("div", { class: "foo" });
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe('<div class="foo"></div>');
});

test("mount an element with a list of classes", () => {
  const vdom = createElement("div", { class: ["foo", "bar"] });
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe('<div class="foo bar"></div>');
});

test("mount an element with event handlers", () => {
  const onClick = vi.fn();
  const vdom = createElement("div", { on: { click: onClick } });
  mountDOM(vdom, document.body);

  (vdom.domElement as HTMLElement).click();

  expect(onClick).toBeCalledTimes(1);
  expect(onClick).toBeCalledWith(expect.any(MouseEvent));
  expect(vdom.listeners).toEqual({ click: expect.any(Function) });
});

test("mounts an element with styles", () => {
  const vdom = createElement("div", { style: { color: "red" } });
  mountDOM(vdom, document.body);
  const el = vdom.domElement as HTMLElement;

  expect(document.body.innerHTML).toBe('<div style="color: red;"></div>');
  expect(el.style.color).toBe("red");
});

test("where there is a host component, the event handlers are bound to it", () => {
  const comp = { count: 5 };
  const vdom = fragment([
    createElement(
      "button",
      {
        on: {
          // Can't use arrow functions, because their `this` is bound to the
          // lexical scope, and that can't be changed.
          click(this: { count: number }) {
            this.count++;
          },
        },
        id: "btn-1",
      },
      ["One"]
    ),
    createElement("div", {}, [
      createElement(
        "button",
        {
          on: {
            // Can't use arrow functions, because their `this` is bound to the
            // lexical scope, and that can't be changed.
            click(this: { count: number }) {
              this.count++;
            },
          },
          id: "btn-2",
        },
        ["Two"]
      ),
    ]),
  ]);

  mountDOM(vdom, document.body, null, comp as never);

  document.querySelector<HTMLElement>("#btn-1")!.click();
  expect(comp.count).toBe(6);

  document.querySelector<HTMLElement>("#btn-2")!.click();
  expect(comp.count).toBe(7);
});

test("mount a component with props", () => {
  const Component = createComponent({
    render(this: Self<{ message: string }>) {
      return createElement("p", { class: "important" }, [this.props.message]);
    },
  } as never);
  const vdom = createElement(Component, { message: "hello" });
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe('<p class="important">hello</p>');
  expect(vdom.fiberInstance).toBeInstanceOf(Component);
});

test("mount a component with children", () => {
  const ChildComp = createComponent({
    render(this: Self<{ message: string }>) {
      return createElement("p", {}, [this.props.message]);
    },
  } as never);
  const ParentComp = createComponent({
    render(this: Self<{ messages: string[] }>) {
      return createElement(
        "div",
        {},
        this.props.messages.map((msg) =>
          createElement(ChildComp, { message: msg })
        )
      );
    },
  } as never);
  const vdom = createElement(ParentComp, { messages: ["hello", "world"] });
  mountDOM(vdom, document.body);

  expect(document.body.innerHTML).toBe("<div><p>hello</p><p>world</p></div>");
  expect(vdom.fiberInstance).toBeInstanceOf(ParentComp);
});

test("mount a component with event handlers", () => {
  const onClick = vi.fn();
  const Component = createComponent({
    render(this: Self<object>) {
      return createElement(
        "button",
        { on: { click: () => this.emit("click") } },
        ["Click me"]
      );
    },
  } as never);
  const vdom = createElement(Component, { on: { click: onClick } });
  mountDOM(vdom, document.body);

  document.querySelector("button")!.click();

  expect(onClick).toBeCalledTimes(1);
});

test("when a component with multiple elements is mounted, the vdom keeps a reference to the first element", () => {
  const Component = createComponent({
    render() {
      return fragment([
        createElement("p", { id: "one" }, ["1"]),
        createElement("p", { id: "two" }, ["2"]),
      ]);
    },
  } as never);
  const vdom = createElement(Component);
  mountDOM(vdom, document.body);

  expect(vdom.domElement).toBe(document.querySelector("p#one"));
});

const FragComp = createComponent({
  render() {
    return fragment([
      createElement("p", {}, ["three"]),
      createElement("p", {}, ["four"]),
    ]);
  },
} as never);
const NestedFragComp = createComponent({
  render() {
    return fragment([
      createElement(FragComp),
      createElement("p", {}, ["five"]),
    ]);
  },
} as never);

/**
 * Tests several kinds of fragment insertion, always resulting in the same
 * HTML structure with paragraphs with the numbers from 1 to 7 (in order).
 */
test.each([
  {
    body: "<p>one</p><p>two</p>",
    description: "nested with component",
    vdom: fragment([
      createElement(FragComp),
      createElement("p", {}, ["five"]),
      fragment([
        createElement("p", {}, ["six"]),
        createElement("p", {}, ["seven"]),
      ]),
    ]),
    index: 2,
  },
  {
    body: "<p>one</p><p>two</p>",
    description: "nested with nested component",
    vdom: fragment([
      createElement(NestedFragComp),
      fragment([
        createElement("p", {}, ["six"]),
        createElement("p", {}, ["seven"]),
      ]),
    ]),
    index: 2,
  },
  {
    body: "<p>one</p><p>two</p><p>five</p><p>six</p><p>seven</p>",
    description: "non-nested",
    vdom: fragment([
      createElement("p", {}, ["three"]),
      createElement("p", {}, ["four"]),
    ]),
    index: 2,
  },
  {
    body: "<p>one</p><p>two</p><p>seven</p>",
    description: "single nested",
    vdom: fragment([
      createElement("p", {}, ["three"]),
      fragment([
        createElement("p", {}, ["four"]),
        createElement("p", {}, ["five"]),
        createElement("p", {}, ["six"]),
      ]),
    ]),
    index: 2,
  },
  {
    body: "<p>one</p><p>two</p><p>seven</p>",
    description: "double nested",
    vdom: fragment([
      createElement("p", {}, ["three"]),
      fragment([
        createElement("p", {}, ["four"]),
        createElement("p", {}, ["five"]),
        fragment([createElement("p", {}, ["six"])]),
      ]),
    ]),
    index: 2,
  },
  {
    body: "<p>five</p><p>six</p><p>seven</p>",
    description: "single nested",
    vdom: fragment([
      createElement("p", {}, ["one"]),
      fragment([
        createElement("p", {}, ["two"]),
        createElement("p", {}, ["three"]),
      ]),
      createElement("p", {}, ["four"]),
    ]),
    index: 0,
  },
  {
    body: "<p>one</p><p>two</p>",
    description: "single nested",
    vdom: fragment([
      fragment([
        createElement("p", {}, ["three"]),
        createElement("p", {}, ["four"]),
      ]),
      createElement("p", {}, ["five"]),
      fragment([
        createElement("p", {}, ["six"]),
        createElement("p", {}, ["seven"]),
      ]),
    ]),
    index: null,
  },
])("mount $description fragment at index $index", ({ body, vdom, index }) => {
  document.body.innerHTML = body;
  mountDOM(vdom, document.body, index);

  expect(document.body.innerHTML).toBe(singleHtmlLine`
    <p>one</p>
    <p>two</p>
    <p>three</p>
    <p>four</p>
    <p>five</p>
    <p>six</p>
    <p>seven</p>
  `);
});

test("when componentDidMount() in a component throws an error, the DOM still renders correctly", async () => {
  const consoleErrorMock = vi.fn();
  vi.stubGlobal("console", { error: consoleErrorMock });

  const ProblematicComponent = createComponent({
    componentDidMount() {
      return Promise.reject(new Error("oops"));
    },
    render() {
      return createElement("p", {}, ["problem"]);
    },
  } as never);
  const GoodBoy = createComponent({
    componentDidMount() {
      return Promise.resolve();
    },
    render() {
      return createElement("p", {}, ["good"]);
    },
  } as never);

  const vdom = fragment([
    createElement(GoodBoy),
    createElement(ProblematicComponent),
    createElement(GoodBoy),
    createElement(GoodBoy),
  ]);
  mountDOM(vdom, document.body);
  await nextTick();

  expect(document.body.innerHTML).toBe(
    "<p>good</p><p>problem</p><p>good</p><p>good</p>"
  );
  expect(consoleErrorMock).toBeCalledWith(expect.stringMatching(/scheduler/));
});
