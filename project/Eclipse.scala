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

import com.typesafe.sbteclipse.plugin.EclipsePlugin.EclipseKeys
import com.typesafe.sbteclipse.core.EclipsePlugin.EclipseTransformerFactory
import com.typesafe.sbteclipse.plugin.EclipsePlugin.EclipseProjectFlavor

object EclipseProject {

  /**
    * Add additional checkstyle eclipse builder and nature.
    *
    * see https://github.com/typesafehub/sbteclipse/issues/179#issuecomment-27382987
    */
  def projectFileTransformerFactory = {
    import com.typesafe.sbteclipse.core.Validation
    import scala.xml._
    import scala.xml.transform.RewriteRule
    import scalaz.Scalaz._

    new EclipseTransformerFactory[RewriteRule] {
      override def createTransformer(ref: ProjectRef, state: State): Validation[RewriteRule] = {
        val rule = new RewriteRule {
          override def transform(node: Node): Seq[Node] = node match {

            case elem: Elem if (elem.label == "natures") =>
              val newChild: Seq[Node] = elem.child ++
              <nature>net.sf.eclipsecs.core.CheckstyleNature</nature>
              elem.copy(child = newChild)

            case elem: Elem if (elem.label == "buildSpec") =>
              val newChild: Seq[Node] = elem.child ++
                <buildCommand>
                  <name>net.sf.eclipsecs.core.CheckstyleBuilder</name>
                </buildCommand>
              elem.copy(child = newChild)

            case other =>
              other
          }
        }
        rule.success
      }
    }
  }


  lazy val createCheckstyleEclipseConfig = TaskKey[Unit]("Create eclipse .checkstyle")

  val eclipseSettings = Seq(
    EclipseKeys.projectTransformerFactories := Seq(projectFileTransformerFactory),
    EclipseKeys.withSource := true,
    EclipseKeys.withJavadoc := true,
    EclipseKeys.withBundledScalaContainers := false,
    EclipseKeys.useProjectId := true, // does not work with multi-project setting right now https://github.com/typesafehub/sbteclipse/issues/294
    EclipseKeys.projectFlavor := EclipseProjectFlavor.Java,
    EclipseKeys.preTasks := Seq(createCheckstyleEclipseConfig),

    createCheckstyleEclipseConfig := {
      val checkstyleFile = baseDirectory(_ / ".checkstyle").value
      val externalCheckstyleFile = baseDirectory(_ / "../../project/checkstyle.xml").value.getAbsolutePath()
      val checkstyle =
        s"""<?xml version="1.0" encoding="UTF-8"?>
        <fileset-config file-format-version="1.2.0" simple-config="true" sync-formatter="true">
          <local-check-config name="checkstyle" location="$externalCheckstyleFile" type="external" description="checkstyle">
            <additional-data name="protect-config-file" value="true"/>
          </local-check-config>
          <fileset name="all" enabled="true" check-config-name="checkstyle" local="true">
            <file-match-pattern match-pattern="." include-pattern="true"/>
          </fileset>
          <filter name="FileTypesFilter" enabled="true">
            <filter-data value="java"/>
          </filter>
          <filter name="NonSrcDirs" enabled="true"/>
          </fileset-config>
      """
      IO.write(checkstyleFile, checkstyle)
    }
  )
}
