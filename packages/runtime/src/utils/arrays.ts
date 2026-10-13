import { ARRAY_DIFF_OP } from "../types";

import { makeCountMap, mapsDiff } from "./maps";

function withoutNulls<T>(children: (T | null | undefined)[]): T[] {
  return children.filter((child) => child != null);
}

// Duplicates count: ["a", "a"] → ["a"] removes one "a" (the book's errata fix).
function arraysDiff<T>(
  oldArray: T[],
  newArray: T[]
): {
  added: T[];
  removed: T[];
} {
  const oldsCount = makeCountMap(oldArray);
  const newsCount = makeCountMap(newArray);
  const diff = mapsDiff(oldsCount, newsCount);

  const added = diff.added.flatMap((key) =>
    Array<T>(newsCount.get(key) ?? 0).fill(key)
  );
  const removed = diff.removed.flatMap((key) =>
    Array<T>(oldsCount.get(key) ?? 0).fill(key)
  );

  for (const key of diff.updated) {
    const delta = (newsCount.get(key) ?? 0) - (oldsCount.get(key) ?? 0);

    if (delta > 0) {
      added.push(...Array<T>(delta).fill(key));
    } else {
      removed.push(...Array<T>(-delta).fill(key));
    }
  }

  return { added, removed };
}

interface Operation<T> {
  op: ARRAY_DIFF_OP;
  index: number;
  item: T;
}

interface NoopOperation<T> extends Operation<T> {
  originalIndex: number;
}

interface MoveOperation<T> extends Operation<T> {
  originalIndex: number;
  from: number;
}

class ArrayWithOriginalIndices<T> {
  #array: T[] = [];
  #originalIndices: number[] = [];
  #equalsFn: (a: T, b: T) => boolean;

  constructor(array: T[], equalsFn: (a: T, b: T) => boolean) {
    this.#array = [...array];
    this.#originalIndices = array.map((_, index) => index);
    this.#equalsFn = equalsFn;
  }

  get length() {
    return this.#array.length;
  }

  originalIndexAt(index: number) {
    return this.#originalIndices[index];
  }

  findIndexFrom(item: T, fromIndex: number) {
    for (let index = fromIndex; index < this.length; index++) {
      if (this.#equalsFn(item, this.#array[index])) {
        return index;
      }
    }

    return -1;
  }

  wasElementRemoved(index: number, newArray: T[]) {
    if (index >= this.length) {
      return false;
    }

    const item = this.#array[index];
    const indexInNewArray = newArray.findIndex((newItem) =>
      this.#equalsFn(item, newItem)
    );

    return indexInNewArray === -1;
  }

  wasElementTheSame(index: number, newArray: T[]) {
    if (index >= this.length) {
      return false;
    }

    const item = this.#array[index];
    const newItem = newArray[index];

    return this.#equalsFn(item, newItem);
  }

  wasElementAdded(item: T, fromIndex: number) {
    return this.findIndexFrom(item, fromIndex) === -1;
  }

  removeItemAction(index: number): Operation<T> {
    const operation: Operation<T> = {
      op: ARRAY_DIFF_OP.REMOVE,
      index,
      item: this.#array[index],
    };

    this.#array.splice(index, 1);
    this.#originalIndices.splice(index, 1);

    return operation;
  }

  noopItemAction(index: number): NoopOperation<T> {
    return {
      op: ARRAY_DIFF_OP.NOOP,
      originalIndex: this.originalIndexAt(index),
      index,
      item: this.#array[index],
    };
  }

  addItemAction(item: T, index: number): Operation<T> {
    const operation: Operation<T> = {
      op: ARRAY_DIFF_OP.ADD,
      index,
      item,
    };

    this.#array.splice(index, 0, item);
    this.#originalIndices.splice(index, 0, -1);

    return operation;
  }

  moveItemAction(item: T, toIndex: number): MoveOperation<T> {
    const fromIndex = this.findIndexFrom(item, toIndex);

    const operation: MoveOperation<T> = {
      op: ARRAY_DIFF_OP.MOVE,
      originalIndex: this.originalIndexAt(fromIndex),
      from: fromIndex,
      index: toIndex,
      item: this.#array[fromIndex],
    };

    const [_item] = this.#array.splice(fromIndex, 1);
    this.#array.splice(toIndex, 0, _item);

    const [originalIndex] = this.#originalIndices.splice(fromIndex, 1);
    this.#originalIndices.splice(toIndex, 0, originalIndex);

    return operation;
  }

  removeRestItems(index: number): Operation<T>[] {
    const operations: Operation<T>[] = [];

    while (this.length > index) {
      operations.push(this.removeItemAction(index));
    }

    return operations;
  }
}

function arraysDiffSequence<T>(
  oldArray: T[],
  newArray: T[],
  equalsFn: (a: T, b: T) => boolean = (a, b) => a === b
): Array<Operation<T> | NoopOperation<T> | MoveOperation<T>> {
  const sequence: Array<Operation<T> | NoopOperation<T> | MoveOperation<T>> =
    [];
  const array = new ArrayWithOriginalIndices<T>(oldArray, equalsFn);

  for (let index = 0; index < newArray.length; index++) {
    if (array.wasElementRemoved(index, newArray)) {
      sequence.push(array.removeItemAction(index));
      index--;
      continue;
    }

    if (array.wasElementTheSame(index, newArray)) {
      sequence.push(array.noopItemAction(index));
      continue;
    }

    const item = newArray[index];

    if (array.wasElementAdded(item, index)) {
      sequence.push(array.addItemAction(item, index));
      continue;
    }

    sequence.push(array.moveItemAction(item, index));
  }

  sequence.push(...array.removeRestItems(newArray.length));

  return sequence;
}

export { withoutNulls, arraysDiff, arraysDiffSequence };
