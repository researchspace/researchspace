
interface Assign {
  /**
   * Copy the values of all of the enumerable own properties from one or more source objects to a
   * target object. Returns the target object.
   * @param target The target object to copy to.
   * @param sources One or more source objects to copy properties from.
   */
  (target: any, ...sources: any[]): any;
}

declare module 'object-assign' {
  const assign: Assign;
  export = assign;
}
