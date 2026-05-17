const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Force CJS resolution on web to avoid import.meta issues in ESM builds (e.g., zustand middleware)
config.resolver.unstable_enablePackageExports = true
config.resolver.unstable_conditionNames = ['browser', 'require', 'default']

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'empty' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
