# Argos Project Instructions
Critical Rule: Before generating or modifying any Uniswap v4 hook logic, you MUST cross-reference the vulnerability patterns and security constraints defined in docs/V4_SECURITY_SKILL.md
This repo builds the Argos Uniswap v4 hook on Unichain.

## Mission

Argos is a specialized-market Uniswap v4 hook for LST pools on Unichain. Its MVP enforces a local risk state at `beforeSwap`, supports an authorized callback path for state updates, allows swaps in the safe state, and blocks or restricts swaps in elevated-risk states.

The stretch goal is to park exact-input swaps with custom accounting and ERC-6909 claims, then settle them later when conditions normalize.

The current repository still contains the stock `Counter` example from the v4 template. Treat those files as scaffolding, not product logic. New product code should center on `Argos.sol`, `test/Argos.t.sol`, and matching deploy or interaction scripts.

## Hard Rules

- Primary hook point: `beforeSwap` only.
- Hook permissions: enable only `BEFORE_SWAP_FLAG` and `BEFORE_SWAP_RETURNS_DELTA_FLAG`.
- Core MVP behavior: local risk-state enforcement with an authorized risk-update callback path.
- Stretch behavior: custom-accounting park-and-settle for exact-input swaps using ERC-6909 claims.
- Security baseline: follow Uniswap v4 NoOp and ReturnDelta safety patterns.
- Prioritize security and minimal viable behavior before demo polish.
- Target environment: Foundry, Unichain, and a clear Reactive integration story.
- Testing rule: no logic change without matching coverage in `test/Argos.t.sol`.
- Formatting rule: run `forge fmt` before finalizing code.

## Implementation Boundaries

- Do not add `afterSwap`, liquidity hooks, donate hooks, or unrelated permissions.
- Do not introduce alternate order types or routing logic unless the spec explicitly calls for them.
- Do not leave template naming in production code once Argos files exist.
- Keep changes minimal and local to the hook, tests, and deployment scripts needed for Argos.

## Expected File Direction

- Product contract: `src/Argos.sol`
- Main tests: `test/Argos.t.sol`
- Optional helper libraries: `src/libraries/` or `test/utils/`
- Deployment script: adapt `script/00_DeployHook.s.sol` for Argos flags and constructor args
- Pool setup and swap scripts: update only as needed to exercise Argos on local or Sepolia environments

## Hook Design Constraints

- `beforeSwap` must be the decision point for allow, restrict, or reject behavior.
- Safe state should prefer the NoOp path and return a zero delta.
- Elevated-risk behavior must be explicit: revert or apply a bounded restriction.
- Any returned delta must preserve pool accounting invariants and be backed by explicit tests.
- The risk-update path must be explicitly authorized and testable.
- Avoid assumptions that only work for a single pool unless the code stores state per pool by design.

## Testing Expectations

Minimum test coverage should include:

- permission bits and mined hook address flags
- happy-path swap in safe state
- blocked or restricted swap behavior in elevated-risk state
- authorized and unauthorized risk-update handling
- malformed or unsupported state transitions
- invariant-style checks around deltas, balances, and accounting
- edge cases around threshold or restriction boundaries and repeated calls

## Working Conventions For AI Tools

- Read the current repo before editing because this started from the generic v4 template.
- Prefer small, reviewable patches over broad rewrites.
- If spec and code disagree, update the code toward the spec or call out the conflict explicitly.
- If a behavior affects swap accounting, add or extend tests before considering the task complete.
- Surface any ambiguity around restriction semantics, callback authority, or future ERC-6909 custody before guessing silently.

## Definition Of Done

A task is not complete unless all of the following are true:

- the behavior is implemented in Argos-specific code
- `test/Argos.t.sol` covers the change
- formatting has been run with `forge fmt`
- scripts and constructor args remain consistent with the active hook permissions

### RULE: THE REMOTION SANDBOX (MISSION 6)
- All video rendering and Remotion code MUST be generated inside a strictly isolated directory named `/demo-video`.
- NEVER install Remotion dependencies in the root directory or the `/frontend` directory.
- NEVER modify any files in `/src`, `/test`, `/script`, or `/frontend` while working on the Remotion video. 
- The Remotion project is an independent visual asset, not part of the core protocol.