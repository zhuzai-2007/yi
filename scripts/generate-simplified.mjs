import { readFile, writeFile } from "node:fs/promises";
import { Converter } from "opencc-js";
const convert = Converter({ from: "t", to: "cn" });
const entries = {};
function collect(value) {
  // In this corpus 乾 is the hexagram/qián reading, including 乾乾, never dry/gān.
  if (typeof value === "string" && /[\u3400-\u9fff]/.test(value))
    entries[value] = value
      .split("乾")
      .map((part) => convert(part))
      .join("乾");
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, child]) => {
      if (key !== "source") collect(child);
    });
}
for (const file of ["hexagrams", "related"])
  collect(JSON.parse(await readFile(`lib/iching/data/${file}.json`, "utf8")));
const output = JSON.stringify(entries, null, 2) + "\n";
const path = "lib/iching/data/simplified.json";
if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== output)
    throw new Error("简体数据已过期，请运行 npm run data:simplify");
} else await writeFile(path, output);
console.log(
  `OpenCC: ${Object.keys(entries).length} source strings verified/generated; originals preserved.`,
);
