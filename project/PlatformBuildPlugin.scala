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
import java.io.ByteArrayOutputStream
import java.util.ArrayList
import java.util.concurrent.atomic._
import java.security.MessageDigest
import java.nio.file._
import java.util.stream.Collectors

import collection.JavaConverters._
import org.apache.commons.configuration2._
import org.apache.commons.configuration2.builder._
import org.apache.commons.configuration2.builder.fluent._
import com.earldouglas.xwp.ContainerPlugin
import com.earldouglas.xwp.ContainerPlugin.autoImport._
import com.earldouglas.xwp.JettyPlugin
import com.earldouglas.xwp.JettyPlugin.autoImport._
import com.earldouglas.xwp.WebappPlugin.autoImport._
import com.earldouglas.xwp.WarPlugin.autoImport._
import com.typesafe.sbt.SbtLicenseReport.autoImport._
import CommandUtilities._
import com.metaphacts.Licenses._
import RootBuildOptions._
import CommandUtilities.runProcessWithEnv
import org.apache.commons.configuration2.io.FileHandler
import collection.JavaConversions._

case class BuildConfig(
  log: String,
  debug: Boolean,
  buildEnv: String,
  noYarn: Boolean,
  runtimeDirectory: Option[String],
  PLATFORM_OPTS: Seq[String]
)

case class BundledAppConfig(
  projectName: String, appDir: Path, targetClasspath: Option[String]
)

object PlatformBuildPlugin extends AutoPlugin {
  object autoImport {
    lazy val webpackDevServerStart = taskKey[Unit]("Start webpack dev server.")
    lazy val webpackDevServerStop = taskKey[Unit]("Stop webpack dev server.")
    lazy val installNpmDependencies = taskKey[Unit]("Install npm dependencies.")
    lazy val createJsonSchema = taskKey[Unit]("Create json schema for components")
    lazy val licenseFile = settingKey[String]("License file")
    lazy val npmTest = TaskKey[Int]("Client-side tests.");
  }
  import autoImport._


  override def requires = JettyPlugin
  override def trigger = allRequirements

  private lazy val configuration = getBuildConfiguration

  /**
    * Increase form upload size in jetty container
    */
  private lazy val jettyParameters = Seq("-Dorg.eclipse.jetty.server.Request.maxFormContentSize=100000000");

  private lazy val webpackServerInstance =
    settingKey[AtomicReference[Option[java.lang.Process]]]("Current wepback process")

  /**
    * By default, in development mode, we run the platform with debug logging
    */
  private lazy val logProfile =  configuration.log

  /**
    *  client-side dependencies build folder
    */
  private lazy val buildFolder = new File("./project/webpack");

  /**
    * File that stores hash of the metaphactory package.json file, when the cache changed
    * client-side dll dependencies bundle is automatically updated
    */
  private lazy val dllCacheFile = Paths.get("./project/webpack/assets/.dll.cache")

  override lazy val projectSettings = Seq(
    inheritJarManifest := true,
    // npm
    installNpmDependencies := {
      installNpmDependenciesFn(state.value, thisProject.value)
    },

    unmanagedResourceDirectories in (Compile, packageBin) ++=
      getBundledAppConfigs(thisProject.value).flatMap(config => {
        val appPath = config.appDir.toFile
        config.targetClasspath.map(_ => appPath)
      }),

    mappings in(Compile, packageBin) ++=
      getBundledAppConfigs(thisProject.value).flatMap(config => {
        config.targetClasspath match {
          case Some(classpathLocation) => {
            val appPath = config.appDir.toFile
            (appPath ** "*" get) pair rebase(appPath, classpathLocation)
          }
          case None => Seq()
        }
      }),

    resourceGenerators in Compile += Def.task {
      val file = (resourceManaged in Compile).value / "com/metaphacts/app/internalStorage.prop"
      setClassloaderWorkaroundForApacheConfiguration()
      val props = new PropertiesConfiguration()
      getBundledAppConfigs(thisProject.value).foreach(config => {
        val prefix = s"config.storage.${config.projectName}"
        config.targetClasspath match {
          case Some(classpathLocation) => {
            props.setProperty(s"${prefix}.type", "classpath")
            props.setProperty(s"${prefix}.classpathLocation", classpathLocation)
          }
          case None => {
            props.setProperty(s"${prefix}.type", "nonVersionedFile")
            props.setProperty(s"${prefix}.mutable", "true")
            props.setProperty(s"${prefix}.root", config.appDir.toString)
          }
        }
      })
      val byteStream = new ByteArrayOutputStream()
      new FileHandler(props).save(byteStream)
      IO.write(file, byteStream.toByteArray)
      Seq(file)
    }.taskValue,

    // cleanup
    cleanFiles ++= baseDirectory((base) => {
      Seq(
        "project/webpack/assets",
        "project/webpack/.cache-loader",
        "project/webpack/.happypack",
        "project/webpack/node_modules"
      ).map(
        new File(base, _)
      )
    }).value,
    cleanFiles ++= thisProject((project) => {
      project.dependencies.map {
        dep => {
          new File(projectWebFolder(dep.project), "node_modules")
        }
      }
    }).value,
    clean := {
      clean.value
      installNpmDependencies.value
    },
    // -- cleanup

    // tests
    npmTest := {
      val log = streams.value.log
      if (configuration.buildEnv == "prod") {
        generateDll(log, thisProject.value)
        log.info("Running karma tests ...")
        val npmCmd= CommandUtilities.generateNPMcmd("run", "test-ci")
        val testResCode = runProcessWithEnv(npmCmd, buildFolder)!;
        if(testResCode != 0) sys.error("Error in client side code detected.")
        testResCode
      } else {
        0
      }
    },
    test in Test := {
      npmTest.value
      (test in Test).value
    },
    // --tests

    // licenses
    licenseSelection := LicenseCategory.all ++ Seq(builtin.BSDStyle),
    licenseOverrides := licenseOverrides.value orElse metaphactsLicenseOverrides,
    // --licenses

    // development jetty configuration
    javaOptions in Jetty ++= jettyParameters ++
     (if(configuration.debug == true)
        Seq("-Xdebug", "-Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=5005")
      else (Seq())),
    containerPort := 10214,
    containerForkOptions := {
      val runtimeDirectory = configuration.runtimeDirectory.getOrElse(baseDirectory.value + "/runtime")
      new ForkOptions(
        runJVMOptions = Seq(
          "-DruntimeDirectory=" + runtimeDirectory,
          // sets the location to the config folder to a temporary location for development
          "-Dcom.metaphacts.config.baselocation=" + runtimeDirectory + "/config",
          // make apps writable in local development mode
          "-Dconfig.mutablePluginApps=true",
          // instruct the platfrom to load JS assets from webpack dev server
          "-Dconfig.environment.assetsLocation=http://localhost:3000/assets/",
          // You may change the log4j settings by switching to one of the predefined log4j2 config files,
          // see /src/main/webapp/etc for options (descriptions of log behavior is given in the files).
          // - Development log files: log4j2-debug.xml, log4j2-trace.xml, log4j2-trace2.xml
          // - Production log files: log4j2.xml, log4j2-debug.xml
          "-Dlog4j.configurationFile=file://" + baseDirectory.value + "/metaphacts-platform/webapp/etc/" + logProfile + ".xml",
          "-Dconfig.environment.shiroConfig="+baseDirectory.value.toPath().resolve(defaultShiroIniFolder).resolve("shiro.ini").toFile.getAbsolutePath,
          // disable logs from jetty AnnotationsParser, see ID-772
          "-Dorg.eclipse.jetty.annotations.LEVEL=OFF"
        ) ++ configuration.PLATFORM_OPTS,
        workingDirectory = Option(file("metaphacts-platform/core"))
      )
    },
    sourceDirectory in webappPrepare := baseDirectory(_ / "metaphacts-platform/webapp").value,

    webappPostProcess := {
      webappDir => {
        // copy webapps from all sub-projects
        thisProject.value.dependencies.map {
          dep => {
            // copy all assets from metaphactory and from all projects
            streams.value.log.info("Copying assets from " + dep.project.project)
            IO.copyDirectory(projectWebappFolder(dep.project), webappDir, true)
          }
        }
        val build = configuration.buildEnv
        if(build != "dev") {
          // production build
          // generate production web dlls
          generateDll(streams.value.log, thisProject.value);
          val npmCmd = CommandUtilities.generateNPMcmd("run", build)
          val log = streams.value.log
          log.info("Invoking NPM run prod with command: "+npmCmd.mkString(" "))
          val webpackResCode = runProcessWithEnv(npmCmd, buildFolder)!;
          if(webpackResCode != 0) throw new IllegalStateException("webpack build failed!")
          else copy(new File(buildFolder, "assets"), new java.io.File(webappDir, "assets"))
          // -- generate production web dlls

          // generate THIRDPARTY.html
          val coreLicenseReportFile : File = dumpLicenseReport.value / (licenseReportTitle.value + ".md");
          val webLicensesReportFiles = new ArrayList[String]();
          thisProject.value.dependencies.map {
            dep => {
              var webLicenseReportFile : java.io.File = new java.io.File("./target/" + dep.project.project + "-web-licenses.txt");
              val licenseProcessExitCode  = runProcessWithEnv(
                CommandUtilities.generateNPMcmd(
                  "run", "license-report", "--", projectWebFolder(dep.project).getAbsolutePath() + "/package.json"
                ), buildFolder
              ) #>  webLicenseReportFile!;
              if(licenseProcessExitCode != 0) throw new IllegalStateException("failed to generate license files for platform-web!")
              else webLicensesReportFiles.add(webLicenseReportFile.getAbsolutePath())
            }
          }
          var thirdPartyFile = com.metaphacts.LicenseAggregator.doGenerate(
            webLicensesReportFiles, coreLicenseReportFile.getAbsolutePath() ,
            "./target/THIRDPARTY.html", true, licenseFile.value.split("/")(0),
            licenseBundleOptions.includeFromLibraries
          )
          IO.copyFile(thirdPartyFile, new File(webappDir, "THIRDPARTY.html"));
          IO.copyFile(new File("./COPYING.txt"), new File(webappDir, "COPYING.txt"));
          IO.copyFile(new File(licenseFile.value), new File(webappDir, "LICENSE.txt"));
          // generate THIRDPARTY.html
        }
      }
    },
    // webpack dev server
    webpackServerInstance := new AtomicReference(Option.empty[java.lang.Process]),
    webpackDevServerStart := {
      startWebpackProcess(webpackServerInstance.value, streams.value.log, thisProject.value)
    },
    webpackDevServerStop := {
      killWebpackProcess(webpackServerInstance.value, streams.value.log)
    },

    // start webpack when we start jetty
    (ContainerPlugin.start in Jetty)
      := ((ContainerPlugin.start in Jetty) dependsOn webpackDevServerStart).value,

    // gracefully shutdown webpack when we stop jetty
    (ContainerPlugin.stop in Jetty)
      := ((ContainerPlugin.stop in Jetty) dependsOn webpackDevServerStop).value,

    // add hook to shutdown webpack on exit
    onLoad in Global := onLoadSetting.value andThen installNpmDeps.value,
    //-- webpack dev server

    // testing
    javaOptions in Test := Seq("-Djava.util.logging.manager=org.apache.logging.log4j.jul.LogManager","-Dlog4j.configurationFile=file://" + baseDirectory.value + "/src/main/webapp/etc/log4j2-test.xml")
    //-- testing
  )

  /**
    * Shutdown webpack on exit
    */
  private def onLoadSetting: Def.Initialize[State => State] = Def.setting {
    (onLoad in Global).value compose { state: State =>
      state.addExitHook(killWebpackProcess(webpackServerInstance.value, state.log))
    }
  }

  /**
    *  Run `yarn install` on build initialization
    */
  private def installNpmDeps : Def.Initialize[State => State] = Def.setting {
    (onLoad in Global).value compose { state: State =>
      if (configuration.noYarn == false) {
        installNpmDependenciesFn(state, thisProject.value)
      }
      state
    }
  }

  private def installNpmDependenciesFn(state: State, project: ResolvedProject) = {
    installNpmDepsForAllProjects(state, project)
    installNpmDepsInFolder("build", new java.io.File(state.configuration.baseDirectory, "project/webpack"), state)
  }

  private def projectWebFolder(project: ProjectRef) = {
    Paths.get(project.build).resolve(
      Paths.get(project.project)
    ).resolve(
      Paths.get("web")
    ).toFile()
  }

  private def projectWebappFolder(project: ProjectRef) = {
    Paths.get(project.build).resolve(
      Paths.get(project.project)
    ).resolve(
      Paths.get("webapp")
    ).toFile()
  }

  private def installNpmDepsForAllProjects(state: State, project: ResolvedProject): Unit = {
    // install NPM dependencies for all projects (even non-included) to successfully pass TypeScript
    // type-check, because it doesn't use Webpack module resolution due to HappyPack plugin:
    // https://github.com/TypeStrong/ts-loader#happypackmode-boolean-defaultfalse
    val allProjectDirs = project.base.listFiles.filter(_.isDirectory)
    for (dir <- allProjectDirs) {
      val webDir = dir.toPath.resolve("web")
      if (Files.exists(webDir.resolve("platform-web-build.json"))) {
        installNpmDepsInFolder(dir.getName, webDir.toFile, state)
      }
    }
  }

  private def installNpmDepsInFolder(project: String, file: java.io.File, state: State) {
    state.log.info(s"Installing client side dependencies from npm for '$project' at folder: $file")
    def runYarn(): Boolean = {
      // use --mutex to avoid race-condition in parallel build on CI
      // see https://github.com/yarnpkg/yarn/issues/683
      val cmd = generateCmd("yarn", "--mutex", "network")
      val npmErrorCode = runProcessWithEnv(cmd, file) ! state.log
      npmErrorCode == 0
    }
    val successfullyInstalled = runYarn()
    if (!successfullyInstalled) {
      val errorMessage = "Not all client-side dependencies were installed for " +
        project + "! Please, check your package.json and npm configuration!"
      state.log.error(errorMessage)
      throw new IllegalStateException(errorMessage)
    } else {
      state.log.info("All client side dependencies were installed for " + project)
    }
  }


  private def startWebpackProcess(
    webpackServerInstance: AtomicReference[Option[java.lang.Process]], l: Logger, project: ResolvedProject
  ) = {
    generateDll(l, project);

    l.info("Starting webpack dev server ...");

    val instance = webpackServerInstance.get();
    if(instance.isEmpty) {
      val npmCmd = CommandUtilities.generateNPMcmd("run", "dev")
      l.info("Invoking NPM start with command: " + npmCmd.mkString(" "));
      val probuilder = new java.lang.ProcessBuilder(java.util.Arrays.asList(npmCmd: _*));
      probuilder.redirectOutput(java.lang.ProcessBuilder.Redirect.INHERIT);
      probuilder.redirectError(java.lang.ProcessBuilder.Redirect.INHERIT);
      probuilder.directory(buildFolder);
      probuilder.environment().put(buildJsonParamName, buildJsonPath)

      webpackServerInstance.set(
        Option(probuilder.start())
      )
    }
  }

  private def killWebpackProcess(
    instance: AtomicReference[Option[java.lang.Process]], l: Logger
  ) = {
    l.info("Waiting for webpack server to shut down ...")
    val maybeProcess = instance.getAndSet(None)
    maybeProcess.foreach((process) => {
      val stdin = process.getOutputStream();
      val writer = new java.io.OutputStreamWriter(stdin);
      writer.write("stop");
      writer.flush();
      writer.close();

      process.waitFor();
      process.getInputStream().close();
      process.getErrorStream().close();
      process.getOutputStream().close();
    })
  }

  /** This is a case class, so == comparison will compare by value */
  case class DllCacheToken private (token: String) {
    def save(): Unit = {
      Files.write(dllCacheFile, List(token).asJava)
    }
  }
  object DllCacheToken {
    def read(): DllCacheToken = {
      val token = {
        if (Files.exists(dllCacheFile)) {
          try {
            Files.readAllLines(dllCacheFile).asScala.mkString("\n")
          } catch {
            // happens when trying to read previous binary versions as UTF-8
            case _: java.nio.charset.MalformedInputException => ""
          }
        } else { "" }
      }
      DllCacheToken(token)
    }

    def compute(): DllCacheToken = {
      val hashes = includeProjects.map(projectName => {
        val packageJsonPath = Paths.get(projectName, "web", "package.json")
        val packageJsonHexDigest = {
          if (Files.exists(packageJsonPath)) {
            val packageBytes = Files.readAllBytes(packageJsonPath)
            val packageHash = MessageDigest.getInstance("MD5").digest(packageBytes)
            toHexString(packageHash)
          } else { "" }
        }
        projectName + ":" + packageJsonHexDigest
      })
      val token = hashes.mkString(";")
      DllCacheToken(token)
    }

    private def toHexString(bytes: Array[Byte]): String = {
      val sb = new StringBuilder(bytes.length * 2)
      for (b <- bytes) {
        sb.append("%02X".format(b & 0xff))
      }
      sb.toString
    }
  }

  private def shouldGenerateDll(): Boolean = {
    DllCacheToken.read() != DllCacheToken.compute()
  }

  private def generateDll(log: Logger, project: ResolvedProject) = {
    if (shouldGenerateDll()) {
      produceDll(log, configuration.buildEnv, project);
      DllCacheToken.compute().save()
    }
  }

  private def produceDll(log: Logger, build: String, project: ResolvedProject) = {
    var npmCmd: Array[String] = null;
    if(build == "dev") {
      npmCmd = CommandUtilities.generateNPMcmd("run", "dll-dev")
    } else {
      npmCmd = CommandUtilities.generateNPMcmd("run", "dll-prod")
    }

    log.info("Generating Web.DLL")
    val resCode = runProcessWithEnv(npmCmd, buildFolder) !;
    if(resCode != 0) throw new IllegalStateException("Web.DLL build failed!!")
  }

  def copy(dir: File, dst: File) = {
    dir.listFiles.map(f => {
      if(f.isDirectory)
        IO.copyDirectory(f, dst / f.getName)
      else
        IO.copyFile(f, dst / f.getName)
    })
  }

  def getBuildConfiguration = {
    setClassloaderWorkaroundForApacheConfiguration()

    val configuration = {
      val configFile = new File(".build")
      if (configFile.exists()) {
        val params = new Parameters()
        val builder = new FileBasedConfigurationBuilder[FileBasedConfiguration](
          classOf[org.apache.commons.configuration2.PropertiesConfiguration]
        ).configure(params.fileBased().setFile(configFile))
        builder.getConfiguration()
      } else {
        new PropertiesConfiguration()
      }
    }

    def s(name: String, default: String): String = {
      sys.props.get(name).getOrElse(configuration.getString(name, default))
    }

    def b(name: String, default: Boolean): Boolean = {
      sys.props.get(name).map(_.toBoolean).getOrElse(configuration.getBoolean(name, default))
    }

    def getPlatformOpts(default: Seq[String]):  Seq[String] = {
      val properties = System.getProperties().filterKeys( x => (x.startsWith("config.") || x.startsWith("appsDirectory") ) )
      val x = default ++ properties.toList.map({ case (a,b) => "-D" + a.toString +"="+ b.toString })
      println("The following system properties will be passed to the platform:")
      println(x mkString "\n")
      x
    }


    BuildConfig(
      s("log", "log4j2-debug"),
      b("debug", false),
      s("buildEnv", "dev"),
      b("noYarn", false),
      sys.props.get("runtimeDirectory"),
      getPlatformOpts(Seq())
    )
  }

  def getBundledAppConfigs(project: ResolvedProject) = {
    var configs = Map[String, BundledAppConfig]()
    project.dependencies.foreach {
      dep => {
        val projectName = dep.project.project
        if (includeProjects.contains(projectName)) {
          val projectPath = Paths.get(dep.project.build).resolve(Paths.get(projectName))
          val appPath = projectPath.resolve("app")
          if (Files.isDirectory(appPath) && bundleAppsFrom.contains(projectName)) {
            val targetClasspath = if (configuration.buildEnv == "prod") {
              Some("com/metaphacts/app/" + projectName)
            } else {
              None
            }
            configs += projectName -> BundledAppConfig(projectName, appPath, targetClasspath)
          }
        }
      }
    }
    includeProjects.flatMap(projectName => configs.get(projectName))
  }

  def setClassloaderWorkaroundForApacheConfiguration(): Unit = {
    // workaround for the bug in apache commons configuration, it expects that classloader is
    // fixed all the time, but there are no guaranties for this in sbt
    Thread.currentThread().setContextClassLoader(PlatformBuildPlugin.getClass.getClassLoader)
  }
}
