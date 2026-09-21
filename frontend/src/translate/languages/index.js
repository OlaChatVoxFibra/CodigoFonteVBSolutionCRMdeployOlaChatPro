import { messages as portugueseMessages } from "./pt";
import { messages as englishMessages } from "./en";
import { messages as spanishMessages } from "./es";
import { messages as arabicMessages } from "./ar";
import { messages as turkishMessages } from "./tr";
import { mergeModuleMessages } from "../moduleMessages";

const messages = mergeModuleMessages({
  ...portugueseMessages,
  ...englishMessages,
  ...spanishMessages,
  ...arabicMessages,
  ...turkishMessages,
  "pt-BR": portugueseMessages.pt,
});

export { messages };
