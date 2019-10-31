# Metaphacts Platform Core

Contains server side components of the platform - SPARQL endpoint, configuration management, LDP containers, platform services, security related services, etc

## Project Structure

### com.metaphacts.config

Main configuration entry point. By default platform use **ui.prop**, **global.prop** and **environment.prop** files as a main source of configuration, but it is also possible to override any configuration using java properties, e.g `-Dconfig.environment.assetsLocation=<somepath>`.

Platform configuration is based on **[Apache Commons Configuration](https://commons.apache.org/proper/commons-configuration/)** project. It provides flexible and extensible API to work with different kind of configuration formats like INI, XML, etc.

### com.metaphacts.data.rdf

Some useful utilities to work with RDF, mainly extending RDF4J functionality.

### com.metaphacts.data.rdf.container

Implementations for LDP Direct Containers API.

Metaphacts platform provides implementation for sub-set of the [LDP(Linked Data Platform)](https://www.w3.org/TR/ldp/) specification, in particular [Direct Containers](https://www.w3.org/TR/ldp/#dfn-linked-data-platform-direct-container).

### com.metaphacts.di

Main entry point for Dependency Injection.

Metaphacts platform uses [Guice](https://github.com/google/guice) for Dependency Injection.

### com.metaphacts.rest

Entry point for all Web Services.

Platform uses [JAX-RS](https://jax-rs-spec.java.net/nonav/2.0-rev-a/apidocs/index.html) with [Jersey](https://jersey.java.net/) for exposing services through HTTP.

### com.metaphacts.security

All security related code like Web Filters, Security Manager Service, etc.

Platform uses [Apache Shiro](https://shiro.apache.org/) as a security framework.

### com.metaphacts.vocabulary

Various static RDF4J RDF vocabulary classes.
