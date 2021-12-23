var vis = require("vis-timeline");
var data = require("vis-data");

class lincsTimelineHoriz1 extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = "";
        var template = 
        `
        <div style="display: flex; flex-direction: row;">
            <div id="lincs-timeline" style="width: 66%; margin: 2%; border: 1px solid lightgray; flex-grow: 4;"></div>
            <div style="background-color: lightgrey; width: 30%; margin-top: 2%; height: 500px;">
                <div id="sidebarContent" style="height: 500px; overflow-y: auto;">
                    <div style="display: flex; flex-direction: row; align-items: center; margin-left: 20px;">
                        <h3 id="sidebarTitle">Vertical Timeline</h3>
                    </div>
                    <style id="vrstyleBlock">.vrtimeline::before {height: 0%;}</style>
                    <div class="vrtimeline" style="max-width: 400px; min-width: 200px;">
                        <ul id="vrlist" style="margin: 0px; width: 100%;">
                        
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="slidecontainer" id="slidecontainer" style='display: none;'>
            <span id="hover-info-1"></span>
            <span id="hover-info-2"></span>
            <input type="range" id="range" min="1" max="100" value="1">
        </div>
        <bs-alert id="warning" bs-style="warning" class="search-results__alert" style="text-align: left; display: none;">
            <i class="fa fa-exclamation-triangle" aria-hidden="true" style="margin-right: 10px;"></i>
            <span class="num-results">The timeline can only display 150 dates at a time. Use the slider to move the date range.</span>
        </bs-alert>
        <div id="loading-block" class="modal-backdrop in" style="display: none;">
            <span class="system-spinner">
                <i class="system-spinner__icon"></i>
                <span class="system-spinner__message">Please wait...</span>
            </span>
        </div>
        `;
        this.innerHTML = template;

        this.loadingBlock = this.querySelector("#loading-block");
        this.container = this.querySelector("#lincs-timeline");
        this.listContainer = this.querySelector("#vrlist");
        this.sidebarContainer = this.querySelector("#sidebarContent");
        this.sidebarTitle = this.querySelector("#sidebarTitle");
        this.styleBlock = this.querySelector("#vrstyleBlock");
        this.slider = this.querySelector("#slidecontainer #range");
        this.sliderContainer = this.querySelector("#slidecontainer");
        this.hoverInfo1 = this.querySelector("#hover-info-1");
        this.hoverInfo2 = this.querySelector("#hover-info-2");
        this.warning = this.querySelector("#warning");
        this.items = new data.DataSet([ ]);
        this.entries = [];
        this.yearDisplay = [];
        this.years = [];
        this.displayedYears = [];
    }
    connectedCallback() {
        var _this = this;

        var types = [];
        var colours = ["background-color: rgb(255, 138, 138);", "background-color: rgb(112, 215, 255);", "background-color: rgb(205, 135, 255);", "background-color: rgb(102, 217, 138);", "background-color: rgb(69, 131, 255);", "background-color: rgb(255, 174, 69);", "background-color: rgb(245, 223, 83);", "background-color: rgb(255, 110, 194);"];
        var info = document.getElementById("qinfo");

        var entries = info.textContent.split(";");
        for (var i = 0; i < (entries.length / 4) - 1; i++) {
            var entry = [];
            entry[0] = entries[i * 4];
            entry[1] = entries[(i * 4) + 1];
            entry[2] = entries[(i * 4) + 2];
            entry[4] = entries[(i * 4) + 3];

            var ind = types.indexOf(entry[2]);
            if (ind == -1) {
                types.push(entry[2]);
                ind = types.length - 1;
            }

            if (colours[ind] == null) {
                entry[2] = "background-color: gray;";
            } else {
                entry[2] = colours[ind];
            }

            if (this.years.includes(entry[1].split("-")[0])) {
                this.entries[entry[1].split("-")[0]].push(entry);
            } else {
                this.entries[entry[1].split("-")[0]] = [];
                this.entries[entry[1].split("-")[0]].push(entry);

                this.years.push(entry[1].split("-")[0]);
            }
        }

        for (var i = 0; i < this.years.length; i++) {
            var year = this.years[i];
            var html = "";

            var dateCard = document.createElement("div");
            dateCard.innerHTML = `
            <span hidden>" + year + "</span>
            <div style="display: flex; flex-direction: row; align-items: center;">
                <h4>` + year + `</h4>
                <img src="/assets/components/timeline/imgs/stack.png" style="cursor: pointer; height: 40px; width: 49px; padding: 8px;" />
                <span style="position: absolute; right: 16.5px; top: 22px; pointer-events: none;">` + this.entries[year].length + `</span>
            </div>`;
            var stackButton = dateCard.firstChild.nextSibling.nextSibling.nextSibling.firstChild.nextSibling.nextSibling.nextSibling;

            for (var y = 0; y < this.entries[year].length; y++) {
                html += `<li>
                    <div class="content" style="position: relative; ` + this.entries[year][y][2] + `">
                        <h3>` + this.entries[year][y][1].split("T")[0] + ": " + this.entries[year][y][0] + `</h3>
                        <div class="toolIcons">
                            <a href="/resource/?uri=` + this.entries[year][y][3] + `">
                                <i style="color: black; font-size: 25px; padding: 0px 8px;" class="rs-icon rs-icon-page"></i>
                            </a>
                            <a href="/resource/:ThinkingFrames?view=knowledge-map&resource=` + this.entries[year][y][3] + `">
                                <i style="color: black; font-size: 25px; padding: 0px 8px;" class="rs-icon rs-icon-diagram"></i>
                            </a>
                            <a onclick="openResourceDetails('` + this.entries[year][y][3] + `')">
                                <i style="color: black; font-size: 25px; padding: 0px 8px;" class="rs-icon rs-icon-sidebar_right"></i>
                            </a>
                            <a onclick="addResourceToClipboard('` + this.entries[year][y][3] + `')">
                                <img style="height: 30px; padding: 0px 8px; padding-bottom: 2px;" src="/assets/components/timeline/imgs/clipboard.png" />
                            </a>
                        </div>
                    </div>
                    <div class="vrpoint" style="` + this.entries[year][y][2] + `"></div>
                </li>`
            }
            
            stackButton.addEventListener("click", function() {
                _this.openVerticalTimeline(this);
            });

            this.yearDisplay[year] = [];
            this.yearDisplay[year][0] = dateCard;
            this.yearDisplay[year][1] = html;
            if (i < 150 && !this.displayedYears.includes(year)) {
                this.items.add({id: this.displayedYears.length, content: this.yearDisplay[year][0], start: year + "-01-01"});
                this.displayedYears.push(year);
            }
        }
        this.createTimeline();
    }
    openVerticalTimeline(element) { // This function opens the sidebar timeline
        this.sidebarTitle.textContent = "Vertical Timeline";
        this.listContainer.innerHTML = this.yearDisplay[element.previousSibling.previousSibling.textContent][1];
        this.listContainer.style.visibility = "visible";

        this.styleBlock.innerHTML = ".vrtimeline::before {height: " + this.listContainer.scrollHeight + "px;}";
    }
    createTimeline() { // This function creates the timeline
        var _this = this;
        var options = {
            height: '500px',
            zoomMin: 378683420000
        };
            
        this.timeline = new vis.Timeline(this.container, this.items, options);

        if (this.displayedYears.length > 150) {
            this.sliderContainer.style.display = "block";
            this.warning.style.display = "block";

            this.hoverInfo1.textContent = this.displayedYears[0];
            this.hoverInfo2.textContent = this.displayedYears[150];
            this.hoverInfo1.style.left = (-this.hoverInfo1.offsetWidth) + "px";
            this.hoverInfo2.style.left = 65 + "px";

            this.slider.addEventListener("mouseup", function () {
                _this.updateDates(this.value);
            });

            this.slider.addEventListener("input", function() {
                _this.updateSlider(this.value);
            });
        }
    }
    updateDates(value) { // This function updates the slider dates
        var _this = this;
        this.loadingBlock.style.display = "block";
        
        var start;
        if (value == 1) {
            start = 0;
        } else {
            start = Math.floor((value / 100) * (this.years.length - 150));
        }

        setTimeout(function(){
            _this.displayedYears = [];
            for (var i = start; i < (start + 150) && i < _this.years.length; i++) {
                if (!_this.displayedYears.includes(_this.years[i])) {
                    _this.items.update({id: _this.displayedYears.length, content: _this.yearDisplay[_this.years[i]][0], start: _this.years[i] + "-01-01"});
                    _this.displayedYears.push(_this.years[i]);
                }
            }

            _this.timeline.fit({animation: true});
            _this.loadingBlock.style.display = "none";
        }, 100);
    }
    updateSlider(value) { // This function updates the displayed dates after a slider entry
        var start;
        if (value == 1) {
            start = 0;
        } else {
            start = Math.floor((value / 100) * (this.years.length - 150));
        }

        this.hoverInfo1.textContent = this.years[start];
        this.hoverInfo2.textContent = this.years[start + 149];

        var loc = value * (this.sliderContainer.offsetWidth - 50) / 100;
    
        this.hoverInfo1.style.left = (loc - (this.hoverInfo1.offsetWidth + 15)) + "px";
        this.hoverInfo2.style.left = (loc + 50) + "px";
    }
}
customElements.define('lincs-timeline-horizontal-1', lincsTimelineHoriz1);

