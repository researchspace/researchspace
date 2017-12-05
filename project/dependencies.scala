/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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
import sbt._

object dependencies {
  //dependencies
  //main libs versions
  val RDF4J_VERSION = "2.2"
  val LOG4J_VERSION = "2.2"
  val JERSEY_VERSION = "2.22.2"
  val JACKSON_VERSION = "2.6.3" // update to 2.7.3 is not working due to sesame 4.1.4
  val GUICE_VERSION = "4.0"

  //Sesame related
  val sesame = Seq(
    "org.eclipse.rdf4j" % "rdf4j-util" % RDF4J_VERSION,
    "org.eclipse.rdf4j" % "rdf4j-queryrender" % RDF4J_VERSION,
    "org.eclipse.rdf4j" % "rdf4j-sail-nativerdf" % RDF4J_VERSION,
    "org.eclipse.rdf4j" % "rdf4j-runtime" % RDF4J_VERSION,
    "com.github.jsonld-java" % "jsonld-java" % "0.10.0"
  )

  //Logging related
  val logging = Seq(
    "org.apache.logging.log4j" % "log4j-api",
    "org.apache.logging.log4j" % "log4j-core",
    "org.apache.logging.log4j" % "log4j-web",
    "org.apache.logging.log4j" % "log4j-1.2-api",
    "org.apache.logging.log4j" % "log4j-slf4j-impl",
    "org.apache.logging.log4j" % "log4j-jul",
    "org.apache.logging.log4j" % "log4j-jcl"
  ).map(_ % LOG4J_VERSION)

  //jax-rs implementation
  val jersey = Seq(
    "org.glassfish.jersey.core" % "jersey-server",
    "org.glassfish.jersey.containers" % "jersey-container-servlet",
    "org.glassfish.jersey.media" % "jersey-media-json-jackson",
    "org.glassfish.jersey.media" % "jersey-media-multipart"
  ).map(_ % JERSEY_VERSION)

  //json
  val jackson = Seq(
    "com.fasterxml.jackson.core" % "jackson-core",
    "com.fasterxml.jackson.core" % "jackson-databind",
    "com.fasterxml.jackson.core" % "jackson-annotations"
  ).map(_ % JACKSON_VERSION force())

  //Dependency Injection
  val guice = Seq(
    "com.google.inject" % "guice",
    "com.google.inject.extensions" % "guice-servlet"
  ).map(_ % GUICE_VERSION exclude("com.google.guava","guava"))

  //dependencies to exclude
  val dependenciesToExclude = Seq(
    "ch.qos.logback" -> "logback-classic",
    "ch.qos.logback" -> "logback-core",
    "org.eclipse.rdf4j" -> "rdf4j-sail-lucene",
    "org.eclipse.rdf4j" -> "rdf4j-sail-spin"
  )

  val misc = Seq(
    //guava
    "com.google.guava" % "guava" % "18.0",

    //web-app
    "javax.servlet" % "javax.servlet-api" % "3.1.0" % "provided",

    //jersey
    "javax.ws.rs" % "javax.ws.rs-api" % "2.0.1" % "provided",

    //jersey-guice integration
    "org.glassfish.hk2" % "guice-bridge" % "2.4.0-b34",

    //"com.squarespace.jersey2-guice" % "jersey2-guice" % "0.9",
    "com.squarespace.jersey2-guice" % "jersey2-guice" % "0.10" exclude("commons-beanutils", "commons-beanutils"), // depends on old commons-beanutils 1.8.3, but we need 1.9.x for common-configuration2

    //security
    "org.apache.shiro" % "shiro-core" % "1.3.1" exclude("commons-beanutils", "commons-beanutils"),
    "org.apache.shiro" % "shiro-web" % "1.3.1",
    "org.apache.shiro" % "shiro-guice" % "1.3.1" exclude("com.google.inject","guice"),
    "org.secnod.shiro" % "shiro-jersey" % "0.2.0" intransitive(), // depends on old jersey-core 2.16/ jersey-servlet2.16 / shiro-core 1.2.3

    //templates
    "com.github.jknack" % "handlebars" % "4.0.5",

    //semantic versioning
    "com.github.zafarkhaja" % "java-semver" % "0.9.0",

    //encoding library for xss prevention
    "org.owasp.encoder" % "encoder" % "1.2",

    //reflections used for, for example, annotation scanning on classpath
    "org.reflections" % "reflections" % "0.9.10",

    /**
    * Apache Commons
    **/
    "commons-io" % "commons-io" % "2.4",  //sesame still based on 2.4

    "org.apache.commons" % "commons-compress" % "1.7",
    "org.apache.commons" % "commons-lang3" % "3.3.2",

    // needed for configuration
    "commons-beanutils" % "commons-beanutils" % "1.9.1",
    // configuration
    "org.apache.commons" % "commons-configuration2" % "2.0",

    //http core and client, successor of and replacement for Commons HttpClient 3.x
    "org.apache.httpcomponents" % "httpclient" % "4.5.3",
    "org.apache.httpcomponents" % "httpcore" % "4.4.6",

    // extracting the prefered mime type, for example, sparql servlet
    "org.commonjava.mimeparse" % "mimeparse" % "0.1.3.3",

    // for parsing and rewritting html stirngs as xml, used in RDFa extractor
    "org.ccil.cowan.tagsoup" % "tagsoup" % "1.2.1",

    //pf4j plugin framework
    "ro.fortsoft.pf4j" % "pf4j" % "1.3.0",

    // semargl rdfa parser
    "org.semarglproject" % "semargl-rdfa" % "0.7",
    "org.semarglproject" % "semargl-rdf4j" % "0.7",

    "org.visualdataweb.vowl.owl2vowl" % "OWL2VOWL" % "0.2.1"
  )

  val testLibs = Seq(
    "org.glassfish.jersey.test-framework.providers" % "jersey-test-framework-provider-inmemory" % JERSEY_VERSION % "test",
    "org.hamcrest" % "hamcrest-library" % "1.3" % "test",
    "org.hamcrest" % "hamcrest-core" % "1.3" % "test",
    "com.novocode" % "junit-interface" % "0.11" % "test",
    "org.mockito" % "mockito-core" % "1.9.5" % "test",
    "junit" % "junit" % "4.10" % "test",
    "com.github.sdorra" % "shiro-unit" % "1.0.0",
    "org.jukito" % "jukito" % "1.4.1" exclude("commons-beanutils", "commons-beanutils") exclude("com.google.inject","guice"),
    "org.skyscreamer" % "jsonassert" % "1.5.0" % "test"
  )

  /**
    *  Utility function to exlude unwanted transitive dependencies.
    *  For example some logging libraries.
    */
  implicit def dependencyFilterer(deps: Seq[ModuleID]) = new Object {
    def excluding(excludes: Seq[(String, String)]) =
      deps.map(
        excludes.foldLeft(_)(
          (d, e) => d.exclude(e._1, e._2)
        )
      )
  }
}
