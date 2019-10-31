package com.metaphacts.api.rest.client;

import org.eclipse.rdf4j.model.Resource;

import com.metaphacts.api.dto.base.DTOBase;
import com.metaphacts.api.transform.InvalidModelException;

/**
 * A base interface for LDP API client implementations operating with the DTO object model.
 * Usually implemented as a wrapper around {@link LDPAPIClient}.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 * @param <T> Type of the DTO objects served by this client.
 */
public interface LDPAPIDtoClient<T extends DTOBase> {

    /**
     * Return the DTO associated with the given object
     */
    public T getObjectDto(Resource object) throws InvalidModelException, APICallFailedException;
    
}
