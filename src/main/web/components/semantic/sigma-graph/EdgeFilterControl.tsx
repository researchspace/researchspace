
import * as React from 'react';
import { FC, useEffect, useState } from 'react';

import { useSigma, useSetSettings } from '@react-sigma/core';
import { Attributes } from 'graphology-types';

export const EdgeFilterControl: FC = () => {

    const sigma = useSigma();
    const setSettings = useSetSettings();

    const [edgeLabels, setEdgeLabels] = useState<string[]>([]);
    const [visibleEdgeLabels, setVisibleEdgeLabels] = useState<string[]>([]);

    const onEdgeFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const label = event.target.value;
        if (event.target.checked) {
            setVisibleEdgeLabels([...visibleEdgeLabels, label]);
        } else {
            setVisibleEdgeLabels(visibleEdgeLabels.filter((l: string) => l !== label));
        }
    };

    // Retrieve initial set of labels
    // TODO: needs to update when new labels appear
    useEffect(() => {
        const newEdgeLabels: string[] = [];
        sigma.getGraph().forEachEdge((edge: string, attributes: Attributes) => {
            if (attributes.label && !newEdgeLabels.includes(attributes.label)) {
                newEdgeLabels.push(attributes.label);
            }
        })
        setEdgeLabels(newEdgeLabels);
        setVisibleEdgeLabels(newEdgeLabels);
    }, [sigma]);


    // Filter visible edges
    useEffect(() => {
        setSettings({
          nodeReducer: (node, data) => {
            const newData: Attributes = { ...data};
            return newData;
          },
          edgeReducer: (edge, data) => {
            const newData = { ...data };

            if (! visibleEdgeLabels.includes(data.label)) {
                newData.hidden = true;
            }

            return newData;
          },
        });
      }, [visibleEdgeLabels]);

    return <div>
        <ul>
            {edgeLabels.map((label: string) => (
                <li key={"li-" + label}>
                    <input onChange={onEdgeFilterChange} type="checkbox" id={"edge-filter-" + label} value={label} 
                        checked={visibleEdgeLabels.includes(label)}
                    />&nbsp;
                    <label htmlFor={"edge-filter-" + label}>{label}</label>
                </li>
            ))}
        </ul>
    </div>
}

export default EdgeFilterControl