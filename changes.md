# Terminology Audit — React Alignment

This document tracks terms used in the educational framework vs. their real React equivalents, to help understand what each concept maps to in production React.

---

## ✅ Correct — matches real React

| Framework term | React term | Notes |
|---|---|---|
| `ReactElement` | `ReactElement` | Exact match. React's type for virtual DOM nodes |
| `createElement` | `React.createElement()` | Exact match |
| `createApp` | `ReactDOM.createRoot()` | Close enough for educational purposes |
| `componentDidMount` | `componentDidMount` | Exact class lifecycle method name |
| `componentWillUnmount` | `componentWillUnmount` | Exact (though deprecated in modern React) |
| `setState` | `this.setState()` | Exact class component method |
| `render()` method | `render()` | Exact class component method |
| `scheduler.ts` | `react-scheduler` package | React has a real scheduler package with same idea |
| `patchChildren` | Reconciliation / diffing | Correct concept; React calls the phase "reconciliation" |

---

## ❌ Biggest mismatch — `Fiber` class name

**What the framework does:** `Fiber` is the class users instantiate — it holds `props`, `state`, `render()`, `setState()`, lifecycle hooks.

**What React does:** The class users extend is `React.Component` (or `PureComponent`). A **Fiber** (internally `FiberNode`) is a completely separate internal data structure — a linked-list node in React's work tree. It stores the component instance, effect list, work-in-progress state, lane/priority info, etc. Users never touch a Fiber directly.

The name hierarchy is essentially flipped:
- Framework's `Fiber` class → React's `Component` class
- Framework's `FiberVNode` struct → React's `FiberNode` internal struct

**Fix:** Rename `Fiber` class → `Component`. Rename `FiberVNode` → `ComponentVNode` or `FiberNode`.

---

## ❌ `Dispatcher` — wrong React association

**Framework's `Dispatcher`:** A pub/sub event bus where components subscribe to named actions.

**React's "dispatcher":** React has an internal `ReactCurrentDispatcher` object, but it routes hook calls (`useState`, `useEffect`, etc.) to the correct implementation (mount vs. update phase). Users never interact with it.

The framework's `Dispatcher` is architecturally **Redux** (`store.dispatch(action)`, `store.subscribe()`).

**Fix:** Rename to `Store` or `EventBus` to make the Redux parallel explicit.

---

## ❌ `emit` / `FiberEventMap` / `FiberEmitGenerator` — Vue.js, not React

**Framework pattern:** Child calls `this.emit('eventName', payload)` → parent receives it via `FiberEventMap`.

**React's pattern:** React has **no** `emit`. You pass callback functions as props. Child calls `this.props.onSomething(payload)`. The `emit` pattern comes from **Vue 3** (`emit('event-name', payload)`).

All of `FiberEventMap`, `FiberEventName`, `FiberEmitGenerator` follow this Vue pattern.

**Note:** When learning React, replace this mental model — child-to-parent communication is just a callback prop, not an event emission system.

---

## ❌ `View` type — Elm/MVC, not React

**Framework's `View`:** `(state: State, emit: Emit) => ReactElement` — a render function taking state and dispatch.

**React's term:** There is no `View` type in React. The component's `render()` method is just called "render". The signature `(state, dispatch) => element` is from the **Elm architecture** (also seen in Redux/Flux thinking).

**Fix:** Rename to `RenderFn` or remove entirely.

---

## ⚠️ `createComponent` — not a modern React term

**Framework:** Factory function that defines a component class.

**React:** You define components by writing `class MyComp extends React.Component { ... }` or writing a plain function. React had `React.createClass()` in very old versions (pre-2015) but it was removed. This pattern is closer to **Vue's `defineComponent()`**.

**Note:** Fine for educational purposes, but note that modern React doesn't have a factory like this.

---

## ⚠️ `Reducer` / `Reducers` / `ActionName` / `ActionPayload` — Redux, not React

React does have `useReducer(reducer, initialState)` with the same reducer concept. But:
- `Reducers` as a map of `actionName → reducer` is a **Redux** pattern
- `ActionName` and `ActionPayload` as separate explicit types are Redux terms
- In React's `useReducer`, the action is typically `{ type: string, payload?: any }` — a single object, not separate name/payload arguments

**Note:** The framework uses Redux-style architecture. Real React components don't have a `Reducers` map; they use a single reducer or `useState`.

---

## ⚠️ `nextTick` — Vue.js term

`scheduler.ts` exports `nextTick(): Promise<void>`.

**React's equivalent:** React doesn't expose a `nextTick`. The closest are `flushSync()`, `startTransition()`, or `useEffect` (to run after paint). `nextTick` is specifically a **Vue** API.

**Fix:** Rename to `flushAsync` or `flush`.

---

## ⚠️ `VNodeChild` — close, React calls it `ReactNode`

**Framework's `VNodeChild`:** `string | ReactElement`

**React's `ReactNode`:** `ReactElement | string | number | boolean | null | undefined | ReactFragment` — wider union.

The term `VNodeChild` also mixes Vue terminology ("VNode") with the React naming style.

**Fix:** Rename to `ReactNode`.

---

## ⚠️ `FiberProps` vs `DOMProps` split — not a React distinction

React has just `Props`. The split between `FiberProps` (for components) and `DOMProps` (for HTML elements) is an implementation detail the framework makes explicit. This is actually useful for understanding React's internals, since React handles this boundary silently.

---

## Full summary

| Framework term | Origin | Suggested fix |
|---|---|---|
| `Fiber` (class) | ❌ Misleading — this is `Component` | Rename to `Component` |
| `FiberVNode` | ⚠️ Closer to React's internal `FiberNode` | Rename to `ComponentVNode` or `FiberNode` |
| `Dispatcher` | ❌ Redux Store / EventBus | Rename to `Store` |
| `emit` / `FiberEventMap` | ❌ Vue 3 API | Note: React uses callback props instead |
| `View` type | ❌ Elm architecture | Rename to `RenderFn` |
| `createComponent` | ⚠️ Old `React.createClass` | Note: modern React uses class syntax or functions |
| `nextTick` | ❌ Vue.js API | Rename to `flushAsync` or `flush` |
| `Reducers` type | ⚠️ Redux, not React | Note: React's `useReducer` uses a single reducer |
| `VNodeChild` | ⚠️ Mixes Vue + React naming | Rename to `ReactNode` |
| `componentDidMount` | ✅ Exact match | Keep |
| `componentWillUnmount` | ✅ Exact match | Keep |
| `setState` | ✅ Exact match | Keep |
| `createElement` | ✅ Exact match | Keep |
| `ReactElement` | ✅ Exact match | Keep |
