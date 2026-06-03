const path = require('path');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Performance optimizations for bundle splitting
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  assert: path.resolve(__dirname, 'node_modules/assert/'),
  util: path.resolve(__dirname, 'node_modules/util/'),
};

config.resolver.platforms = [
  'native',
  'android',
  'ios',
  'web'
];

// Add path aliases for better imports
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@helpers': path.resolve(__dirname, 'src/helpers'),
  '@stores': path.resolve(__dirname, 'src/stores'),
  '@theme': path.resolve(__dirname, 'src/theme'),
  '@config': path.resolve(__dirname, 'src/config'),
  // Enable tree shaking for vector icons - only keep used ones
  '@expo/vector-icons/MaterialCommunityIcons': '@expo/vector-icons/build/MaterialCommunityIcons',
  '@expo/vector-icons/MaterialIcons': '@expo/vector-icons/build/MaterialIcons',
};

// Route .svg files through react-native-svg-transformer so card logos can be
// imported as React components (requires react-native-svg).
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    compress: {
      reduce_funcs: false,
    },
  },
};

config.resolver = {
  ...config.resolver,
  assetExts: (config.resolver.assetExts || []).filter((ext) => ext !== "svg"),
  sourceExts: [...(config.resolver.sourceExts || ["js", "jsx", "ts", "tsx"]), "svg"],
};

// Reduce file system lookups for better performance
config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'app'),
];

module.exports = config;
