path = r"c:\Users\Administrador\Downloads\VBSOLUTION\vbsolutionn\frontend\src\components\CreateLeadSaleModal\LeadFunnelChevron.js"
open(path, "w", encoding="utf-8").write(
    """import React from "react";

export default function LeadFunnelChevron({
  classes,
  stageOptions,
  status,
  onSelectStage,
  viewOnly,
  fullWidth
}) {
  if (!Array.isArray(stageOptions) || !stageOptions.length) return null;

  return (
    <div
      className={`${classes.funnelChevronWrap} ${
        fullWidth ? classes.funnelChevronWrapFull : ""
      }`}
    >
      <div className={classes.funnelChevronLabel}>Etapas do funil</div>
      <motion.div className={classes.funnelChevronTrackWrap}>
        <div className={classes.funnelChevronTrack} role="tablist" aria-label="Etapas do funil">
          {stageOptions.map((opt, idx) => {
            const active = String(status) === String(opt.value);
            const isLast = idx === stageOptions.length - 1;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={viewOnly}
                className={`${classes.funnelChevronStep} ${active ? classes.funnelChevronStepActive : ""} ${
                  isLast ? classes.funnelChevronStepLast : ""
                } ${idx === 0 ? classes.funnelChevronStepFirst : ""}`}
                style={{ zIndex: stageOptions.length - idx }}
                onClick={() => {
                  if (viewOnly) return;
                  onSelectStage?.(opt.value);
                }}
              >
                <span className={classes.funnelChevronStepText}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
""".replace("<motion.div", "<div").replace("</motion.div>", "</motion.div>")
)
print("done")
