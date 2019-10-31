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

package com.metaphacts.junit;

import static org.junit.Assert.assertThat;

import java.util.List;

import static com.metaphacts.junit.MpMatchers.hasItemsInOrder;
import static org.hamcrest.Matchers.not;

import org.junit.Test;

import com.google.common.collect.Lists;

/**
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpMatchersTest {

    public MpMatchersTest() {
    }
    
    @Test
    public void testHasItemsInOrder() {
        List<String> testList = Lists.newArrayList("first", "second", "third");
        assertThat(testList, hasItemsInOrder("first", "second", "third"));
        assertThat(testList, hasItemsInOrder("first", "second"));
        assertThat(testList, hasItemsInOrder("second", "third"));
        assertThat(testList, hasItemsInOrder("first", "third"));
        assertThat(testList, not(hasItemsInOrder("first", "third", "second")));
        assertThat(testList, not(hasItemsInOrder("third", "second")));
        assertThat(testList, not(hasItemsInOrder("third", "first")));
        assertThat(testList, not(hasItemsInOrder("second", "first")));
        assertThat(testList, not(hasItemsInOrder("fourth", "first")));
        assertThat(testList, not(hasItemsInOrder("first", "fourth")));
    }

}