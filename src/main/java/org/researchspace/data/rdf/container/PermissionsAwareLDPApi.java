/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.data.rdf.container;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.AuthorizationException;
import org.apache.shiro.authz.UnauthorizedException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.security.Permissions.CONTAINER;

import com.google.common.collect.Lists;

/**
 * {@link LDPApiInterface} that checks if user has sufficient permissions to
 * execute actions on LDP Resource/Container.
 * 
 * Create new resource: api:ldp:container:<container_iri>:create - add items to
 * the container api:ldp:type:<item_type>:create:any - add items to any
 * container that can store items of a given type
 * api:ldp:type:<item_type>:create:owner - add items to own container that can
 * store items of a given type
 * 
 * Update resource: api:ldp:container:<container_iri>:update:any - update any
 * item that belongs to the container
 * api:ldp:container:<container_iri>:update:owner - update only own items that
 * belong to the container api:ldp:type:<item_type>:update:any - update any item
 * of a given type api:ldp:type:<item_type>:update:owner - update only own items
 * of a given type
 * 
 * Delete resource: api:ldp:container:<container_iri>:delete:any - delete any
 * item that belongs to the container
 * api:ldp:container:<container_iri>:delete:owner - update only own items that
 * belong to the container api:ldp:type:<item_type>:delete:any - delete any item
 * of a given type api:ldp:type:<item_type>:delete:owner - delete only own items
 * of a given type
 */
public class PermissionsAwareLDPApi implements LDPApiInterface {

    private LDPApi delegate;
    private NamespaceRegistry ns;

    public PermissionsAwareLDPApi(LDPApi delegate, NamespaceRegistry ns) {
        this.delegate = delegate;
        this.ns = ns;
    }

    @Override
    public LDPResource createLDPResource(Optional<String> slug, RDFStream stream, IRI targetContainer,
            String instanceBase) {
        return delegate.createLDPResource(slug, stream, targetContainer, instanceBase,
                this.checkContainerPermission(CONTAINER.CREATE));
    }

    @Override
    public LDPResource getLDPResource(IRI uri) {
        return delegate.getLDPResource(uri, this.checkResourcePermissions(CONTAINER.READ));
    }

    @Override
    public LDPResource updateLDPResource(RDFStream stream, IRI resourceToUpdate) {
        return delegate.updateLDPResource(stream, resourceToUpdate, this.checkResourcePermissions(CONTAINER.UPDATE));
    }

    @Override
    public void deleteLDPResource(IRI uri) throws RepositoryException {
        delegate.deleteLDPResource(uri, this.checkResourcePermissions(CONTAINER.DELETE));
    }

    @Override
    public Model exportLDPResource(List<IRI> iris) {
        return delegate.exportLDPResource(iris, this.checkResourcePermissions(CONTAINER.EXPORT));
    }

    @Override
    public Model exportLDPResource(IRI iri) {
        return delegate.exportLDPResource(iri, this.checkResourcePermissions(CONTAINER.EXPORT));
    }

    @Override
    public List<LDPResource> importLDPResource(Model resource, Set<IRI> possibleContainers, Optional<IRI> containerIRI,
            Set<IRI> unknownObjects, boolean force, String instanceBase) {
        return delegate.importLDPResource(resource, possibleContainers, containerIRI, unknownObjects, force,
                instanceBase, this.checkContainerPermission(CONTAINER.IMPORT));
    }

    @Override
    public LDPResource copyLDPResource(Optional<String> slug, IRI uri, Optional<IRI> targetContainer,
            String instanceBase) {
        return delegate.copyLDPResource(slug, uri, targetContainer, instanceBase,
                this.checkResourcePermissions(CONTAINER.READ), this.checkContainerPermission(CONTAINER.CREATE));
    }

    private Consumer<LDPContainer> checkContainerPermission(String action) throws AuthorizationException {
        return (LDPContainer container) -> {
            this.checkPermissions(container.getResourceIRI(), container.getResourceType(), container, action);
        };
    }

    private BiConsumer<IRI, LDPResource> checkResourcePermissions(String action) throws AuthorizationException {
        return (IRI type, LDPResource resource) -> {
            this.checkPermissions(resource.getParentContainer(), type, resource, action);
        };
    }

    private void checkPermissions(IRI resourceIRI, IRI resourceType, LDPResource resource, String action)
            throws UnauthorizedException {
        if (this.checkWildacrdPermissions(resourceIRI, resourceType, resource, action)
                || this.checkOwnerPermissions(resourceIRI, resourceType, resource, action)) {
            return;
        } else {
            throw new UnauthorizedException(
                    "LDP. Don't have permissions to perform for " + resource.getResourceIRI().stringValue());
        }
    }

    /**
     * Checks if user has permission for the given action for all containers
     * independently from ownership.
     */
    private boolean checkWildacrdPermissions(IRI resourceIRI, IRI resourceType, LDPResource resource, String action) {
        return this.checkPermissionsBase(resourceIRI, resourceType, resource, action, CONTAINER.ANY);
    }

    /**
     * Checks if user has permission for the given action only for his own
     * containers.
     */
    private boolean checkOwnerPermissions(IRI resourceIRI, IRI resourceType, LDPResource resource, String action) {
        return this.checkPermissionsBase(resourceIRI, resourceType, resource, action, CONTAINER.OWNER)
                && resource.isOwner(ns.getUserIRI());
    }

    /**
     * Checks if user has permissions for container based on it's identity or type
     * of resources that it can hold.
     */
    private boolean checkPermissionsBase(IRI resourceIRI, IRI resourceType, LDPResource resource, String action,
            String owner) {
        List<String> permissions = Lists.newArrayList(
                CONTAINER.resourcePermission(resourceIRI, CONTAINER.IDENTITY_BASED, action, owner),
                CONTAINER.resourcePermission(resourceType, CONTAINER.TYPE_BASED, action, owner));
        return this.isPermitedAny(permissions);
    }

    /**
     * Checks if user has at least one permission from the list.
     */
    private boolean isPermitedAny(List<String> permissions) {
        boolean authorized = false;
        for (String permission : permissions) {
            if (SecurityUtils.getSubject().isPermitted(permission)) {
                authorized = true;
                break;
            }
        }
        return authorized;
    }
}
