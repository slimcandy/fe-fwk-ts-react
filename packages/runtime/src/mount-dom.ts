import { attachEventListeners } from "./events";
import { enqueueJob } from "./scheduler";
import { setProp } from "./set-prop";
import { VDOMType } from "./types";
import { extractPropsAndEvents } from "./utils/props";

import type { ComponentInstance } from "./fiber";
import type {
  DomElement,
  ElementVNode,
  FragmentVNode,
  TextVNode,
  ReactElement,
  FiberVNode,
  FiberEventMap,
} from "./types";

function mountDOM(
  vNode: ReactElement,
  parentDOMElement: HTMLElement,
  positionIndex: number | null = null,
  parentFiberInstance: ComponentInstance | null = null
) {
  if (parentDOMElement == undefined) {
    throw new Error(`
      "Parent element is not defined: ${parentDOMElement}`);
  }

  switch (vNode.type) {
    case VDOMType.TEXT:
      createDOMElementFromTextNode(vNode, parentDOMElement, positionIndex);
      break;
    case VDOMType.ELEMENT:
      createDOMElementFromElementNode(
        vNode,
        parentDOMElement,
        positionIndex,
        parentFiberInstance
      );
      break;
    case VDOMType.FRAGMENT:
      createDOMElementFromFragmentNode(
        vNode,
        parentDOMElement,
        positionIndex,
        parentFiberInstance
      );
      break;
    case VDOMType.COMPONENT:
      createDOMElementFromFiberNode(
        vNode,
        parentDOMElement,
        positionIndex,
        parentFiberInstance
      );
      enqueueJob(() => vNode.fiberInstance.componentDidMount());
      break;
    default:
      throw new Error(`Unknown vNode type`);
  }
}

function createDOMElementFromTextNode(
  vNode: TextVNode,
  parentDOMElement: HTMLElement,
  positionIndex: number | null
) {
  const { value } = vNode;
  const domTextNode = document.createTextNode(value);
  vNode.domElement = domTextNode;

  insertIntoDOM(domTextNode, parentDOMElement, positionIndex);
}

function createDOMElementFromFragmentNode(
  vNode: FragmentVNode,
  parentDOMElement: HTMLElement,
  positionIndex: number | null,
  parentFiberInstance: ComponentInstance | null = null
) {
  const { children } = vNode;
  vNode.domElement = parentDOMElement;

  for (const child of children) {
    mountDOM(child, parentDOMElement, positionIndex, parentFiberInstance);

    if (positionIndex == null) {
      continue;
    }

    switch (child.type) {
      case VDOMType.FRAGMENT:
        positionIndex += child.children.length;
        break;
      case VDOMType.COMPONENT:
        positionIndex += child.fiberInstance.domElements.length;
        break;
      default:
        positionIndex++;
    }
  }
}

function createDOMElementFromElementNode(
  vNode: ElementVNode,
  parentDOMElement: HTMLElement,
  positionIndex: number | null,
  parentFiberInstance: ComponentInstance | null = null
) {
  const { tag, children } = vNode;

  const domElement = document.createElement(tag);
  setInitialProperties(domElement, vNode, parentFiberInstance);
  vNode.domElement = domElement;

  children.forEach((child) => {
    mountDOM(child, domElement, null, parentFiberInstance);
  });

  return insertIntoDOM(domElement, parentDOMElement, positionIndex);
}

function createDOMElementFromFiberNode(
  vNode: FiberVNode,
  parentDOMElement: HTMLElement,
  positionIndex: number | null,
  parentFiberInstance: ComponentInstance | null = null
) {
  const ClassComponent = vNode.tag;
  const { eventMap: fiberEventMap, props } = extractPropsAndEvents(vNode);
  const fiberInstance = new ClassComponent(
    props,
    fiberEventMap as FiberEventMap,
    parentFiberInstance
  );

  fiberInstance.mount(parentDOMElement, positionIndex);
  vNode.fiberInstance = fiberInstance;
  vNode.domElement = fiberInstance.firstDOMElement;
}

function setInitialProperties(
  domElement: HTMLElement,
  vNode: ElementVNode,
  parentFiberInstance: ComponentInstance | null
) {
  const { eventMap, props } = extractPropsAndEvents(vNode);

  if (eventMap) {
    vNode.listeners = attachEventListeners(
      eventMap,
      domElement,
      parentFiberInstance
    );
  }
  setProp(domElement, props);
}

function insertIntoDOM(
  domElement: DomElement,
  parentDOMElement: Node,
  positionIndex: number | null
) {
  if (positionIndex == null) {
    return parentDOMElement.appendChild(domElement);
  }

  if (positionIndex < 0) {
    throw new Error(
      `Position Index must be positive integer, but got ${positionIndex}`
    );
  }

  const children = parentDOMElement.childNodes;

  if (positionIndex >= children.length) {
    parentDOMElement.appendChild(domElement);
  } else {
    parentDOMElement.insertBefore(domElement, children[positionIndex]);
  }
}

function extractChildren(vNode: ReactElement) {
  if ("children" in vNode) {
    const children: ReactElement[] = [];

    for (const child of vNode.children) {
      if (child.type === VDOMType.FRAGMENT) {
        children.push(...extractChildren(child));
      } else {
        children.push(child);
      }
    }

    return children;
  }
  return [];
}

export { mountDOM, extractChildren };
