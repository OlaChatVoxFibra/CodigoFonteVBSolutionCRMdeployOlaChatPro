import fs from "fs";

const path = new URL("../src/pages/AiBrain/index.js", import.meta.url);
let src = fs.readFileSync(path, "utf8");

src = src.replace(/<Tooltip /g, "<BrainTooltip ");
src = src.replace(/<\/Tooltip>/g, "</BrainTooltip>");

src = src.replace(
  /<IconButton([^>]*)>([\s\S]*?)<\/IconButton>/g,
  "<button type=\"button\" className={b.iconBtnPlain}$1>$2</button>"
);

src = src.replace(
  /<Chip label=\{([^}]+)\} size="small" style=\{[^}]+\} \/>/g,
  "<Badge size=\"md\">{$1}</Badge>"
);

src = src.replace(
  /<CircularProgress size=\{(\d+)\} style=\{[^}]+\} \/>/g,
  "<Spinner size={$1} />"
);

src = src.replace(
  /<CircularProgress size=\{(\d+)\} \/>/g,
  "<Spinner size={$1} />"
);

src = src.replace(
  /<Box display="flex" justifyContent="center" py=\{2\}>/g,
  '<div className={b.loadingCenter}>'
);
src = src.replace(/<\/Box>/g, "</div>");

src = src.replace(
  /<Typography variant="caption" color="textSecondary" style=\{[^}]+\}>/g,
  '<span className={b.sidebarEmpty}>'
);
src = src.replace(/<\/Typography>/g, "</span>");

src = src.replace(/ color=\{theme\.palette\.text\.secondary\}/g, "");
src = src.replace(/ color=\{voicePanelOpen \? ACCENT : theme\.palette\.text\.secondary\}/g, " color={voicePanelOpen ? ACCENT : undefined}");

src = src.replace(
  /style=\{\{ textAlign: "center", color: theme\.palette\.text\.secondary \}\}/g,
  'className={b.sidebarEmpty}'
);

src = src.replace(
  /<div className=\{embedded \? b\.rootEmbedded : b\.root\}>/,
  "<TooltipProvider delayDuration={200}><div className={`${shellClass} ${embedded ? b.rootEmbedded : b.root}`}>"
);

src = src.replace(/\n\}\s*$/, "\n    </TooltipProvider>\n  );\n}\n");

// Fix double closing if wrong
src = src.replace(/<\/TooltipProvider>\n  \);\n\}\n\);/g, "</TooltipProvider>\n  );\n}");

fs.writeFileSync(path, src);
console.log("mui replacements done");
