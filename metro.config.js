// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

// O better-auth (e plugins) usa o campo "exports" do package.json. O Metro nao
// resolve package exports por padrao, o que causava "Requiring unknown module"
// ao carregar o authClient. Habilitar isso corrige a resolucao.
config.resolver.unstable_enablePackageExports = true

module.exports = config
