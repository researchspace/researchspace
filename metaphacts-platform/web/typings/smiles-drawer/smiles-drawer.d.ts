declare module SmilesDrawer {
    
    interface Drawer {
        (options: Options): Drawer
        draw : (tree:any, id: string, style: 'light', draw: boolean ) => void
    }

    interface Options{
        width:	number
        height:	number
        bondThickness:	number
        bondLength:	number
        shortBondLength:	number
        bondSpacing:	number
        atomVisualization: 'default'| 'balls' | 'none'
        fontSizeLarge:	number
        fontSizeSmall:	number
        padding:	number
        terminalCarbons:	boolean
        explicitHydrogens:	boolean
        overlapSensitivity:	number
        overlapResolutionIterations:	number
        compactDrawing:	boolean
        isometric:	boolean
        debug:	boolean
        themes:	{}
    }
    interface parse{

    }
 

}
  
declare module "smiles-drawer" {
    var drawer: SmilesDrawer;
    export = drawer;
}