/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';

import { Component } from 'platform/api/components';
import {
    AiOutlineZoomIn,
    AiOutlineZoomOut
  } from "react-icons/ai";
import { MdFilterCenterFocus } from "react-icons/md";

import { ControlsContainer } from "@react-sigma/core";
import ZoomControl from "./ZoomControl";

export class GraphControls extends Component<{position?: "bottom-right" | "top-right" | "top-left" | "bottom-left", reset: any}> {

    render() {
        const position = (this.props.position || "bottom-right") as "bottom-right" | "top-right" | "top-left" | "bottom-left";
        return (
            <ControlsContainer position={ position }>
                <ZoomControl resetFunction={ this.props.reset }>
                    <AiOutlineZoomIn />
                    <AiOutlineZoomOut />
                    <MdFilterCenterFocus/>
                </ZoomControl>
            </ControlsContainer>

        )
    }
}

export default GraphControls