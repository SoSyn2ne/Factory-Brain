import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"

const root = new URL("../content/", import.meta.url)
const forbiddenPath = /(^|\/)(private|secret|secrets|\.env|\.obsidian|40-session-logs|exports)(\/|$)/i
const sensitiveText = /(\/home\/sy\/|BEGIN (?:RSA|OPENSSH|PRIVATE) KEY|api[_-]?key\s*[:=]|password\s*[:=]|token\s*[:=])/i

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory.pathname, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(new URL(`file://${path}/`))))
    else files.push(path)
  }
  return files
}

const files = await walk(root)
const failures = []
for (const file of files) {
  const rel = relative(root.pathname, file)
  if (forbiddenPath.test(rel)) failures.push(`${rel}: forbidden path`)
  const text = await readFile(file, "utf8")
  if (sensitiveText.test(text)) failures.push(`${rel}: sensitive-looking text`)
}

if (failures.length) {
  console.error("Public boundary check failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Public boundary OK: ${files.length} content file(s) checked`)
