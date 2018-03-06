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

import java.util.ArrayList
import java.util.concurrent.atomic._
import java.security.MessageDigest
import java.nio.file._
import org.apache.commons.configuration2._
import org.apache.commons.configuration2.builder._
import org.apache.commons.configuration2.builder.fluent._
import com.earldouglas.xwp.ContainerPlugin
import com.earldouglas.xwp.ContainerPlugin.autoImport._
import com.earldouglas.xwp.JettyPlugin
import com.earldouglas.xwp.JettyPlugin.autoImport._
import com.earldouglas.xwp.WebappPlugin.autoImport._
import com.typesafe.sbt.SbtLicenseReport.autoImport._
import CommandUtilities._
import com.metaphacts.Licenses._
import collection.JavaConverters._

case class OverrideConfig(name: String, rootFolder: String, includeAssets: Boolean, includeStyles: Boolean)

case class ProjectConfig(name: String, rootDir: String)

case class BuildConfig(
  log: String, debug: Boolean, buildEnv: String, noYarn: Boolean, noTsCheck: Boolean,
  overrides: Seq[OverrideConfig], projects: Seq[ProjectConfig]
)

object CustomJsonProtocol extends spray.json.DefaultJsonProtocol {
  implicit val overrideConfigFormat = jsonFormat4(OverrideConfig)
  implicit val projectConfigFormat = jsonFormat2(ProjectConfig)
  implicit val buildConfigFormat = jsonFormat7(BuildConfig)
}
import CustomJsonProtocol._
import spray.json._

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
  private lazy val metaphactoryPackageJsonFile = Paths.get("./metaphactory/web/package.json")

  override lazy val projectSettings = Seq(
    version := sys.props.getOrElse("platformVersion", version.value),
    // npm
    installNpmDependencies := {
      installNpmDependenciesFn(state.value, thisProject.value)
    },
    //

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
        val npmCmd= CommandUtilities.generateNPMcmd("run", "test-ci", "--", "--env.buildConfig", this.configToJson(thisProject.value));
        val testResCode = Process(npmCmd, buildFolder) !;
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
    containerForkOptions :=
      new ForkOptions(
        runJVMOptions = Seq(
          "-DruntimeDirectory=" + baseDirectory(_ / "metaphactory").value,
          // sets the location to the config folder to a temporary location for development
          "-Dcom.metaphacts.config.baselocation=" + baseDirectory.value + "/runtime/config-dev",
          // instruct the platfrom to load JS assets from webpack dev server
          "-Dconfig.environment.assetsLocation=http://localhost:3000/assets/",
          // You may change the log4j settings by switching to one of the predefined log4j2 config files,
          // see /src/main/webapp/etc for options (descriptions of log behavior is given in the files).
          // - Development log files: log4j2-debug.xml, log4j2-trace.xml, log4j2-trace2.xml
          // - Production log files: log4j2.xml, log4j2-debug.xml
          "-Dlog4j.configurationFile=file://" + baseDirectory.value + "/metaphactory/webapp/etc/"+logProfile+".xml"),
        workingDirectory = Option(file("metaphactory/core"))
      ),
    sourceDirectory in webappPrepare := baseDirectory(_ / "metaphactory/webapp").value,

    webappPostProcess := {
      webappDir => {
        // copy webapps from all sub-projects
        thisProject.value.dependencies.map {
          dep => {
            // copy all assets from metaphactory and from projects for which we have includeAssets = true
            if (
              dep.project.project == "metaphactory" || configuration.overrides.find(
                p => p.name == dep.project.project && p.includeAssets
              ).isDefined
            ) {
              streams.value.log.info("Copying assets from " + dep.project.project)
              IO.copyDirectory(projectWebappFolder(dep.project), webappDir)
            }
          }
        }
        val build = configuration.buildEnv
        if(build != "dev") {
          // production build
          // generate production web dlls
          generateDll(streams.value.log, thisProject.value);
          val npmCmd = CommandUtilities.generateNPMcmd("run", build, "--", "--env.buildConfig", this.configToJson(thisProject.value));
          val log = streams.value.log
          log.info("Invoking NPM run prod with command: "+npmCmd.mkString(" "))
          val webpackResCode = Process(npmCmd, buildFolder) !;
          if(webpackResCode != 0) throw new IllegalStateException("webpack build failed!")
          else copy(new File(buildFolder, "assets"), new java.io.File(webappDir, "assets"))
          // -- generate production web dlls

          // generate THIRDPARTY.html
          val coreLicenseReportFile : File = dumpLicenseReport.value / (licenseReportTitle.value + ".md");
          val webLicensesReportFiles = new ArrayList[String]();
          thisProject.value.dependencies.map {
            dep => {
              var webLicenseReportFile : java.io.File = new java.io.File("./target/" + dep.project.project + "-web-licenses.txt");
              val licenseProcessExitCode  = Process(
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
            "./target/THIRDPARTY.html", true, licenseFile.value.split("/")(0)
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
    javaOptions in Test := Seq("-Djava.util.logging.manager=org.apache.logging.log4j.jul.LogManager","-Dlog4j.configurationFile=file://" + baseDirectory.value + "/src/main/webapp/etc/log4j2-test.xml"),
    //-- testing

    createJsonSchema := {
      createJsonSchemaExec(streams.value.log)
    }
  )


  /**
    * Shutdown webpack on exit
    */
  private def onLoadSetting: Def.Initialize[State => State] = Def.setting {
    (onLoad in Global).value compose { state: State =>
      copyConfigToDevDir(state);
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
    // we need to run yarn twice to avoid bug in yarn, when sometimes not all dependencies are fully installed
    installNpmDependencies_(state, project);
    installNpmDependencies_(state, project);
  }


  private def installNpmDependencies_(state: State, project: ResolvedProject) = {
    project.dependencies.map {
      dep => {
        installNpmDepsInFolder(dep.project.project, projectWebFolder(dep.project), state)
      }
    }
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


  private def installNpmDepsInFolder(project: String, file: java.io.File, state: State) {
    state.log.info("Installing client side dependencies from npm for " + project )
    // use --mutex to avoid race-condition in parallel build on CI
    // see https://github.com/yarnpkg/yarn/issues/683
    val cmd = generateCmd("yarn", "--mutex", "network");
    var npmErrorCode = Process(cmd, file) ! state.log
    if(npmErrorCode != 0) {
      state.log.error("Not all client-side dependencies were installed for " + project + "! Please, check your package.json and npm configuration!")
    } else {
      state.log.info("All client side dependecies were installed for " + project)
    }
  }


  private def startWebpackProcess(
    webpackServerInstance: AtomicReference[Option[java.lang.Process]], l: Logger, project: ResolvedProject
  ) = {
    generateDll(l, project);

    l.info("Starting webpack dev server ...");

    val instance = webpackServerInstance.get();
    if(instance.isEmpty) {
      val npmCmd = CommandUtilities.generateNPMcmd(
        "run", "dev", "--", this.configToJson(project)
      );
      l.info("Invoking NPM start with command: " + npmCmd.mkString(" "));
      val probuilder = new java.lang.ProcessBuilder(java.util.Arrays.asList(npmCmd: _*));
      probuilder.redirectOutput(java.lang.ProcessBuilder.Redirect.INHERIT);
      probuilder.redirectError(java.lang.ProcessBuilder.Redirect.INHERIT);
      probuilder.directory(buildFolder);

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

  private def shouldGenerateDll(): Boolean = {
    val cacheExists = Files.exists(dllCacheFile);
    if (!cacheExists) {
      return true
    }

    val dllHash = Files.readAllBytes(dllCacheFile);
    val packageBytes = Files.readAllBytes(metaphactoryPackageJsonFile);
    val packageHash = MessageDigest.getInstance("MD5").digest(packageBytes);
    return MessageDigest.isEqual(dllHash, packageHash) == false;
  }

  private def generateDll(log: Logger, project: ResolvedProject) = {
    if(shouldGenerateDll()) {
      produceDll(log, configuration.buildEnv, project);
      generateDllCacheFile(log)
    }
  }

  private def produceDll(log: Logger, build: String, project: ResolvedProject) = {
    var npmCmd: Array[String] = null;
    if(build == "dev") {
      npmCmd = CommandUtilities.generateNPMcmd("run", "dll-dev", "--", "--env.buildConfig", this.configToJson(project));
    } else {
      npmCmd = CommandUtilities.generateNPMcmd("run", "dll-prod", "--", "--env.buildConfig", this.configToJson(project));
    }

    log.info("Generating Web.DLL")
    val resCode = Process(npmCmd, buildFolder) !;
    if(resCode != 0) throw new IllegalStateException("Web.DLL build failed!!")
  }

  private def generateDllCacheFile(log: Logger) = {
    val packageBytes  = Files.readAllBytes(metaphactoryPackageJsonFile)
    val packageHash = MessageDigest.getInstance("MD5").digest(packageBytes)
    Files.write(dllCacheFile, packageHash)
  }

  def copyConfigToDevDir = (state: State) => {
    val source = new java.io.File("metaphactory/config");
    val target = new java.io.File("runtime/config-dev");
    state.log.info("Copying configuration files from config folder to temporary config folder for development: \""+target.getAbsolutePath+"\". Existing files will not be overwritten.");
    if(!target.exists()) {
      IO.copyDirectory(source, target)
    }
    // copy files without overwriting i.e. changes to local dev configs will be preserved
    state
  }

  def copy(dir: File, dst: File) = {
    dir.listFiles.map(f => {
      if(f.isDirectory)
        IO.copyDirectory(f, dst / f.getName)
      else
        IO.copyFile(f, dst / f.getName)
    })
  }

  private def createJsonSchemaExec(log: Logger) = {
    log.info("Generating json schema from npm ...")
    val schemas = Array("SemanticCarouselConfig", "SemanticGraphConfig",
      "SemanticSimpleSearchConfig", "SemanticTableConfig",
      "SemanticTreeConfig", "SemanticMapConfig", "SemanticChartConfig",
      "SemanticQueryConfig", "SemanticSearchConfig", "SemanticFacetConfig",
      "SemanticSearchKeywordConfig", "SemanticSearchQueryConstantConfig",
      "SemanticGraphCircleLayoutConfig", "SemanticGraphConcentricLayoutConfig",
      "SemanticGraphBreadthFirstLayoutConfig", "SemanticGraphCoseLayoutConfig",
      "SemanticGraphCoseBilkentLayoutConfig", "SemanticGraphPresetLayoutConfig",
      "SemanticGraphNavigatorExtensionConfig", "SemanticGraphPanZoomExtensionConfig",
      "SemanticGraphExpandCollapseExtensionConfig",
      "SemanticQueryBuilderConfig", "SemanticTimelineConfig"
    );

    for (interfaceName <- schemas) {
      val npmCmd= CommandUtilities.generateCmd(
        "node", "./project/webpack/node_modules/typescript-json-schema/bin/typescript-json-schema", "tsconfig.json", interfaceName,
        "-o", s"./metaphactory/web/schemas/$interfaceName.json", "--required", "true", "--propOrder", "true"
      );
      log.info("Invoking json schema with command: " + npmCmd.mkString(" "))
      var npmErrorCode = Process(npmCmd, new File(".")) ! log
      if(npmErrorCode != 0) {
        log.error("Json scheme was not generated! Please, check your package.json and npm configuration!")
      } else {
        log.info("Json schema was generated.")
      }
    }
  }

  private def configToJson(project: ResolvedProject) = {
    val newConfig = configuration.copy(
      projects = project.dependencies.map(
        dep =>
        ProjectConfig(
          dep.project.project,
          Paths.get(dep.project.build).resolve(
            Paths.get(dep.project.project)
          ).toAbsolutePath().toString()
        )
      ))
    new String(java.util.Base64.getEncoder().encode(newConfig.toJson.compactPrint.getBytes()))
  }

  def getBuildConfiguration = {
    // workaround for the bug in apache commons configuration, it expects that classloader is
    // fixed all the time, but there are no guaranties for this in sbt
    Thread.currentThread().setContextClassLoader(PlatformBuildPlugin.getClass.getClassLoader)
    val configFile = new File(".build")
    configFile.createNewFile() // create config file if it doesn't exist
    val params = new Parameters();
    val builder =
      new FileBasedConfigurationBuilder[FileBasedConfiguration](
        classOf[org.apache.commons.configuration2.PropertiesConfiguration]
      )
        .configure(params.fileBased().setFile(configFile))
    val configuration = builder.getConfiguration()

    def s(name: String, default: String): String = {
      sys.props.get(name).getOrElse(configuration.getString(name, default))
    }

    def b(name: String, default: Boolean): Boolean = {
      sys.props.get(name).map(_.toBoolean).getOrElse(configuration.getBoolean(name, default))
    }

    val keys =
      configuration.getKeys()
        .asScala.collect{case s: String => s}
        .toList.filter(_.startsWith("project"))
    val projects = keys.map(_.split("\\.")(1)).distinct
    val projectsConfig =
      projects.map{
        x => OverrideConfig(
          x,
          (new File(x)).getAbsolutePath(),
          b("project." + x + ".include_assets", false),
          b("project." + x + ".include_styles", false)
        )
      }

    BuildConfig(
      s("log", "log4j2-debug"), b("debug", false), s("buildEnv", "dev"),
      b("noYarn", false), b("noTsCheck", false), projectsConfig, Seq()
    )
  }
}
