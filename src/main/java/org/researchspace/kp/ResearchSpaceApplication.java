package org.researchspace.kp;

import javax.inject.Inject;
import javax.ws.rs.ApplicationPath;

import org.glassfish.hk2.api.ServiceLocator;

import org.researchspace.rest.AbstractPlatformApplication;

/**
 * @author Artem Kozlov <artem@rem.sh>
 */
@ApplicationPath("rs")
public class ResearchSpaceApplication extends AbstractPlatformApplication {

    @Inject
    public ResearchSpaceApplication(ServiceLocator serviceLocator) {
        super(serviceLocator);
        register(KnowledgePatternsEndpoint.class);
    }
}
