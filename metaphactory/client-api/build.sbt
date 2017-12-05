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
import dependencies._

name := "metaphactory-client-api"
organization := "com.metaphacts"
version := "2.1-SNAPSHOT"

libraryDependencies ++= Seq(
  sesame, testLibs
).flatten excluding dependenciesToExclude ++ Seq("commons-beanutils" -> "commons-beanutils")
// comes with shiro 1.2.4, but we need 1.9.2 for commons configuration
