const fs = require("fs");
const p = require("path").join(__dirname, "../src/pages/Prompts/AgentActionsTab.js");
let s = fs.readFileSync(p, "utf8");

const heroOld = `          <div className={classes.heroIconRing}>
            <motion.div className={classes.heroIcon}>
              <Sparkles size={22} strokeWidth={1.5} />
            </motion.div>
          </motion.div>`;

// actual file content from read
const heroActual = `          <div className={classes.heroIconRing}>
            <div className={classes.heroIcon}>
              <Sparkles size={22} strokeWidth={1.5} />
            </motion.div>
          </motion.div>`;

const heroNew = `          <div className={classes.heroIconWrap}>
            <Sparkles size={26} strokeWidth={1.5} />
          </motion.div>`;

if (s.includes("heroIconRing")) {
  s = s.replace(heroActual, heroNew.replace(/<\/motion\.div>$/, "</motion.div>").replace("motion.div", "motion.div"));
}
// simpler
s = s.replace(
  /          <div className=\{classes\.heroIconRing\}>[\s\S]*?<Sparkles size=\{22\}[\s\S]*?<\/motion.div>\s*<\/motion.div>/,
  `          <div className={classes.heroIconWrap}>
            <Sparkles size={26} strokeWidth={1.5} />
          </motion.div>`
);

s = s.replace(
  /                  <div\s+className=\{classes\.cardIconRing\}[\s\S]*?\{IconCmp \? <IconCmp size=\{18\}[\s\S]*?<\/motion.div>\s*<\/motion.div>/,
  `                  <div
                    className={classes.cardIconWrap}
                    style={{ color: iconStyleForAction(action).iconColor || "#6366f1" }}
                  >
                    {IconCmp ? <IconCmp size={20} strokeWidth={1.75} /> : <Zap size={20} />}
                  </motion.div>`
);

s = s.replace(/<\/motion\.motion.div>/g, "</div>");
s = s.replace(/<motion\.div/g, "<div");
s = s.replace(/heroIconRing/g, "heroIconWrap");
s = s.replace(/classes\.heroIcon\b/g, "classes.heroIconWrap");
s = s.replace(/cardIconRing/g, "cardIconWrap");

fs.writeFileSync(p, s);
console.log("done");
