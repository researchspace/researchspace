/*
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

import com.earldouglas.xwp.JettyPlugin
import scala.util.{Failure, Success, Try}
import java.io._

import RootBuildOptions._

object ZipBuildPlugin extends AutoPlugin {
  object autoImport {
    lazy val platformZip = taskKey[File]("Creates a distributable zip file of the platform and blazegraph bundled together with jetty as standalone server.")
  }
  import autoImport._

  override def requires = JettyPlugin
  override def trigger = allRequirements


  override lazy val projectSettings = Seq(
    platformZip := {
      val log = state.value.log
      val config = new ZipConfiguration(
        baseDirectory.value,
        target.value,
        version.value
      )

      val distdir = config.zipDistdir
      val zipFile = target.value / (config.name +"-"+ version.value +".zip")

      // delete old artifacts
      val files = target.value.listFiles().filter(_.isFile).toList.filter { file =>
        file.getName.endsWith("zip")
      }
      files.foreach(IO.delete)
      IO.delete(distdir)

      val jettyFolderTemp = downloadAndUnzipJetty(distdir, log).get

      // check that jetty folder is really where we expect it to be
      val jettyFolder = distdir.listFiles.find(_.isDirectory).get;
      if(!jettyFolder.getName().equals("jetty-distribution")) {
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
      val configDir = distdir / "runtime-data/config";

      val jettyResources = new File(jettyFolder, "resources");

      log.info("Create config files");
      IO.createDirectories(Seq(distdir, appsDir, configDir, jettyResources))

      IO.copyFile(config.global, new File(configDir, "global.prop"))
      IO.copyFile(config.shiro, new File(configDir, "shiro.ini"))

      IO.copyFile(config.jetty, new File(distdir,"jetty"));

      IO.copyFile(
        new File("./project/zip-dist/jetty-logging.properties"),
        new File(jettyResources, "jetty-logging.properties")
      );


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

      createBlazegraphBundle(log, config, jettyFolder.getName, distdir)
      createRdf4NativeBundle(log, config, jettyFolder.getName, distdir)

      log.info("Create final platform ZIP file")
      packZip(distdir, zipFile)
      zipFile
    },
    platformZip := (platformZip dependsOn Keys.`package`).value
  )

  def downloadAndUnzipJetty(targetFolder: File, log: Logger): Try[File] = {
    val jettyVersion = "9.4.12.v20180830";
    log.info("Downloading Jetty "+ jettyVersion);
    val jettyUrl = "http://repo1.maven.org/maven2/org/eclipse/jetty/jetty-distribution/"+jettyVersion+"/jetty-distribution-"+jettyVersion+".zip"

    val jettyFile = new File(System.getProperty("java.io.tmpdir"),"jetty"+jettyVersion+".zip");
    log.info("Trying to find jetty in " + jettyFile);
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
        log.info("Renaming folder to jetty-distribution");
        var finalDistributionFolder = new File(targetFolder, "jetty-distribution");
        IO.move(new File(targetFolder, "jetty-distribution-"+jettyVersion),  finalDistributionFolder )
        return Success(targetFolder)
      }
    }
  }

  def createBlazegraphBundle(log: Logger, config: ZipConfiguration, jettySubFolderName: String, distDir: File) = {
    val blazegraphTargetZipFile = config.blazegraphTargetZipFile
    val zipDistdir = config.blazegraphZipDistDir
    val jettyFolder = new File(zipDistdir, jettySubFolderName)

    IO.delete(blazegraphTargetZipFile)
    IO.delete(zipDistdir)

    IO.copyDirectory(config.zipDistdir, zipDistdir)

    val path = config.blazegraphUrl.split("/");
    val blazegraphVersion = path(path.length - 1);
    val blazegraphWar = new File(System.getProperty("java.io.tmpdir"), blazegraphVersion)
    log.info("Trying to find blazegraph in " + blazegraphWar);
    if(java.nio.file.Files.notExists(blazegraphWar.toPath())) {
      log.info("Downloading blazegraph: " + config.blazegraphUrl + " to "+blazegraphWar.getAbsolutePath);
      IO.download(new URL(config.blazegraphUrl), blazegraphWar);
    }else{
      log.info("Using cached blazegraph war from "+blazegraphWar.getAbsolutePath);
    }
    log.info("Unzip blazegraph war to jetty folder.");
    IO.unzip(blazegraphWar, new File(jettyFolder, "./webapps/blazegraph"));
    IO.copyFile(new File("./project/zip-dist/LICENSE_BLAZEGRAPH.txt"), new File(zipDistdir,"LICENSE_BLAZEGRAPH.txt"));

    log.info("Copy RWStore.properties for blazegraph.");
    IO.copyFile(config.blazegraphProps, new File(zipDistdir,"RWStore.properties"));

    log.info("Set sparqlEndpoint to local blazegraph in environment.prop")
    val configDir = new File(zipDistdir, "runtime-data/config");
    IO.touch(Seq(
        (configDir / "environment.prop")
    ));
    val bw = new BufferedWriter(new FileWriter(new File(configDir ,"environment.prop")))
    bw.write("sparqlEndpoint=http://127.0.0.1:10214/blazegraph/sparql")
    bw.close()

    log.info("Create platform blazegraph ZIP bundle")
    packZip(zipDistdir, blazegraphTargetZipFile)
  }

  def createRdf4NativeBundle(log: Logger, config: ZipConfiguration, jettySubFolderName: String, distDir: File) = {
    val rdf4jTargetZipFile = config.rdf4jTargetZipFile
    val zipDistdir = config.rdf4jZipDistDir

    IO.delete(rdf4jTargetZipFile)
    IO.delete(zipDistdir)

    IO.copyDirectory(config.zipDistdir, zipDistdir)

    val repositoryDir = new File(zipDistdir, "runtime-data/config/repositories");
    IO.copyFile(new File(config.zipDistFileTemplates, "default-rdf4j.ttl"), new File(repositoryDir,"default.ttl"));

    log.info("Create platform rdf4j native store ZIP bundle")
    packZip(zipDistdir, rdf4jTargetZipFile)
  }

  private def packZip(zipDistdir: File, outputZipPath: File) = {
    def entries(f: File): List[File] = f :: (if (f.isDirectory) IO.listFiles(f).toList.flatMap(entries) else Nil)
    IO.zip(
      entries(zipDistdir).map(entryFile => {
        val relativePath = zipDistdir.getParentFile.relativize(entryFile.getAbsoluteFile).get
        (entryFile, relativePath.toString)
      }),
      outputZipPath
    )
  }
}

class ZipConfiguration(
  private val base: File,
  private val targetDir: File,
  private val version: String
) {
  private val configuration = zipBundleOptions
  def name = configuration.getString("name", "platform")

  def zipDistdir = targetDir/ (name + "-" + version)

  /*
   *  Blazegraph
   */
  def blazegraphUrl = configuration.getString(
    "blazegraphUrl",
    "https://oss.sonatype.org/content/repositories/snapshots/com/blazegraph/blazegraph-war/2.2.0-SNAPSHOT/blazegraph-war-2.2.0-20160908.003514-6.war"
  )
  def blazegraphProps = resolveFile(configuration.getString("blazegraphProps", "./project/zip-dist/RWStore.properties"))
  val blazegraphZipDistDir = new File(zipDistdir + "-blazegraph-bundle")
  val blazegraphTargetZipFile = targetDir / (name +"-"+ version +"-blazegraph-bundle.zip")

  /*
   *  RDF4J native store
   */
  val rdf4jZipDistDir = new File(zipDistdir + "-rdf4j-bundle")
  val rdf4jTargetZipFile = targetDir / (name +"-"+ version +"-rdf4j-bundle.zip")

  def zipDistFileTemplates = resolveFile("./project/zip-dist/")

  def global = resolveFile(configuration.getString("global", "./project/zip-dist/global.prop"))
  def shiro = resolveFile(configuration.getString("shiro", "./metaphacts-platform/app/config/shiro.ini"))
  def jetty = resolveFile(configuration.getString("jetty", "./project/zip-dist/jetty"))

  def readme = resolveFile(configuration.getString("readme", "./project/zip-dist/README.txt"))
  def jettyVersion = configuration.getString("jettyVersion", "9.4.12.v20180830")

  private def resolveFile(file: String) = new File(base, file)
}
