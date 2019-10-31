node {
    // we need to replace "/" with "-" to use it as docker tag
    def platformVersion = "ci-${env.BRANCH_NAME}-${env.BUILD_ID}".replace("/", "-");
    def documentationPluginVersion = "ci-${env.BRANCH_NAME}+${env.BUILD_ID}".replace("/", "-");

    // set node version for the build
    def nodeHome = tool 'node-6.2.0'
    env.PATH="${nodeHome}/bin:${env.PATH}"

    def namespace = env.JOB_NAME.tokenize('/')[1]

    def branch = env.BRANCH_NAME
    def buildJsonPath =
      branch.startsWith("mosp/") ? "./metaphactory/build-configs/platform-only-root-build.json" :
      (branch.equals("researchspace") || branch.startsWith("rs/")) ? "./researchspace/researchspace-root-build.json" :
      (branch.equals("metaphactory") || branch.startsWith("mph/")) ? "./metaphactory/build-configs/metaphactory-root-build.json" :
      "./metaphactory/build-configs/metaphactory-root-build.json"

    stage 'build platform'

    dir('platform') {
        // get platform code from bitbucket
        checkout scm

        // workaround for inability to directly parse build JSON config:
        // the script writes to ./target/testResultPaths and ./target/defaultShiroIniFolder
        sh "node ./project/webpack/generateInputsForJenkins.js ${buildJsonPath}"
        def testResultPaths = readFile(file: './target/testResultPaths')
        echo "testResultPaths: ${testResultPaths}"
        def defaultShiroIniFolder = readFile(file: './target/defaultShiroIniFolder')
        echo "defaultShiroIniFolder: ${defaultShiroIniFolder}"

        sshagent(["jenkins-ssh-key"]) {
            try {
                // build platform with sbt
                sh "./build.sh -DnoYarn=true -DbuildEnv=prod -Dbuildjson=${buildJsonPath} -DplatformVersion=${platformVersion} -no-colors clean test platformZip"
            } finally {
                step([$class: 'JUnitResultArchiver', testResults: testResultPaths])
                if (currentBuild.result == 'UNSTABLE')
                currentBuild.result = 'FAILURE'
            }
        }

        // save build artifact for later usage for docker image creation
        dir('target') {
            stash name: 'platform-war', includes: "*.war"
        }

        // save log profiles
        dir('metaphacts-platform/webapp/etc') {
            stash name: 'logs', includes: "*.xml"
        }

        // save config
        dir(defaultShiroIniFolder) {
          stash name: 'config'
        }

        dir('target') {
          archive '*-*.zip'
        }
    }

    stage 'build docker images'

    dir('platform/metaphacts-platform/dist/docker/platform') {
        // cbbe71da-1ee9-4bab-8469-01b92ed91875 is id of jenkins ldap user credentials
        docker.withRegistry('https://docker.metaphacts.com', 'cbbe71da-1ee9-4bab-8469-01b92ed91875') {
            unstash 'platform-war'
            // platform docker build expects file named ROOT.war
            sh 'mv platform-*.war ROOT.war'
            sh 'rm -rf etc; mkdir etc'
            dir('etc') {
              unstash 'logs'
            }

            sh 'rm -rf config; mkdir config'
            dir('config') {
              unstash 'config'
            }

            // build platform docker image and push it to internal docker registry
            def platformDockerImage = docker.build "${namespace}/platform:${platformVersion}"
            platformDockerImage.push()
        }
    }
}
