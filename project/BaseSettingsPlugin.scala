/*!
 * Copyright (C) 2015-2018, metaphacts GmbH
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
import Keys._

object BaseSettingsPlugin extends AutoPlugin {
  override def trigger = allRequirements

  override lazy val projectSettings = Seq(
    scalaVersion  := "2.11.6",
    // Do not append Scala versions to the generated artifacts
    crossPaths := false,
    aggregate in update := false,
    // see http://www.scala-sbt.org/0.13/docs/sbt-0.13-Tech-Previews.html#Cached+resolution+%28minigraph+caching%29
    updateOptions := updateOptions.value.withCachedResolution(true)
  )
}
