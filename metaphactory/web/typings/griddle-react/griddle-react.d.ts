///<reference types="react" />

declare module Griddle {
  interface GriddleConfig {}
  interface GriddleComponent extends React.ComponentClass<GriddleConfig> {
  }
}

declare module "griddle-react" {
  var Griddle:Griddle.GriddleComponent;
  export = Griddle;

}
