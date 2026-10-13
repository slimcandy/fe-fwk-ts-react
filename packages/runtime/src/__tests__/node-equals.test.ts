import { expect, test } from "vitest";

import { createElement } from "../create-element";
import { createComponent } from "../fiber";
import { VDOMType } from "../types";
import { areVNodesEqual } from "../vnode-equal";

import type { FragmentVNode, ReactElement, TextVNode } from "../types";

function text(value: string): TextVNode {
  return { type: VDOMType.TEXT, value };
}

function fragment(children: ReactElement[]): FragmentVNode {
  return { type: VDOMType.FRAGMENT, children };
}

test("Nodes with different types are not equal", () => {
  const nodeOne = createElement("p", {}, ["foo"]);
  const nodeTwo = text("foo");
  const nodeThree = fragment([nodeOne, nodeTwo]);

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(false);
  expect(areVNodesEqual(nodeOne, nodeThree)).toBe(false);
  expect(areVNodesEqual(nodeTwo, nodeThree)).toBe(false);
});

test("Text nodes are always equal", () => {
  const nodeOne = text("foo");
  const nodeTwo = text("bar");

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(true);
});

test("Fragment nodes are always equal", () => {
  const nodeOne = fragment([text("foo")]);
  const nodeTwo = fragment([text("bar")]);

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(true);
});

test("Element nodes are equal if they have the same tag", () => {
  const nodeOne = createElement("p", {}, ["foo"]);
  const nodeTwo = createElement("p", {}, ["bar"]);
  const nodeThree = createElement("div", {}, ["foo"]);

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(true);
  expect(areVNodesEqual(nodeOne, nodeThree)).toBe(false);
});

test("Keyed elements are equal if they have the same tag and key", () => {
  const nodeOne = createElement("p", { key: "foo" }, ["foo"]);
  const nodeTwo = createElement("p", { key: "foo" }, ["bar"]);
  const nodeThree = createElement("p", { key: "bar" }, ["foo"]);

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(true);
  expect(areVNodesEqual(nodeOne, nodeThree)).toBe(false);
});

test("Element nodes with different key props are not equal", () => {
  const nodeOne = createElement("p", { key: "foo" }, ["foo"]);
  const nodeTwo = createElement("p", { key: "bar" }, ["bar"]);

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(false);
});

test("Component nodes with different components are not equal", () => {
  const ComponentA = createComponent({} as never);
  const ComponentB = createComponent({} as never);

  const nodeOne = createElement(ComponentA, {});
  const nodeTwo = createElement(ComponentB, {});

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(false);
});

test("Component nodes with the same component are equal (even when the props are different)", () => {
  const Component = createComponent({} as never);

  const nodeOne = createElement(Component, { foo: 1 });
  const nodeTwo = createElement(Component, { bar: 2 });

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(true);
});

test("Component nodes with different key props are not equal", () => {
  const Component = createComponent({} as never);

  const nodeOne = createElement(Component, { key: "foo" });
  const nodeTwo = createElement(Component, { key: "bar" });

  expect(areVNodesEqual(nodeOne, nodeTwo)).toBe(false);
});
