/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

export class Ordering {
  static readonly empty = new Ordering([]);

  private constructor(private readonly positions: ReadonlyArray<number>) {}

  get size() {
    return this.positions.length;
  }

  setSize(size: number): Ordering {
    if (this.positions.length === size) {
      return this;
    } else if (size < this.positions.length) {
      return new Ordering(invert(invert(this.positions).filter((p) => p < size)));
    } else {
      const result = this.positions.slice();
      for (let i = result.length; i < size; i++) {
        result.push(i);
      }
      return new Ordering(result);
    }
  }

  getPosition(index: number): number {
    return this.positions[index];
  }

  getPositionToIndex(): number[] {
    return invert(this.positions);
  }

  apply<T>(items: ReadonlyArray<T>): T[] {
    return this.setSize(items.length)
      .getPositionToIndex()
      .map((index) => items[index]);
  }

  moveItemFromTo(fromPosition: number, toPosition: number): Ordering {
    if (fromPosition === toPosition) {
      return this;
    }
    const positionToIndex = this.getPositionToIndex();
    const [index] = positionToIndex.splice(fromPosition, 1);
    positionToIndex.splice(toPosition, 0, index);
    return new Ordering(invert(positionToIndex));
  }
}

function invert(transpositions: ReadonlyArray<number>): number[] {
  const result = new Array(transpositions.length);
  for (let i = 0; i < transpositions.length; i++) {
    result[transpositions[i]] = i;
  }
  return result;
}
