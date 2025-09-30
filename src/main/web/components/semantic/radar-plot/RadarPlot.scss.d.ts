declare namespace RadarPlotScssNamespace {
  export interface IRadarPlotScss {
    cluster: string;
    ringArea: string;
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
