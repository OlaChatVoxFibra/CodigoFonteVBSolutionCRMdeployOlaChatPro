/**
 * Config única para IDE e `npx eslint` (não fica em package.json para não duplicar
 * com o ESLintWebpackPlugin do CRA + caminhos com caixa diferente no Windows).
 */
module.exports = {
  root: true,
  extends: ["react-app", "react-app/jest"]
};
