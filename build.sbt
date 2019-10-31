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

import RootBuildOptions._

val _ = println("Included projects to build: " + includeProjects.mkString(", "))

lazy val clientApi =
  (project in file("metaphacts-platform/client-api"))
    .disablePlugins(HeaderPlugin)

lazy val metaphactsPlatform =
  Project("metaphacts-platform", file("metaphacts-platform"))
    .dependsOn(clientApi)

lazy val metaphactory = if (includeProjects.contains("metaphactory")) {
  (project in file("metaphactory"))
    .dependsOn(metaphactsPlatform % "test->test;compile->compile")
} else { null }

lazy val researchspace = if (includeProjects.contains("researchspace")) {
  (project in file("researchspace"))
    .dependsOn(metaphactsPlatform % "test->test;compile->compile")
} else { null }

lazy val graphscope = if (includeProjects.contains("graphscope")) {
  (project in file("graphscope"))
    .disablePlugins(HeaderPlugin, EclipsePlugin)
} else { null }

lazy val aggregatedProjects =
  (List(metaphactsPlatform, clientApi) ::: List(researchspace, graphscope, metaphactory))
    .filter(p => p != null)
    .map(p => p: sbt.ProjectReference)
lazy val dependedOnProjects =
  (List(metaphactsPlatform) ::: List(researchspace, graphscope, metaphactory))
    .filter(p => p != null)
    .map(p => p: sbt.ClasspathDep[sbt.ProjectReference])

lazy val platform = (project in file("."))
  .enablePlugins(JettyPlugin)
  .disablePlugins(HeaderPlugin)
  .aggregate(aggregatedProjects: _*)
  .dependsOn(dependedOnProjects: _*)

// below parts are defined in project/RootBuildOptions.scala
version := platformVersion
licenseFile := licenseBundleOptions.licenseFile
