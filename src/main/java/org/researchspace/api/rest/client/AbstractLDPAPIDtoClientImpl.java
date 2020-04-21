package org.researchspace.api.rest.client;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.researchspace.api.dto.base.DTOBase;
import org.researchspace.api.transform.InvalidModelException;
import org.researchspace.api.transform.ModelToDtoTransformer;

public abstract class AbstractLDPAPIDtoClientImpl<T extends DTOBase> implements LDPAPIDtoClient<T> {

    protected final LDPAPIClient ldpAPIClient;
    protected ModelToDtoTransformer<T> transformer;

    protected AbstractLDPAPIDtoClientImpl(LDPAPIClient ldpAPIClient, ModelToDtoTransformer<T> transformer) {
        this.ldpAPIClient = ldpAPIClient;
        this.transformer = transformer;
    }

    @Override
    public T getObjectDto(Resource object) throws InvalidModelException, APICallFailedException {

        if (transformer == null) {
            throw new UnsupportedOperationException();
        }

        if (object == null) {
            return null;
        }

        final Model model = ldpAPIClient.getObjectModel(object);

        return model == null ? null : transformer.modelToDto(model);

    }

}
