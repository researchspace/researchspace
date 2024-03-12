package org.researchspace.sail.rest.tna;

import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import org.researchspace.sail.rest.RESTSailConfig;
import org.researchspace.sail.rest.RESTSailFactory;

public class TnaDiscoveryApiRangeSearchSailFactory extends RESTSailFactory {

    public static final String SAIL_TYPE = "researchspace:TnaDiscoveryApiRangeSearchSail";

    @Override
    public String getSailType() {
        return SAIL_TYPE;
    }

    @Override
    public Sail getSail(SailImplConfig originalConfig) throws SailConfigException {
        if (!(originalConfig instanceof RESTSailConfig)) {
            throw new SailConfigException("Wrong config type: " + originalConfig.getClass().getCanonicalName() + ". ");
        }
        return new TnaDiscoveryApiRangeSearchSail((RESTSailConfig) originalConfig);
    }
}
