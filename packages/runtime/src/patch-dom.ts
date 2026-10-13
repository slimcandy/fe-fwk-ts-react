import { destroyDOM } from "./destroy-dom";
import { attachEventListener } from "./events";
import { extractChildren, mountDOM } from "./mount-dom";
import {
  removeStyle,
  removeValueForAttribute,
  setStyle,
  setValueForAttribute,
} from "./set-prop";
import { ARRAY_DIFF_OP, VDOMType } from "./types";
import { arraysDiff, arraysDiffSequence } from "./utils/arrays";
import { objectsDiff } from "./utils/objects";
import { extractPropsAndEvents } from "./utils/props";
import { isNotBlankOrEmptyString } from "./utils/strings";
import { areVNodesEqual } from "./vnode-equal";

import type { ComponentInstance } from "./fiber";
import type {
  Attributes,
  DomElement,
  ElementVNode,
  TextVNode,
  ReactElement,
  FiberVNode,
  DOMProps,
} from "./types";

function patchDOM(
  oldVNode: ReactElement,
  newVNode: ReactElement,
  parentDOMNode: HTMLElement,
  parentFiberInstance: ComponentInstance | null = null
) {
  if (!areVNodesEqual(oldVNode, newVNode)) {
    const positionIndex = oldVNode.domElement
      ? findIndexInParent(parentDOMNode, oldVNode.domElement)
      : undefined;

    destroyDOM(oldVNode);
    mountDOM(newVNode, parentDOMNode, positionIndex, parentFiberInstance);

    return newVNode;
  }

  newVNode.domElement = oldVNode.domElement;

  switch (newVNode.type) {
    case VDOMType.TEXT: {
      if (oldVNode.type === VDOMType.TEXT) {
        patchText(oldVNode, newVNode);
      }

      return newVNode;
    }

    case VDOMType.ELEMENT: {
      if (oldVNode.type === VDOMType.ELEMENT) {
        patchElement(oldVNode, newVNode, parentFiberInstance);
      }
      break;
    }

    case VDOMType.COMPONENT: {
      if (oldVNode.type === VDOMType.COMPONENT) {
        patchFiber(oldVNode, newVNode);
      }
      break;
    }
  }

  patchChildren(oldVNode, newVNode, parentFiberInstance);

  return newVNode;
}

function findIndexInParent(
  parentDOMNode: Node,
  domElement: DomElement
): number | null {
  const positionIndex = Array.from(parentDOMNode.childNodes).indexOf(
    domElement
  );

  if (positionIndex < 0) {
    return null;
  }

  return positionIndex;
}

function patchText(oldVNode: TextVNode, newVNode: TextVNode) {
  if (!oldVNode.domElement) {
    throw new Error(`Cannot find DOM Element for old vNode: ${oldVNode}`);
  }

  const domElement: Text = oldVNode.domElement;
  const { value: oldText } = oldVNode;
  const { value: newText } = newVNode;

  if (oldText !== newText) {
    domElement.nodeValue = newText;
  }
}

function patchElement(
  oldVNode: ElementVNode,
  newVNode: ElementVNode,
  parentFiber: ComponentInstance | null = null
) {
  if (!oldVNode.domElement) {
    throw new Error(`Cannot find DOM Element for old vNode: ${oldVNode}`);
  }

  if (!(oldVNode.domElement instanceof HTMLElement)) {
    throw new Error("patchElement was called with a non-HTMLElement.");
  }

  const domElement: HTMLElement = oldVNode.domElement;
  const {
    class: oldClass,
    style: oldStyle,
    on: oldOnEvents,
    ...oldRestAttributes
  } = oldVNode.props;
  const {
    class: newClass,
    style: newStyle,
    on: newOnEvents,
    ...newRestAttributes
  } = newVNode.props;
  const { listeners: oldListeners } = oldVNode;

  patchAttributes(domElement, oldRestAttributes, newRestAttributes);
  patchClasses(domElement, oldClass, newClass);
  patchStyles(domElement, oldStyle, newStyle);
  newVNode.listeners = patchEvents(
    domElement,
    oldListeners,
    oldOnEvents,
    newOnEvents,
    parentFiber
  );

  function patchAttributes(
    domElement: HTMLElement,
    oldRestAttributes: Attributes,
    newRestAttributes: Attributes
  ) {
    const { added, removed, updated } = objectsDiff(
      oldRestAttributes,
      newRestAttributes
    );

    for (const key of removed) {
      removeValueForAttribute(domElement, key);
    }

    for (const key of added.concat(updated)) {
      setValueForAttribute(domElement, key, newRestAttributes[key]);
    }
  }

  function patchClasses(
    domElement: HTMLElement,
    oldClass: DOMProps["class"],
    newClass: DOMProps["class"]
  ) {
    const oldClasses = toClassList(oldClass);
    const newClasses = toClassList(newClass);

    const { added, removed } = arraysDiff(oldClasses, newClasses);

    if (removed.length > 0) {
      domElement.classList.remove(...removed);
    }
    if (added.length > 0) {
      domElement.classList.add(...added);
    }

    function toClassList(classes: DOMProps["class"] = "") {
      return Array.isArray(classes)
        ? classes.filter(isNotBlankOrEmptyString)
        : classes.split(/(\s+)/).filter(isNotBlankOrEmptyString);
    }
  }

  function patchStyles(
    domElement: HTMLElement,
    oldStyle: DOMProps["style"] = {},
    newStyle: DOMProps["style"] = {}
  ) {
    const { added, removed, updated } = objectsDiff(oldStyle, newStyle);

    for (const key of removed) {
      removeStyle(domElement, key);
    }

    for (const key of added.concat(updated)) {
      setStyle(domElement, key, newStyle[key]);
    }
  }

  function patchEvents(
    domElement: HTMLElement,
    oldListeners: ElementVNode["listeners"] = {},
    oldOnEvents: DOMProps["on"] = {},
    newOnEvents: DOMProps["on"] = {},
    parentFiber: ComponentInstance | null = null
  ) {
    const { added, removed, updated } = objectsDiff(oldOnEvents, newOnEvents);
    const listeners: ElementVNode["listeners"] = { ...oldListeners };

    for (const domEventName of removed.concat(updated)) {
      if (oldListeners[domEventName]) {
        domElement.removeEventListener(
          domEventName,
          oldListeners[domEventName]
        );
      }
      delete listeners[domEventName];
    }

    for (const eventType of added.concat(updated)) {
      if (newOnEvents[eventType]) {
        listeners[eventType] = attachEventListener(
          eventType,
          newOnEvents[eventType],
          domElement,
          parentFiber
        );
      }
    }

    return listeners;
  }
}

function patchFiber(oldVNode: FiberVNode, newVNode: FiberVNode) {
  const { fiberInstance: oldFiberInstance } = oldVNode;
  const { props: newProps } = extractPropsAndEvents(newVNode);

  oldFiberInstance.updateProps(newProps);

  newVNode.fiberInstance = oldFiberInstance;
  newVNode.domElement = oldFiberInstance.firstDOMElement;
}

function patchChildren(
  oldVNode: ReactElement,
  newVNode: ReactElement,
  parentFiber: ComponentInstance | null = null
) {
  if (!oldVNode.domElement) {
    throw new Error(`Cannot find DOM Element for old vNode: ${oldVNode}`);
  }

  const oldChildren = extractChildren(oldVNode);
  const newChildren = extractChildren(newVNode);
  const parentDomElement = oldVNode.domElement;

  const diffSequence = arraysDiffSequence<ReactElement>(
    oldChildren,
    newChildren,
    areVNodesEqual
  );

  for (const operation of diffSequence) {
    const { index, item, op } = operation;
    const offset = computeChildrenOffset(parentDomElement, parentFiber);

    switch (op) {
      case ARRAY_DIFF_OP.ADD: {
        if (parentDomElement instanceof HTMLElement) {
          mountDOM(item, parentDomElement, index + offset, parentFiber);
        }
        break;
      }
      case ARRAY_DIFF_OP.REMOVE: {
        destroyDOM(item);
        break;
      }
      case ARRAY_DIFF_OP.MOVE: {
        if (
          parentDomElement instanceof HTMLElement &&
          "originalIndex" in operation
        ) {
          const oldChild = oldChildren[operation.originalIndex];
          const newChild = newChildren[index];

          const elementsToMove =
            oldChild.type === VDOMType.COMPONENT
              ? oldChild.fiberInstance.domElements
              : oldChild.domElement
              ? [oldChild.domElement]
              : [];

          if (elementsToMove.length === 0) {
            throw new Error(
              `Cannot find DOM Element(s) for old vNode to move: ${JSON.stringify(
                oldChild
              )}`
            );
          }

          const domElementAtTargetPosition =
            parentDomElement.childNodes[index + offset];
          elementsToMove.forEach((domElement) => {
            parentDomElement.insertBefore(
              domElement,
              domElementAtTargetPosition
            );
          });
          patchDOM(oldChild, newChild, parentDomElement, parentFiber);
        }
        break;
      }
      case ARRAY_DIFF_OP.NOOP: {
        if (parentDomElement instanceof HTMLElement) {
          if ("originalIndex" in operation) {
            patchDOM(
              oldChildren[operation.originalIndex],
              newChildren[index],
              parentDomElement,
              parentFiber
            );
          }
        }
        break;
      }
    }
  }
}

// A component that renders a fragment shares its host element with siblings,
// so its children start at `offset` in the host. Only the host's own children
// are shifted; elements nested inside the component have their own children.
function computeChildrenOffset(
  parentDomElement: Node,
  parentFiber: ComponentInstance | null
) {
  if (parentFiber == null) {
    return 0;
  }

  if (parentDomElement === parentFiber.hostDOMElement) {
    return parentFiber.offset;
  }

  return 0;
}

export { patchDOM };
