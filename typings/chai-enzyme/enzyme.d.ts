/**
 * We use this small typings instead of typings from DefinitelyTyped because of typescript bug:
 * see https://github.com/Microsoft/TypeScript/issues/10759
 */

declare module 'enzyme' {
  export function configure({ adapter: any }): void;
  export function shallow(...args: any[]): any;
  export function mount(...args: any[]): any;
  export function mount<T, K>(...args: any[]): any;

  interface ReactWrapper<T, K> {
    unmount(): void;
    ref(...args: any[]): any;
    instance(): any;
    setProps(props: any): any;
    find(comp: any): any;
    update();
  }
}
