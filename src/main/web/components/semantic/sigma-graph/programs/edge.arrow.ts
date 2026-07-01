/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { createEdgeCompoundProgram } from "sigma/rendering/webgl/programs/common/edge";
import EdgeArrowHeadProgram from "./edge.arrowHead";
import EdgeClampedProgram from "sigma/rendering/webgl/programs/edge.clamped";

const EdgeArrowProgram = createEdgeCompoundProgram([EdgeClampedProgram, EdgeArrowHeadProgram]);

export default EdgeArrowProgram;