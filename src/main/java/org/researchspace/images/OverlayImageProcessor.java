/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.images;

import java.net.URI;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.annotation.Nullable;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.data.rdf.ModelUtils;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.vocabulary.CRMdig;
import org.researchspace.vocabulary.CidocCRM;
import org.researchspace.vocabulary.RSO;

import com.google.common.base.Function;
import com.google.common.collect.Collections2;
import com.google.common.collect.Lists;
import com.google.common.collect.Ordering;
import com.google.common.primitives.Ints;

/**
 * @author Yury Emelyanov
 */
public class OverlayImageProcessor {
    private final URI iiifFolder;
    private final IRI creatorIRI;
    private ValueFactory vf = SimpleValueFactory.getInstance();

    OverlayImageFileProcessor overlayImageFileProcessor;

    public OverlayImageProcessor(URI iiifFolder, IRI userIRI) {
        this.iiifFolder = iiifFolder;
        this.creatorIRI = userIRI;
    }

    /**
     * This singleton is to provide lazy initialization of OverlayImageFileProcessor
     * that's researchspace-specific without having it registered in global Guice
     * configuration
     *
     * @return
     */
    OverlayImageFileProcessor getOverlayImageFileProcessor() throws RepositoryException {

        if (overlayImageFileProcessor == null) {
            overlayImageFileProcessor = new OverlayImageFileProcessor(iiifFolder);
        }
        return overlayImageFileProcessor;
    }

    public PointedGraph convertToCRMDig(PointedGraph pointedGraph) throws RepositoryException {
        IRI overlayedImageUri = pointedGraph.getPointer();
        final Model model = pointedGraph.getGraph();

        // Get image modification event
        Resource modificationEvent = Models.subject(model.filter(null, RDF.TYPE, CRMdig.D3_FORMAL_DERIVATION_CLASS))
                .get();

        // extract overlay parameters
        List<BlendingParam> blendingParams = getBlendingParams(model, modificationEvent);

        // execute image transformation
        getOverlayImageFileProcessor().applyOverlay(overlayedImageUri, blendingParams);

        // add metadata
        addMetadata(model, modificationEvent);

        // fix dummy IRIs to
        substituteDummyIRIs(overlayedImageUri, model, modificationEvent);

        return pointedGraph;
    }

    void substituteDummyIRIs(IRI overlayedImageUri, Model model, Resource modificationEvent) {
        // we need to materialize list, or while modifying model changing it with
        // replaceSubjectAndObjects
        // we'll get ConcurrentModificatioException
        Set<Value> paramsURIs = new HashSet<Value>(
                model.filter(modificationEvent, CRMdig.L13_USED_PARAMETERS_PROPERTY, null).objects());
        int paramNo = 1;
        for (Value v : paramsURIs) {
            ModelUtils.replaceSubjectAndObjects(model, (Resource) v,
                    vf.createIRI(overlayedImageUri.toString() + "/param" + paramNo));
            paramNo++;
        }
        ModelUtils.replaceSubjectAndObjects(model, modificationEvent,
                vf.createIRI(overlayedImageUri.toString() + "/event"));
    }

    void addMetadata(Model model, Resource modificationEvent) {
        IRI timespanImpl = vf.createIRI(modificationEvent.stringValue() + "/time");
        model.add(modificationEvent, CidocCRM.P4_HAS_TIME_SPAN_PROPERTY, timespanImpl);
        model.add(timespanImpl, RDF.TYPE, CidocCRM.E52_TIME_SPAN_CLASS);
        model.add(timespanImpl, CidocCRM.P82A_BEGIN_OF_THE_BEGIN_PROPERTY, vf.createLiteral(new Date()));
        model.add(timespanImpl, CidocCRM.P82A_END_OF_THE_END_PROPERTY, vf.createLiteral(new Date()));

        // add information about who created the overlay
        model.add(modificationEvent, CidocCRM.P14_CARRIED_OUT_BY_PROPERTY, creatorIRI);
        model.add(creatorIRI, RDF.TYPE, CidocCRM.E39_ACTOR_CLASS);
    }

    List<BlendingParam> getBlendingParams(final Model model, Resource modificationEvent) {
        Set<Value> paramsURIs = model.filter(modificationEvent, CRMdig.L13_USED_PARAMETERS_PROPERTY, null).objects();
        List<BlendingParam> params = Lists
                .newArrayList(Collections2.transform(paramsURIs, new Function<Value, BlendingParam>() {
                    @Nullable
                    @Override
                    public BlendingParam apply(@Nullable Value input) {
                        BlendingParam param = new BlendingParam();
                        Resource paramResource = (Resource) input;
                        param.image = Models
                                .objectIRI(model.filter(paramResource, RSO.OVERLAY_IMAGESOURCE_PROPERTY, null)).get();
                        param.order = Models
                                .objectLiteral(model.filter(paramResource, RSO.OVERLAY_ORDER_PROPERTY, null)).get()
                                .intValue();
                        param.opacity = Models
                                .objectLiteral(model.filter(paramResource, RSO.OVERLAY_OPACITY_PROPERTY, null)).get()
                                .doubleValue();
                        return param;
                    }
                }));

        Collections.sort(params, new Ordering<BlendingParam>() {
            @Override
            public int compare(@Nullable BlendingParam left, @Nullable BlendingParam right) {
                return Ints.compare(left.order, right.order);
            }
        });
        return params;
    }

    public static class BlendingParam {
        public BlendingParam(Value image, int order, double opacity) {
            this.image = image;
            this.order = order;
            this.opacity = opacity;
        }

        public BlendingParam() {
        }

        public Value image;
        public int order;
        public double opacity;
    }
}