# fe-fwk-ts-react

A TypeScript port of the framework from the book [Build a Frontend Web Framework (From Scratch)](https://www.manning.com/books/build-a-frontend-web-framework-from-scratch) by Ángel Sola Orbaiceta, following his [official repository](https://github.com/angelsolaorbaiceta/fe-fwk-book), with types and names taken from React. If you read the book, this shows how each piece maps to React.

**Demo:** [react.avolkov.dev](https://react.avolkov.dev). A slider walks a notes list through seven edits. For each one you see how many components ran `render()`, how many DOM writes reached the page, a table of each position's props, state and native `<input>` value, and the real DOM. A checkbox turns keys off, to show when they matter and when they don't.

## What's inside

- **Virtual DOM:** `createElement()` builds plain objects; `mountDOM()` turns them into DOM nodes.
- **Reconciliation:** `patchDOM()` compares the old and new trees and changes only what differs. `arraysDiffSequence()` finds the added, removed and moved children of keyed lists.
- **Components:** `createComponent()` with `state`, `setState()`, `componentDidMount()` and `componentWillUnmount()`. A component whose props didn't change skips `render()`.
- **Events:** DOM events through `on: { click }`, and component events through `emit()`.
- **Scheduler:** lifecycle hooks run in a microtask queue after the DOM work.

## Names: the book, this port, React

| Book | This port | React |
|---|---|---|
| `h()` | `createElement()` | `React.createElement()` |
| `defineComponent()` | `createComponent()` | `class extends React.Component` |
| `updateState()` | `setState()` | `this.setState()` |
| `onMounted()` | `componentDidMount()` | `componentDidMount()` |
| `onUnmounted()` | `componentWillUnmount()` | `componentWillUnmount()` |
| `emit("add")` | `emit("add")` | a callback prop: `props.onAdd()`. `emit()` comes from Vue |
| `vdom.el` | `vNode.domElement` | `fiber.stateNode` (internal) |
| `component.elements` | `fiberInstance.domElements` | — |
| `areNodesEqual()` | `areVNodesEqual()` | same type and same `key` |
| `createApp().mount()` | `createApp().mount()` | `createRoot().render()` |

In React, a *Fiber* is an internal node of the work tree, not the component users write. Here, `Fiber` is the class `createComponent()` returns.

## Tests

```sh
npm test
```

- **The book's test suite**, ported to TypeScript (`packages/runtime/src/__tests__`): arrays, diff sequence (with random arrays), node equality, mount, destroy, patch.
- **Against React** (`vs-react.test.ts`): the same keyed list is rendered by this runtime and by `react-dom`, the same edits are applied to both, and after each edit the DOM must be identical. [fast-check](https://fast-check.dev) generates random lists and edits, including a list inside a fragment that doesn't start at index 0. The tests also record DOM writes per edit: moving the last of five notes to the top takes 2 here and 8 in React.
- **Regression tests** (`bugs.test.ts`) for the places where this port used to differ from the book.

Known limitation, shared with the book: a component whose fragment becomes empty can't find its place in the parent, so its next children land at the start.

## Run it

Needs Node 24 or newer.

```sh
git clone https://github.com/slimcandy/fe-fwk-ts-react
cd fe-fwk-ts-react
npm install
npm test        # the tests
npm run dev     # the notes demo at http://localhost:5173
npm run build   # rebuilds packages/runtime/dist, which is committed
```

```js
import { createApp, createComponent, createElement } from "fe-fwk-ts-react";

const Counter = createComponent({
  state() {
    return { count: 0 };
  },
  render() {
    const { count } = this.state;
    return createElement(
      "button",
      { on: { click: () => this.setState({ count: count + 1 }) } },
      [`Clicked ${count} times`]
    );
  },
});

createApp(Counter).mount(document.body);
```

## Layout

- `packages/runtime`: the framework, its tests, and the built `dist/fe-fwk-ts-react.js`
- `examples/notes`: the demo (Vite, Tailwind CSS)
