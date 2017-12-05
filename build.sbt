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
import com.earldouglas.xwp.ContainerPlugin

lazy val metaphactory = (project in file("metaphactory"))

lazy val clientApi =
  (project in file("metaphactory/client-api"))
    .disablePlugins(HeaderPlugin, EclipsePlugin)
    .dependsOn(metaphactory)
    

lazy val researchspace = (project in file("researchspace"))
  .dependsOn(metaphactory % "test->test;compile->compile")

lazy val platform = (project in file("."))
  .enablePlugins(JettyPlugin)
  .disablePlugins(HeaderPlugin)
  .aggregate(metaphactory, clientApi, researchspace)
  .dependsOn(metaphactory, researchspace)

version := "2.1-SNAPSHOT"
licenseFile := "researchspace/LICENSE.txt"
