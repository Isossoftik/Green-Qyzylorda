import { openSync, closeSync } from "node:fs";
closeSync(openSync("prisma/demo.db", "a"));
