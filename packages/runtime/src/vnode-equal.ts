import { VDOMType } from "./types";

import type { ReactElement } from "./types";

function areVNodesEqual(vNodeA: ReactElement, vNodeB: ReactElement) {
  if (vNodeA.type !== vNodeB.type) {
    return false;
  }

  if (
    vNodeA.type === vNodeB.type &&
    vNodeA.type === VDOMType.ELEMENT &&
    vNodeB.type === VDOMType.ELEMENT
  ) {
    const {
      tag: tagA,
      props: { key: keyA },
    } = vNodeA;
    const {
      tag: tagB,
      props: { key: keyB },
    } = vNodeB;

    return tagA === tagB && keyA === keyB;
  }

  if (
    vNodeA.type === vNodeB.type &&
    vNodeA.type === VDOMType.COMPONENT &&
    vNodeB.type === VDOMType.COMPONENT
  ) {
    const {
      tag: tagA,
      props: { key: keyA },
    } = vNodeA;
    const {
      tag: tagB,
      props: { key: keyB },
    } = vNodeB;

    return tagA === tagB && keyA === keyB;
  }

  return true;
}

export { areVNodesEqual };
