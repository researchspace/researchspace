/**
 * Copyright (C) 2022, Swiss Art Research Infrastructure, University of Zurich
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { useEffect } from "react";
import { useLoadGraph } from "@react-sigma/core";
import { MultiDirectedGraph } from "graphology";

export const LoadGraph = (props: any) => {
    const loadGraph = useLoadGraph();
    useEffect(() => {
        const graph = new MultiDirectedGraph();

        for (const i in props.data) {
            const element = props.data[i];
            if (element.group == "nodes") {
                let color = "#000000";
                if (props.colours && element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
                    const types = element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']
                    for (const type of types) {
                        if (props.colours[type.value]) {
                            color = props.colours[type.value];
                            break;
                        }
                    }
                }
                graph.addNode(element.data.id, {
                    label: element.data.label,
                    size: props.sizes.nodes,
                    color: color
                })
            }
        }

        for (const i in props.data) {
            const element = props.data[i];
            if (element.group == "edges") {
                graph.addEdgeWithKey(element.data.id, element.data.source, element.data.target, {
                    label: element.data.label,
                    size: props.sizes.edges
                })
            }
        }

        graph.nodes().forEach((node, i) => {
            const angle = (i * 2 * Math.PI) / graph.order;
            graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
            graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
        });

        loadGraph(graph);
    }, [loadGraph]);
  
    return null;
  };

  export default LoadGraph;