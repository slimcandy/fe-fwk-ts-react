import type { DOMProps, FiberProps } from "./types";

function setProp(domElement: HTMLElement, props: DOMProps | FiberProps) {
  const { class: className, style, ...restAttrs } = props;

  if (
    className &&
    (typeof className === "string" || Array.isArray(className))
  ) {
    setClass(domElement, className);
  }

  if (style) {
    Object.entries(style).forEach(([key, value]) => {
      if (typeof value === "string") {
        setStyle(domElement, key, value);
      }
    });
  }

  for (const [key, value] of Object.entries(restAttrs)) {
    setValueForAttribute(domElement, key, value);
  }
}

function setClass(domElement: HTMLElement, className: string | string[]) {
  domElement.className = "";

  if (typeof className === "string") {
    domElement.className = className;
  }

  if (Array.isArray(className)) {
    domElement.classList.add(...className);
  }
}

function setStyle(domElement: HTMLElement, key: string, value: string) {
  domElement.style[key] = value;
}

function removeStyle(domElement: HTMLElement, key: string) {
  domElement.style[key] = null;
}

function setValueForAttribute(
  domElement: HTMLElement,
  key: string,
  value: unknown
) {
  if (value == null) {
    removeValueForAttribute(domElement, key);
  } else if (key.startsWith("data-")) {
    domElement.setAttribute(key, String(value));
  } else if (typeof value === "boolean") {
    domElement[key] = value;
  } else {
    domElement.setAttribute(key, String(value));
  }
}

function removeValueForAttribute(domElement: HTMLElement, key: string) {
  domElement[key] = null;
  domElement.removeAttribute(key);
}

export {
  setProp,
  setValueForAttribute,
  removeValueForAttribute,
  setStyle,
  removeStyle,
};
