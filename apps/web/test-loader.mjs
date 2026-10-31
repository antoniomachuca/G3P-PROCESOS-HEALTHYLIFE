import { transformSync } from "esbuild";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
      const basePath = specifier.startsWith("/") ? specifier : path.resolve(parentDir, specifier);
      for (const ext of EXTENSIONS) {
        const candidate = basePath + ext;
        try {
          const s = await stat(candidate);
          if (s.isFile()) {
            return {
              url: pathToFileURL(candidate).href,
              shortCircuit: true,
            };
          }
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".tsx") || (url.endsWith(".ts") && !url.includes("node_modules"))) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, "utf8");
    const isTsx = url.endsWith(".tsx");
    const transformed = transformSync(source, {
      loader: isTsx ? "tsx" : "ts",
      jsx: "automatic",
      format: "esm",
      target: "es2022",
    });
    return {
      format: "module",
      shortCircuit: true,
      source: transformed.code,
    };
  }
  return nextLoad(url, context);
}
