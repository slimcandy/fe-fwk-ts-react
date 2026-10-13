import { removeEventListeners } from "./events";
import { enqueueJob } from "./scheduler";
import { VDOMType } from "./types";

import type {
  ElementVNode,
  FragmentVNode,
  TextVNode,
  ReactElement,
} from "./types";

function destroyDOM(vNode: ReactElement) {
  const { type } = vNode;

  switch (type) {
    case VDOMType.TEXT: {
      removeTextNode(vNode);
      break;
    }
    case VDOMType.ELEMENT: {
      removeElementNode(vNode);
      break;
    }
    case VDOMType.FRAGMENT: {
      removeFragmentNodes(vNode);
      break;
    }
    case VDOMType.COMPONENT: {
      vNode.fiberInstance.unmount();
      enqueueJob(() => vNode.fiberInstance.componentWillUnmount());
      break;
    }

    default: {
      throw new Error(`Cannot destroy DOM of type: ${type}`);
    }
  }

  delete vNode.domElement;
}

function removeTextNode(vNode: TextVNode) {
  const { domElement } = vNode;
  if (domElement) {
    domElement.remove();
  }
}

function removeElementNode(vNode: ElementVNode) {
  const { domElement, children, listeners } = vNode;

  if (!domElement) {
    return;
  }

  domElement.remove();
  children.forEach(destroyDOM);

  if (listeners) {
    removeEventListeners(listeners, domElement);
    delete vNode.listeners;
  }
}

function removeFragmentNodes(vNode: FragmentVNode) {
  const { children } = vNode;
  children.forEach(destroyDOM);
}

export { destroyDOM };
