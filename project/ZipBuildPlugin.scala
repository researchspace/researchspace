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
import Keys._

import java.security.MessageDigest
import java.nio.file._
import com.earldouglas.xwp.JettyPlugin
import com.typesafe.sbt.SbtLicenseReport.autoImport._
import org.apache.commons.configuration2._
import org.apache.commons.configuration2.builder._
import org.apache.commons.configuration2.builder.fluent._
import scala.util.{Failure, Success, Try}
import collection.JavaConverters._


object ZipBuildPlugin extends AutoPlugin {
  object autoImport {
    lazy val platformZip = taskKey[File]("Creates a distributable zip file of the platform and blazegraph bundled together with jetty as standalone server.")
  }
  import autoImport._

  override def requires = JettyPlugin
  override def trigger = allRequirements


  override lazy val projectSettings = Seq(
    platformZip := {
      val log = state.value.log;
      val config = readConfiguration(
        new File(sys.props.get("zipConfig").get),
        baseDirectory.value
      );

      val distdir = target.value / (config.name + "-" + version.value)
      val zipFile = target.value / (config.name +"-"+ version.value +".zip")

      // delete old artifacts
      IO.delete(zipFile)
      IO.delete(distdir)

      val zipFolder = downloadAndUnzipJetty(distdir, log).get

      // check that jetty folder is really where we expect it to be
      val jettyFolder = distdir.listFiles.find(_.isDirectory).get;
      if(!jettyFolder.getName().startsWith("jetty-distribution-")) {
          throw new IllegalStateException("Can not find jetty distribution folder.");
      }
      val platformWar = Keys.`package`.value
      if(!platformWar.exists()){
        throw new IllegalStateException("Can not find compile plaftorm war file.");
      }

      log.info("Unzip platform war as ROOT to jetty folder.");
      val jettyWebappRoot = new File(jettyFolder, "./webapps/ROOT");
      IO.unzip(platformWar, jettyWebappRoot);
      val appsDir = distdir / "apps";
      val configDir = distdir / "config";
      val dateTemplatesDir = distdir / "data/templates";

      log.info("Create config files");
      IO.createDirectories(Seq(distdir, appsDir, configDir, dateTemplatesDir))
      IO.touch(Seq(
        (configDir / "ui.prop")
      ));

      IO.copyFile(config.namespaces, new File(configDir,"namespaces.prop"));
      IO.copyFile(config.environment, new File(configDir,"environment.prop"));
      IO.copyFile(config.global, new File(configDir,"global.prop"));
      IO.copyFile(config.shiro, new File(configDir,"shiro.ini"));

      log.info("Copy template files")
      config.templates.foreach(
        IO.copyDirectory(_, dateTemplatesDir, true)
      )

      val startShSource = scala.io.Source.fromFile("./project/zip-dist/start.sh.tpl")
      val startShContent = try startShSource.mkString finally startShSource.close();
      log.info("Create start.sh file");
      val startSh = new File(distdir+"/start.sh");
      IO.delete(startSh);
      scala.tools.nsc.io.File(startSh).writeAll(startShContent.format(jettyFolder.getName));

      val startBatSource = scala.io.Source.fromFile("./project/zip-dist/start.bat.tpl")
      val startBatContent = try startBatSource.mkString finally startBatSource.close()
      log.info("Create start.bat file");
      val startBat = new File(distdir+"/start.bat");
      IO.delete(startBat);
      scala.tools.nsc.io.File(startBat).writeAll(startBatContent.format(jettyFolder.getName))

      log.info("Copy readme, license and thirdparty file");
      IO.copyFile(config.readme, new File(distdir,"README.txt"));
      IO.copyFile(new File(jettyWebappRoot, "THIRDPARTY.html"), new File(distdir,"THIRDPARTY.html"));
      IO.copyFile(new File(jettyWebappRoot, "LICENSE.txt"), new File(distdir,"LICENSE.txt"));

      handleDatabase(log, config, jettyFolder, distdir)

      log.info("Create final platform ZIP file");
      def entries(f: File):List[File] = f :: (if (f.isDirectory) IO.listFiles(f).toList.flatMap(entries(_)) else Nil)
      IO.zip(entries(distdir).map(d => (d, d.getAbsolutePath.substring(distdir.getParent.length))), zipFile)
      zipFile
    },
    platformZip := (platformZip dependsOn Keys.`package`).value
  )

  def downloadAndUnzipJetty(targetFolder: File, log: Logger): Try[File] = {
    val jettyVersion = "9.2.13.v20150730";
    log.info("Downloading Jetty "+ jettyVersion);
    val jettyUrl = "http://repo1.maven.org/maven2/org/eclipse/jetty/jetty-distribution/"+jettyVersion+"/jetty-distribution-"+jettyVersion+".zip"

    val jettyFile = new File(System.getProperty("java.io.tmpdir"),"jetty"+jettyVersion+".zip");
    if(java.nio.file.Files.notExists(jettyFile.toPath())) {
      log.info("Jetty zip distribution file does not exist, downloading from: " +jettyUrl);
      IO.download(new URL(jettyUrl), jettyFile);
    } else {
      log.info("Using cached jetty from: " +jettyFile);
    }

    val files = IO.unzip(jettyFile, targetFolder).toList
    files match {
      case Nil => Failure(new IllegalStateException(s"Jetty could not be downloaded or contains no files"))
      case _ => {
        log.info("Unzipped Jetty zip distribution to:" + targetFolder.getAbsolutePath());
        return Success(targetFolder)
      }
    }
  }

  def handleDatabase(log: Logger, config: ZipConfiguration, jettyFolder: File, distDir: File) {
    config.database match {
      case "blazegraph" => handleBlazegraph(log, config, jettyFolder, distDir)
      case "native" => handleNative(config)
    }
  }

  def handleBlazegraph(log: Logger, config: ZipConfiguration, jettyFolder: File, distDir: File) {
    val path = config.blazegraphUrl.split("/");
    val blazegraphVersion = path(path.length - 1);
    val blazegraphWar = new File(System.getProperty("java.io.tmpdir"), blazegraphVersion)
    if(java.nio.file.Files.notExists(blazegraphWar.toPath())) {
      log.info("Downloading blazegraph: " + config.blazegraphUrl + " to "+blazegraphWar.getAbsolutePath);
      IO.download(new URL(config.blazegraphUrl), blazegraphWar);
    }else{
      log.info("Using cached blazegraph war from "+blazegraphWar.getAbsolutePath);
    }
    log.info("Unzip blazegraph war to jetty folder.");
    IO.unzip(blazegraphWar, new File(jettyFolder, "./webapps/blazegraph"));
    IO.copyFile(new File("./project/zip-dist/LICENSE_BLAZEGRAPH.txt"), new File(distDir,"LICENSE_BLAZEGRAPH.txt"));

    log.info("Copy RWStore.properties for blazegraph.");
    IO.copyFile(config.blazegraphProps, new File(distDir,"RWStore.properties"));
  }

  def handleNative(config: ZipConfiguration) {}

  def readConfiguration(file: File, base: File) = {
    Thread.currentThread().setContextClassLoader(ZipBuildPlugin.getClass.getClassLoader)
    val params = new Parameters();
    val builder =
      new FileBasedConfigurationBuilder[FileBasedConfiguration](
        classOf[org.apache.commons.configuration2.PropertiesConfiguration]
      )
      .configure(params.fileBased().setFile(file))
    new ZipConfiguration(builder.getConfiguration(), base);
  }
}

class ZipConfiguration(
  private val configuration: org.apache.commons.configuration2.Configuration,
  private val base: File
) {
  def name = configuration.getString("name", "platform")
  def database = configuration.getString("database", "blazegraph")
  def blazegraphUrl = configuration.getString(
    "blazegraphUrl",
    "https://oss.sonatype.org/content/repositories/snapshots/com/blazegraph/blazegraph-war/2.2.0-SNAPSHOT/blazegraph-war-2.2.0-20160908.003514-6.war"
  )
  def blazegraphProps =
    resolveFile(configuration.getString("blazegraphProps", "./project/zip-dist/RWStore.properties"))
  def templates =
    configuration.getList(classOf[String], "templates").asScala.map(resolveFile)
  def global = resolveFile(configuration.getString("global", "./project/zip-dist/global.prop"))
  def ui = resolveFile(configuration.getString("ui", "./project/zip-dist/ui.prop"))
  def environment = resolveFile(
    configuration.getString("environment", "./project/zip-dist/environment.prop")
  )
  def namespaces = resolveFile(
    configuration.getString("namespaces", "./project/zip-dist/environment.prop")
  )
  def shiro = resolveFile(configuration.getString("shiro", "./project/zip-dist/shiro.ini"))

  def readme = resolveFile(configuration.getString("readme", "./project/zip-dist/README.txt"))
  def jettyVersion = configuration.getString("jettyVersion", "9.4.5.v20170502")

  private def resolveFile(file: String) = new File(base, file)
}
