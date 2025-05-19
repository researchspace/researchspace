/**
 * ResearchSpace
 * SPDX-FileCopyrightText: 2024, PHAROS: The International Consortium of Photo Archives
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.services.info;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;

public class ResourceInfoProfile extends ResourceInfoProfileField {
    private ResourceInfoProfile provenance;

    public ResourceInfoProfile getProvenance() {
        return provenance;
    }

    public void setProvenance(ResourceInfoProfile provenance) {
        this.provenance = provenance;
    }

    public Set<IRI> getAllFields() {
        Set<IRI> allIRIs = new HashSet<>();
        Queue<ResourceInfoProfileField> queue = new LinkedList<>();
        queue.offer(this);

        while (!queue.isEmpty()) {
            ResourceInfoProfileField field = queue.poll();
            if (field.getFields() != null) {
                allIRIs.addAll(field.getFields().keySet());
                queue.addAll(field.getFields().values());
            }
        }

        return allIRIs;

    }
}
