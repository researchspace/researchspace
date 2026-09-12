import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from 'lodash';
import { Component, ComponentProps, ComponentContext} from 'platform/api/components';
import { SparqlClient } from 'platform/api/sparql';
import { DataSet, Timeline } from 'vis';
import { trigger } from 'platform/api/events';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import { Rdf } from 'platform/api/rdf';
import * as uuid from 'uuid';

export interface HybridTimelineConfig {
    query: string;
}
export type HybridTimelineProps = HybridTimelineConfig & React.Props<HybridTimeline> & ComponentProps;

interface HybridTimelineState {
    items: DataSet<any>;
    yearSidebar: Array<Array<any>>;
    parsedDates: Array<any>;
    timeline: any;
}

export class HybridTimeline extends Component<HybridTimelineProps, HybridTimelineState> {
    context: ComponentContext;
    timelineRef = React.createRef<HTMLDivElement>();
    styleId = uuid.v1();
    constructor(props: HybridTimelineConfig, context: ComponentContext) {
        super(props, context);
        this.state = {items: new DataSet([]), yearSidebar: [], parsedDates: [], timeline: null};
    }

    public componentDidMount() {
        let colours = ["rgb(255, 138, 138)", "rgb(112, 215, 255)", "rgb(205, 135, 255)", "rgb(102, 217, 138)", "rgb(69, 131, 255)", "rgb(255, 174, 69)", "rgb(245, 223, 83)", "rgb(255, 110, 194)"];

        SparqlClient.select(this.props.query).onValue(
            (response) => {
                let years = [];
                let types = [];
                for (const date of response.results.bindings) {
                    let year = date.start.value.split("-")[0];
                    if (!years.includes(year)) {
                        this.state.parsedDates[year] = [];
                        years.push(year);
                    }

                    if (!types.includes(date.type.value)) {
                        types.push(date.type.value);
                    }

                    let colour = "";
                    if (types.indexOf(date.type.value) > (colours.length - 1)) {
                        colour = colours[colours.length - 1];
                    } else {
                        colour = colours[types.indexOf(date.type.value)];
                    }

                    this.state.parsedDates[year].push({title: date.label.value, date: date.start.value, iri: date.subject.value, colour: colour});
                }

                for (let i = 0; i < years.length; i++) {
                    let year = years[i];

                    let dateCard = document.createElement('div');
                    let dateCardInternal = (
                        <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <h4 className="yearInfo"> { year } </h4>
                            <img onClick={() => {this.openVerticalTimeline(year)}} className="stackButton" src="/assets/components/timeline/imgs/stack.png" style={{cursor: "pointer", height: "40px", width: "49px", padding: "8px"}} />
                            <span style={{position: "absolute", right: "16.5px", top: "22px", pointerEvents: "none"}}>{ this.state.parsedDates[year].length }</span>
                        </div>
                    );
                    ReactDOM.render(dateCardInternal, dateCard);

                    this.state.yearSidebar[year] = [];
                    for (let y = 0; y < this.state.parsedDates[year].length; y++) {
                        this.state.yearSidebar[year].push(
                            <li>
                                <div className="content" style={{ position: "relative", backgroundColor: this.state.parsedDates[year][y].colour }}>
                                    <h3>{this.state.parsedDates[year][y].date.split("-")[0]}: {this.state.parsedDates[year][y].title}</h3>
                                    <div className="toolIcons">
                                        <a onClick={() => {trigger({eventType: 'Dashboard.AddFrame',  targets: ["thinking-frames"], source: 'timeline-trigger', data: {"resourceIri": this.state.parsedDates[year][y].iri, "viewId": "resource"}})}}>
                                            <i style={{color: "black", fontSize: "25px", padding: "0px 8px"}} className="rs-icon rs-icon-page"></i>
                                        </a>
                                        <a onClick={() => {trigger({eventType: 'Dashboard.AddFrame',  targets: ["thinking-frames"], source: 'timeline-trigger', data: {"resourceIri": this.state.parsedDates[year][y].iri, "viewId": "knowledge-map"}})}}>
                                            <i style={{color: "black", fontSize: "25px", padding: "0px 8px"}} className="rs-icon rs-icon-diagram"></i>
                                        </a>
                                        <a onClick={() => {this.openResourceDetails(this.state.parsedDates[year][y].iri)}}>
                                            <i style={{color: "black", fontSize: "25px", padding: "0px 8px"}} className="rs-icon rs-icon-sidebar_right"></i>
                                        </a>
                                        <a onClick={() => {this.addResourceToClipboard(this.state.parsedDates[year][y].iri)}}>
                                            <img style={{height: "30px", padding: "0px 8px", paddingBottom: "2px"}} src="/assets/components/timeline/imgs/clipboard.png" />
                                        </a>
                                    </div>
                                </div>
                                <div className="vrpoint" style={{backgroundColor: (this.state.parsedDates[year][y].colour as string)}}></div>
                            </li>
                        );
                    }

                    this.state.items.add({id: i, content: dateCard, start: year + "-01-01"});
                }

                this.createTimeline();
            }
        );
    }

    public render() {
        return(
            <div style={{display: "flex", flexDirection: "row"}} ref={this.timelineRef}>
                <div id="lincs-timeline" style={{width: "66%", margin: "2%", marginBottom: "0px", border: "1px solid lightgray", flexGrow: 4}}></div>
                <div style={{backgroundColor: "lightgrey", width: "30%", marginTop: "2%", height: "500px"}}>
                    <div id="sidebarContent" style={{height: "500px", overflowY: "auto"}}>
                        <div style={{display: "flex", flexDirection: "row", alignItems: "center", marginLeft: "20px"}}>
                            <h3 id="sidebarTitle">Vertical Timeline</h3>
                        </div>
                        <style id="vrstyleBlock">{"." + this.styleId.split("-")[0] + "::before {height: 0%;}"}</style>
                        <div id="vrtimeline" className={this.styleId.split("-")[0]} style={{maxWidth: "400px", minWidth: "200px"}}>
                            
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private openVerticalTimeline(year) { // This function opens the sidebar timeline
        let listContainer = this.timelineRef.current.querySelector("#vrtimeline");
        ReactDOM.unmountComponentAtNode(listContainer);
        let renderComponent = (
            <ul id="vrlist" style={{margin: "0px", width: "100%"}}>
                {this.state.yearSidebar[year]}
            </ul>
        );
        ReactDOM.render(renderComponent, listContainer);
        this.timelineRef.current.querySelector("#vrstyleBlock").innerHTML = "." + this.styleId.split("-")[0] + "::before {height: " + this.timelineRef.current.querySelector("#vrlist").scrollHeight + "px;}";
    }

    private openResourceDetails(iri) {
        trigger({
            eventType: 'Dashboard.OpenSidebar',  
            targets: ["thinking-frames"], 
            source: 'timeline-trigger',
            data: {"iri":  iri}
        });
    }

    private addResourceToClipboard(iri) {
        addToDefaultSet(Rdf.iri(iri), 'timeline-trigger').onValue(() => {
            trigger({eventType: 'Component.Refresh', targets: ["clipboard"], source: 'timeline-trigger'});
        });
    }

    private createTimeline() { // This function creates the timeline
        let options = {
            height: '500px',
            zoomMin: 378683420000
        };
            
        let timeline = new Timeline(this.timelineRef.current.querySelector("#lincs-timeline"), this.state.items, options);
    }
  
}
export default HybridTimeline;
