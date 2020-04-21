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

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClientBuilder;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.DCTERMS;
import org.researchspace.config.Configuration;
import org.researchspace.upload.MetadataExtractor;
import org.researchspace.vocabulary.CRMdig;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import com.google.inject.Inject;
import com.google.inject.Singleton;

/**
 * @author Yury Emelyanov
 */
@Singleton
public class IIIFMetadataExtractor implements MetadataExtractor {

    @Inject
    Configuration config;

    private static Pattern idRegex = Pattern.compile("(^.*)\\/(.*)$");

    @Override
    public Model extractMetadata(IRI newId, Model graph) throws Exception {
        String assetId = assetIdFromUri(newId);
        // call info.json endpoint

        String iiifUrl = config.getEnvironmentConfig().getString("iiif.url");

        HttpClient httpClient = HttpClientBuilder.create().build();
        HttpGet get = new HttpGet(iiifUrl + "/" + assetId + "/info.json");
        HttpResponse httpResponse = httpClient.execute(get);

        // responce should be actually json-ld and you can parse it to Model
        ObjectMapper mapper = new ObjectMapper();
        JsonNode jsonResponse = mapper.readTree(httpResponse.getEntity().getContent());

        long width = jsonResponse.path("width").asLong();
        long height = jsonResponse.path("height").asLong();

        ValueFactory vf = SimpleValueFactory.getInstance();

        Model model = new LinkedHashModel(Lists.newArrayList(
                vf.createStatement(newId, DCTERMS.DESCRIPTION,
                        vf.createLiteral("Uploaded width: " + width + ", height: " + height)),
                vf.createStatement(newId, CRMdig.L56_HAS_PIXEL_WIDTH, vf.createLiteral(width)),
                vf.createStatement(newId, CRMdig.L57_HAS_PIXEL_HEIGHT, vf.createLiteral(height))));
        return model;
    }

    public static String assetIdFromUri(IRI newId) {
        Matcher matcher = idRegex.matcher(newId.toString());
        if (matcher.matches()) {
            return matcher.group(2);
        } else {
            throw new IllegalArgumentException("Image id can't be extracted from IRI.");
        }
    }
}
