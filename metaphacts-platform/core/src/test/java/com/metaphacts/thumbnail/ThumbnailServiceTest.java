/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.thumbnail;

import com.google.common.collect.Lists;
import com.metaphacts.config.Configuration;
import com.metaphacts.junit.AbstractRepositoryBackedIntegrationTest;
import com.metaphacts.junit.TestPlatformStorage;
import com.metaphacts.thumbnails.ThumbnailService;
import com.metaphacts.thumbnails.ThumbnailServiceRegistry;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import javax.inject.Inject;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

/**
 * Test cases for {@link ThumbnailService} functionality.
 *
 * @author Alexey Morozov
 */
public class ThumbnailServiceTest extends AbstractRepositoryBackedIntegrationTest {
    @Inject
    protected ThumbnailServiceRegistry thumbnailServiceRegistry;

    @Inject
    protected Configuration config;

    private final ValueFactory vf = SimpleValueFactory.getInstance();

    private final IRI THUMBNAIL = vf.createIRI("http://schema.org/thumbnail");

    private final IRI FOO = vf.createIRI("http://www.metaphacts.com/foo");
    private final IRI BAR = vf.createIRI("http://www.metaphacts.com/bar");
    private final IRI BAZ = vf.createIRI("http://www.metaphacts.com/baz");
    private final IRI QUX = vf.createIRI("http://www.metaphacts.com/qux");

    private final IRI FOO_THUMBNAIL = vf.createIRI("http://www.metaphacts.com/foo_iri.png");
    private final IRI BAR_THUMBNAIL = vf.createIRI("http://www.metaphacts.com/bar_literal.png");

    @Before
    public void setup() throws Exception {
        config.getUiConfig().setParameter(
            "preferredThumbnails",
            Collections.singletonList(
                String.format("<%s>", THUMBNAIL.stringValue())
            ),
            TestPlatformStorage.STORAGE_ID
        );
    }

    @Test
    public void testHasDefaultServiceImplementation() throws Exception {
        Optional<ThumbnailService> service = thumbnailServiceRegistry.get("default");
        Assert.assertTrue(service.isPresent());
    }

    @Test
    public void testFetchesThumbnailsSpecifiedAsLiteralOrIRI() throws Exception {
        addStatements(Lists.newArrayList(
            vf.createStatement(FOO, THUMBNAIL, FOO_THUMBNAIL),
            vf.createStatement(BAR, THUMBNAIL, vf.createLiteral(BAR_THUMBNAIL.stringValue()))
        ));

        ThumbnailService service = thumbnailServiceRegistry.get("default").get();
        Map<IRI, Optional<Value>> thumbnails = service.getThumbnails(
            repositoryRule.getRepository(), Lists.newArrayList(FOO, BAR));
        Assert.assertTrue(thumbnails.get(FOO).isPresent() && thumbnails.get(FOO).get()
                .stringValue().equals(FOO_THUMBNAIL.stringValue()));
        Assert.assertTrue(thumbnails.get(BAR).isPresent() && thumbnails.get(BAR).get()
                .stringValue().equals(BAR_THUMBNAIL.stringValue()));
    }

    @Test
    public void testIgnoresMissingThumbnailValues() throws Exception {
        ThumbnailService service = thumbnailServiceRegistry.get("default").get();
        Map<IRI, Optional<Value>> thumbnails = service.getThumbnails(
            repositoryRule.getRepository(), Lists.newArrayList(BAZ, QUX));
        Assert.assertFalse(thumbnails.get(BAZ).isPresent());
        Assert.assertFalse(thumbnails.get(QUX).isPresent());
    }
}
