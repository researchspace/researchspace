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

import * as React from 'react';
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { useEffect } from "react";

export const LayoutForceAtlas: React.FC = () => {
    const { start, kill } = useWorkerLayoutForceAtlas2({ settings: { slowDown: 10 }});
    
    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    return null;
}

export default LayoutForceAtlas