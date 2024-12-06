
const dependencies = require('../package.json').dependencies;

const sharedDependencies =
      Object.keys(dependencies).reduce((acc, key) => {
          const version = dependencies[key];
          if (!version.startsWith('github')) {
              acc[key] = {
                  singleton: true,
                  requiredVersion: version,
              };
          }
          return acc;
      }, {});

const sharedDependenciesRemote =
      Object.keys(dependencies).reduce((acc, key) => {
          const version = dependencies[key];
          if (!version.startsWith('github')) {
              acc[key] = {
                  singleton: true,
                  import: false,
                  requiredVersion: version
              };
          }
          return acc;
      }, {});


module.exports = { sharedDependencies, sharedDependenciesRemote };
