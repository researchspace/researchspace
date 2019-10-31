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

package com.metaphacts.templates;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;

import java.util.LinkedHashSet;
import java.util.Set;

import com.google.common.collect.Lists;

import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.hamcrest.collection.IsIterableContainingInOrder;
import org.junit.Test;

import com.google.common.collect.Sets;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class TemplateUtilTest {
    @Test
    public void testExtractTemplateIncludeString(){
        /*
         * prefixed URIs
         */
        assertEquals(Sets.newHashSet("pre:includeTest"),TemplateUtil.extractIncludeStrings("This is a prefix include [[>pre:includeTest]] in some text."));
        //with whitespaces
        assertEquals(Sets.newHashSet("pre:includeTest"),TemplateUtil.extractIncludeStrings("This is a prefix include [[> pre:includeTest ]] in some text."));
        
        //whit param
        assertEquals(Sets.newHashSet("pre:includeTest"),TemplateUtil.extractIncludeStrings("This is a prefix include [[> pre:includeTest param1=\"hello\" param2=2]] in some text."));
    
        /*
         * full URIs
         */
        assertEquals(Sets.newHashSet("http://www.metaphacts.com"),TemplateUtil.extractIncludeStrings("This is a full uri include [[>http://www.metaphacts.com]] in some text."));
        //with whitespaces
        assertEquals(Sets.newHashSet("http://www.metaphacts.com"),TemplateUtil.extractIncludeStrings("This is a full uri include [[> http://www.metaphacts.com ]] in some text."));
   
        /*
         * full URIs quoted
         */
        assertEquals(Sets.newHashSet("http://www.metaphacts.com"),TemplateUtil.extractIncludeStrings("This is a full uri include [[>\"http://www.metaphacts.com\" ]] in some text."));
        
        assertEquals(Sets.newHashSet("http://www.metaphacts.com"),TemplateUtil.extractIncludeStrings("This is a full uri include [[> \"http://www.metaphacts.com\" ]] in some text."));

        assertEquals(Sets.newHashSet("http://www.metaphacts.com"),TemplateUtil.extractIncludeStrings("This is a full uri include [[> \"http://www.metaphacts.com\" param1=\"value1\" param2=value2 param3=\"value3\"]] in some text."));
        /*
         * several includes
         */
        LinkedHashSet<Object> orderedSet = Sets.newLinkedHashSet();
        orderedSet.add("http://www.metaphacts.com/1");
        orderedSet.add("http://www.metaphacts.com/2");
        orderedSet.add("http://www.metaphacts.com/3");
        assertEquals(orderedSet,TemplateUtil.extractIncludeStrings("Example for severa [[> http://www.metaphacts.com/1 ]] includes [[> http://www.metaphacts.com/2 ]],[[> http://www.metaphacts.com/3 ]]in some text."));
        
        assertEquals(orderedSet,TemplateUtil.extractIncludeStrings("Example for severa [[> http://www.metaphacts.com/1 param1=\"asf\" param2=1]] includes [[> http://www.metaphacts.com/2 ]],[[> http://www.metaphacts.com/3 ]]in some text."));
        
        
        /*
         * partial includes
         */
        assertEquals(Sets.newHashSet("http://www.metaphacts.com"),TemplateUtil.extractIncludeStrings("This is a full uri include [[#>\"http://www.metaphacts.com\" ]] in some text."));
        // whitespace between [[ and #> is not allowed
        assertTrue(TemplateUtil.extractIncludeStrings("This is a full uri include [[ #>\"http://www.metaphacts.com\" ]] in some text.").isEmpty());
        // whitespace between [[# and > is not allowed
        assertTrue(TemplateUtil.extractIncludeStrings("This is a full uri include [[# >\"http://www.metaphacts.com\" ]] in some text.").isEmpty());
    }

    @Test
    public void testConvertResourcesToTemplateIdentifiers(){
        Set<Resource> set =Sets.newLinkedHashSet();
        set.add(RDF.TYPE);
        set.add(FOAF.PERSON);
        set.add(FOAF.AGENT);
        assertThat(
               Lists.newArrayList(
                        "Template:"+RDF.TYPE.stringValue(),
                        "Template:"+FOAF.PERSON.stringValue(),
                        "Template:"+FOAF.AGENT.stringValue()
                        ),
               IsIterableContainingInOrder.contains(TemplateUtil.convertResourcesToTemplateIdentifiers(set).toArray())
        );
    }
}