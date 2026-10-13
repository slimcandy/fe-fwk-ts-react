import { expect, test } from "vitest";

import { ARRAY_DIFF_OP } from "../types";
import { arraysDiffSequence } from "../utils/arrays";

interface DiffOp<T> {
  op: ARRAY_DIFF_OP;
  index: number;
  item: T;
  from?: number;
}

// The port has no `applyArraysDiffSequence`; this mirrors the book's helper
// (packages/runtime/src/utils/arrays.js).
function applyArraysDiffSequence<T>(oldArray: T[], diffSeq: DiffOp<T>[]): T[] {
  return diffSeq.reduce(
    (array, { op, item, index, from }) => {
      switch (op) {
        case ARRAY_DIFF_OP.ADD:
          array.splice(index, 0, item);
          break;

        case ARRAY_DIFF_OP.REMOVE:
          array.splice(index, 1);
          break;

        case ARRAY_DIFF_OP.MOVE:
          array.splice(index, 0, array.splice(from!, 1)[0]);
          break;
      }

      return array;
    },
    [...oldArray]
  );
}

const options = ["a", "b", "c", "d", "e", "f"];

function generateRandomArray(min = 10, max = 50) {
  const length = Math.floor(Math.random() * (max - min)) + min;
  const array: string[] = [];

  for (let i = 0; i < length; i++) {
    array.push(options[Math.floor(Math.random() * options.length)]);
  }

  return array;
}

function generateRandomArrayPair(min = 10, max = 50) {
  const oldArray = generateRandomArray(min, max);
  const newArray = generateRandomArray(min, max);

  return [oldArray, newArray] as [string[], string[]];
}

const testData = Array.from({ length: 50 }, () => generateRandomArrayPair());

test.each(testData)("(fuzzy) arrays diff sequence", (oldArray, newArray) => {
  const sequence = arraysDiffSequence(oldArray, newArray);
  const actual = applyArraysDiffSequence(oldArray, sequence);

  expect(actual).toEqual(newArray);
});
