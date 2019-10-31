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
import com.typesafe.sbteclipse.plugin._
import de.heikoseeberger.sbtheader.HeaderPlugin
import de.heikoseeberger.sbtheader.AutomateHeaderPlugin
import de.heikoseeberger.sbtheader.HeaderPlugin.autoImport._

import EclipseProject._


object ExtensionsPlugin extends AutoPlugin {
  override def requires = HeaderPlugin
  override def trigger = allRequirements

  override def derivedProjects(proj: ProjectDefinition[_]): Seq[Project] =
    // Make sure to exclude project extras to avoid recursive generation
    if (proj.projectOrigin != ProjectOrigin.DerivedProject) {
      val id = proj.id
      Seq(
        Project(id, file(id))
          .dependsOn(proj.dependencies.asInstanceOf[Seq[ClasspathDep[ProjectReference]]]:_*)
          .enablePlugins(AutomateHeaderPlugin)
      )
    }
    else Nil

  override lazy val projectSettings = Seq(

    // all sub-projects can web and "core" folder, we expect all java code to be in "core"
    baseDirectory := baseDirectory(_ / "core").value,
    unmanagedResourceDirectories in Compile += baseDirectory(_ / "src/main/resources").value,
    unmanagedSources.in(Compile, headerCreate) ++= (
      (baseDirectory(_ / "../web/src").value ** "*.tsx") +++
      (baseDirectory(_ / "../web/src").value ** ("*.ts" -- "*.d.ts")) +++
      (baseDirectory(_ / "../web/src").value ** ("*.scss" -- "*.d.ts")) +++
      (baseDirectory(_ / "../integration-tests/").value ** ("*.ts" -- "*.d.ts") )
    ).get,


    // Java version
    javacOptions ++= Seq("-source", "1.8", "-target", "1.8", "-g", "-Xmaxerrs", "5000", "-encoding", "UTF-8"),

    testOptions in Test += Tests.Argument(TestFrameworks.JUnit),
    parallelExecution in Test := false,
    fork in Test := true,


    // sbt-header plugin configuration
    // we expect that LICENSE-HEADER.txt file is located in the root of the project
    headerLicense :=
      Some(
        HeaderLicense.Custom(
          IO.read(baseDirectory(_ / "../LICENSE-HEADER.txt").value).stripMargin
        )
      ),
    headerMappings := Map(
      HeaderFileType("java") -> HeaderCommentStyle.CStyleBlockComment,
      HeaderFileType("ts") -> HeaderCommentStyle.CStyleBlockComment,
      HeaderFileType("tsx") -> HeaderCommentStyle.CStyleBlockComment,
      HeaderFileType("scss") -> HeaderCommentStyle.CStyleBlockComment
    )
  ) ++ eclipseSettings
}
