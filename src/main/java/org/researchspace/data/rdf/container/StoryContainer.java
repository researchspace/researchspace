/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.data.rdf.container;

import org.eclipse.rdf4j.model.IRI;
import org.researchspace.repository.MpRepositoryProvider;

/**
 * LDP container of the stories created with the {@code rs-story-editor} component. Each story
 * is a resource of the container, with its slides in the same named graph.
 */
@LDPR(iri = StoryContainer.IRI_STRING)
public class StoryContainer extends DefaultLDPContainer {
    public static final String IRI_STRING = "http://www.researchspace.org/resource/system/storyContainer";
    public static final IRI IRI = vf.createIRI(IRI_STRING);

    public StoryContainer(IRI uri, MpRepositoryProvider repositoryProvider) {
        super(uri, repositoryProvider);
    }
}
