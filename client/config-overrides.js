module.exports = function override(config, env) {
  config.module.rules = [...config.module.rules,
  {
    resolve: {
      alias: {
        "react/jsx-dev-runtime": "react/jsx-dev-runtime.js",
        "react/jsx-runtime": "react/jsx-runtime.js"
      }
    }
  }
  ]
  //do stuff with the webpack config...
  return config;
}
