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

package com.metaphacts.sparql.keyword.algebra;

import java.util.List;

import org.eclipse.rdf4j.query.algebra.Var;

import com.google.common.collect.Lists;

/**
 * An object holding the parameters of a keyword-search clause in a SPARQL query. 
 * The parameters expressed as {@link Var} objects that either have a value assigned 
 * or contain the name of the corresponding SPARQL variable.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class KeywordSearchPattern {
    
    private Var subjectVar = null;
    private List<Var> predicateVars = Lists.newArrayList();
    private Var valueVar = null;
    private Var scoreVar = null;
    private Var snippetVar = null;
    private Var matchVar = null;
    private List<Var> typeVars = Lists.newArrayList();

    public Var getSubjectVar() {
        return subjectVar;
    }

    public void setSubjectVar(Var subjectVar) {
        this.subjectVar = subjectVar;
    }

    public List<Var> getPredicateVars() {
        return predicateVars;
    }
    
    public Var getFirstPredicateVar() {
        return predicateVars.iterator().next();
    }
    
    public void addPredicateVar(Var predicateVar) {
        this.predicateVars.add(predicateVar);
    }

    public Var getValueVar() {
        return valueVar;
    }

    public void setValueVar(Var valueVar) {
        this.valueVar = valueVar;
    }

    public Var getScoreVar() {
        return scoreVar;
    }

    public void setScoreVar(Var scoreVar) {
        this.scoreVar = scoreVar;
    }

    public Var getSnippetVar() {
        return snippetVar;
    }

    public void setSnippetVar(Var snippetVar) {
        this.snippetVar = snippetVar;
    }
    
    public List<Var> getTypeVars() {
        return this.typeVars;
    }
    
    public Var getFirstTypeVar() {
        return this.typeVars.iterator().next();
    }
    
    public void addTypeVar(Var typeVar) {
        this.typeVars.add(typeVar);
    }

    public Var getMatchVar() {
        return matchVar;
    }

    public void setMatchVar(Var matchVar) {
        this.matchVar = matchVar;
    }

    @Override
    public KeywordSearchPattern clone() {
        KeywordSearchPattern cloned = new KeywordSearchPattern();
        cloned.matchVar = (this.matchVar != null) ? this.matchVar.clone() : null;
        cloned.subjectVar = (this.subjectVar != null) ? this.subjectVar.clone() : null;
        cloned.valueVar = (this.valueVar != null) ? this.valueVar.clone() : null;
        cloned.snippetVar = (this.snippetVar != null) ? this.snippetVar.clone() : null;
        for (Var predicateVar : predicateVars) {
            cloned.addPredicateVar(predicateVar);
        }
        cloned.scoreVar = (this.scoreVar != null) ? this.scoreVar.clone() : null;
        return cloned;
    }
}