<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# This is also NOT the Hardhat you know

`contracts/` uses **Hardhat 3**, not Hardhat 2 — different config format
(`defineConfig` from `hardhat/config`, `plugins` array), viem instead of
ethers by default, `node:test` instead of Mocha for TypeScript tests, no
`@nomicfoundation/hardhat-toolbox` (that package explicitly refuses to run on
Hardhat 3 — use `@nomicfoundation/hardhat-toolbox-viem`). Check
`contracts/node_modules/hardhat/templates/hardhat-3/` before writing config,
tests, or deploy scripts.
