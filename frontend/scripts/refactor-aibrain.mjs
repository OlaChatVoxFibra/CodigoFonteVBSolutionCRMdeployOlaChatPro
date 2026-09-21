import fs from "fs";

const path = new URL("../src/pages/AiBrain/index.js", import.meta.url);
let src = fs.readFileSync(path, "utf8");

src = src.replace(/const useStyles = makeStyles\([\s\S]*?\}\);\n\n/, "");

src = src.replace(/classes\./g, "b.");

src = src.replace(
  /export default function AiBrain\(\{ embedded = false, onClose, contextSuggestions, pageContext \}\) \{\n  const b = useStyles\(\);\n  const \{ ui \} = useAppTranslation\(\);\n  const theme = useTheme\(\);\n  const isDark = theme\.palette\.type === "dark";\n  const isMobile = useMediaQuery\(theme\.breakpoints\.down\("sm"\)\);\n  const isXs = useMediaQuery\(theme\.breakpoints\.down\("xs"\)\);/,
  `export default function AiBrain({ embedded = false, onClose, contextSuggestions, pageContext }) {
  const { ui } = useAppTranslation();
  const isDark = useIsDarkMode();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const isXs = useMediaQuery("(max-width: 480px)");`
);

fs.writeFileSync(path, src);
console.log("refactored", src.split("\n").length, "lines");
