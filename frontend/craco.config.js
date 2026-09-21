"use strict";

/**
 * CRA + Tailwind v4 (@tailwindcss/postcss) + fix clsx.
 */
const path = require("path");
const webpack = require("webpack");
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");

const FRONTEND_ROOT = __dirname;
const CLSX_ROOT = path.dirname(require.resolve("clsx/package.json", { paths: [FRONTEND_ROOT] }));
const CLSX_MJS = path.join(CLSX_ROOT, "dist/clsx.m.js");

const POSTCSS_PLUGINS = [
  require("@tailwindcss/postcss"),
  require("postcss-flexbugs-fixes"),
  require("postcss-preset-env")({
    autoprefixer: { flexbox: "no-2009" },
    stage: 3
  }),
  require("postcss-normalize")()
];

function patchPostcssLoaderOptions(loaderEntry) {
  if (!loaderEntry || typeof loaderEntry !== "object") return false;

  const loaderPath = loaderEntry.loader || "";
  if (typeof loaderPath !== "string" || !loaderPath.includes("postcss-loader")) {
    return false;
  }

  if (!loaderEntry.options || typeof loaderEntry.options === "string") {
    loaderEntry.options = {};
  }

  loaderEntry.options.postcssOptions = {
    ident: "postcss",
    config: false,
    plugins: POSTCSS_PLUGINS
  };

  return true;
}

function walkRules(rules, patched) {
  if (!Array.isArray(rules)) return;

  for (const rule of rules) {
    if (Array.isArray(rule.oneOf)) walkRules(rule.oneOf, patched);
    if (Array.isArray(rule.rules)) walkRules(rule.rules, patched);

    if (rule.loader && String(rule.loader).includes("postcss-loader")) {
      if (patchPostcssLoaderOptions(rule)) patched.count += 1;
    }

    if (!rule.use) continue;

    const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
    for (const entry of uses) {
      if (patchPostcssLoaderOptions(entry)) patched.count += 1;
    }
  }
}

function applyTailwindV4Postcss(webpackConfig) {
  const patched = { count: 0 };
  walkRules(webpackConfig.module?.rules, patched);

  if (patched.count === 0) {
    throw new Error(
      "craco: nenhum postcss-loader encontrado — Tailwind v4 não pode ser aplicado."
    );
  }
}

module.exports = {
  webpack: {
    configure(webpackConfig) {
      webpackConfig.plugins = (webpackConfig.plugins || []).filter((p) => {
        const name = p?.constructor?.name;
        const key = typeof p?.key === "string" ? p.key : "";
        return name !== "ESLintWebpackPlugin" && !key.startsWith("ESLintWebpackPlugin");
      });

      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/clsx[\\/]dist[\\/]clsx\.mjs$/, CLSX_MJS),
        new webpack.NormalModuleReplacementPlugin(/clsx[\\/]dist[\\/]clsx\.m\.js$/, CLSX_MJS)
      );

      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (plugin) => !(plugin instanceof ModuleScopePlugin)
      );

      webpackConfig.resolve.modules = [
        path.join(FRONTEND_ROOT, "node_modules"),
        ...(webpackConfig.resolve.modules || ["node_modules"])
      ];

      webpackConfig.resolve.alias = {
        ...(webpackConfig.resolve.alias || {}),
        clsx: path.join(CLSX_ROOT, "dist/clsx.js"),
        "clsx/dist/clsx.mjs": CLSX_MJS,
        "clsx/dist/clsx.m.js": CLSX_MJS
      };

      const rules = webpackConfig.module.rules || [];
      if (
        !rules.some(
          (r) =>
            r?.resolve?.fullySpecified === false &&
            r?.test?.toString?.().includes("m?js")
        )
      ) {
        rules.push({
          test: /\.m?js$/,
          include: /node_modules/,
          resolve: { fullySpecified: false }
        });
      }
      webpackConfig.module.rules = rules;

      applyTailwindV4Postcss(webpackConfig);

      return webpackConfig;
    }
  }
};
