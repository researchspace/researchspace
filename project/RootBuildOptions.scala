import scala.io.Source
import scala.util.parsing.json.JSON
import java.io.FileNotFoundException

object RootBuildOptions {
  val buildJsonParamName = "buildjson"
  private val buildJsonParam = sys.props.get(buildJsonParamName)
  val platformVersion = "3.3.2";
  private val defaultBuildJsonPath = "default-root-build.json"
  val buildJsonPath = buildJsonParam.getOrElse(defaultBuildJsonPath)
  private val json = {
    val jsonString = {
      try {
        Source.fromFile(buildJsonPath).mkString
      } catch {
        case _: FileNotFoundException => {
          val message = if (buildJsonParam.isEmpty) {
            s"Cannot find build configuration file. Please specify it either " +
            s"by system property -D$buildJsonParamName=<path-to-config> or " +
            s"by copying one from 'build-configs/' directory as '$defaultBuildJsonPath'"
          } else {
            s"Cannot find build configuration file '$buildJsonPath' specified " +
            s"by -D$buildJsonParamName system property"
          }
          throw new Error(message)
        }
      }
    }
    JSON.parseFull(jsonString) match {
      case Some(map: Map[String, Any] @unchecked) => map
      case _ => throw new Exception("Root build config is not an object")
    }
  }
  val includeProjects: List[String] = json.get("includeProjects") match {
    case Some(list: List[String] @unchecked) => list
    case _ => throw new Exception("includeProjects is not an array of project names")
  }
  val bundleAppsFrom: Set[String] = json.get("bundleAppsFrom") match {
    case Some(list: List[String] @unchecked) => Set(list: _*)
    case None => Set()
    case _ => throw new Exception("bundleAppsFrom is not an array of project names")
  }
  val defaultShiroIniFolder: String = json.getOrElse("defaultShiroIniFolder", "metaphacts-platform/app/config").asInstanceOf[String]
  object licenseBundleOptions {
    val values: Map[String, Any] = json.get("license") match {
      case Some(map: Map[String, Any]@unchecked) => map
      case None => Map()
      case _ => throw new Exception("license is not a dictionary")
    }
    val licenseFile: String = values.get("licenseFile") match {
      case Some(str: String) => str
      case _ => throw new Exception("license.licenseFile is not a string")
    }
    val includeFromLibraries: Set[String] = values.get("includeFromLibraries") match {
      case Some(list: List[String] @unchecked) => Set(list: _*)
      case None => Set()
      case _ => throw new Exception("license.includeFromLibraries is not an array of project names")
    }
  }
  object zipBundleOptions {
    val values: Map[String, Any] = json.get("zipBundleOptions") match {
      case Some(map: Map[String, Any]@unchecked) => map
      case None => Map()
      case _ => throw new Exception("zipBundleOptions is not a dictionary")
    }
    def getString(key: String, default: String) = values.get(key) match {
      case Some(str: String) => str
      case None => default
      case _ => throw new Exception(s"zipBundleOptions.'$key' is not a string")
    }
  }
}
