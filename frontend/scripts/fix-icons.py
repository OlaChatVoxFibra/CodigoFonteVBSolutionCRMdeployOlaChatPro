from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/pages/Prompts/AgentActionsTab.js"
text = p.read_text(encoding="utf-8")

hero_old = """          <motion.div className={classes.heroIconRing}>
            <div className={classes.heroIcon}>
              <Sparkles size={22} strokeWidth={1.5} />
            </motion.div>
          </motion.div>"""

hero_old2 = """          <div className={classes.heroIconRing}>
            <div className={classes.heroIcon}>
              <Sparkles size={22} strokeWidth={1.5} />
            </motion.div>
          </motion.div>"""

hero_new = """          <div className={classes.heroIconWrap}>
            <Sparkles size={26} strokeWidth={1.5} />
          </motion.div>"""

for block in (hero_old, hero_old2):
    if block in text:
        text = text.replace(block, hero_new)
        break
else:
    print("hero not found")

card_old = """                  <div
                    className={classes.cardIconRing}
                    style={{
                      background: `linear-gradient(145deg, ${iconStyleForAction(action).glow}, transparent)`
                    }}
                  >
                    <div
                      className={classes.cardIcon}
                      style={{ background: iconStyleForAction(action).gradient }}
                    >
                      {IconCmp ? <IconCmp size={18} strokeWidth={1.75} /> : <Zap size={18} />}
                    </div>
                  </div>"""

card_new = """                  <div
                    className={classes.cardIconWrap}
                    style={{ color: iconStyleForAction(action).iconColor || "#6366f1" }}
                  >
                    {IconCmp ? <IconCmp size={20} strokeWidth={1.75} /> : <Zap size={20} />}
                  </motion.div>"""

if card_old in text:
    text = text.replace(card_old, card_new)
else:
    print("card not found")

p.write_text(text, encoding="utf-8")
print("ok")
