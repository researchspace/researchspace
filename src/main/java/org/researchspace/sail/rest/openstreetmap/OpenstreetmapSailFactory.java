/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.sail.rest.openstreetmap;

import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class OpenstreetmapSailFactory implements SailFactory {

    // The sail type to reference
    public static final String SAIL_TYPE = "researchspace:OpenstreetmapSail";

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public SailImplConfig getConfig() {
        return new OpenstreetmapSailConfig();
    }

    @Override
    public Sail getSail(SailImplConfig originalConfig) throws SailConfigException {
        if (!(originalConfig instanceof OpenstreetmapSailConfig)) {
            throw new SailConfigException("Wrong config type: " + originalConfig.getClass().getCanonicalName() + ". ");
        }

        OpenstreetmapSailConfig config = (OpenstreetmapSailConfig) originalConfig;
        OpenstreetmapSail sail = new OpenstreetmapSail(config);
        return sail;
    }

}
