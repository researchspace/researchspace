declare namespace RadarPlotScssNamespace {
  export interface IRadarPlotScss {
    background: string;
    cluster: string;
    clusters: string;
    component: string;
    grid: string;
    headers: string;
    item: string;
    items: string;
    ringArea: string;
    ringLabel: string;
    ringLine: string;
    sectorHeader: string;
    sectorLine: string;
    sectorPopoverTarget: string;
    subsectorHeader: string;
    subsectorLine: string;
  }
}

declare const RadarPlotScssModule: RadarPlotScssNamespace.IRadarPlotScss;

export = RadarPlotScssModule;
