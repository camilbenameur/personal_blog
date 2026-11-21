---
title: "MCP isn't dead: what Code Mode changes, and what it moves"
description: "Instead of calling MCP tools one by one, the model writes a small program that calls them in a sandbox. The numbers from Cloudflare and Anthropic, and the two problems this setup moves: the sandbox and human approval."
author: "Camil Benameur"
pubDate: 2026-11-21
tags: ["llm", "agents", "mcp", "sandbox", "security"]
slug: "mcp-code-mode"
lang: "en"
draft: false
---

Content on several platforms says "RIP MCP". The protocol is fine. What changes is how the model uses it. Here is the idea, the published numbers, and what I take from it as someone who builds sandboxes for agents.

## The problem: one round trip per tool

With MCP, an agent discovers tools and calls them. You ask "find the customer Rahul and list his orders". The model calls `find_customer`, the result comes back into its context, it reads it, then it calls `list_orders` with the ID, and that result comes back into the context too.

Two costs add up:

- **Every step is a model turn.** A task with twenty calls means twenty inferences, and every intermediate result goes through the context, even the ones the model only needs to pull an ID out of.
- **The tool list fills the context before the work starts.** Each tool comes with its name, description and schema. With a few tools, that is negligible. With thousands, the list no longer fits.

## The idea: the model writes the program

Cloudflare called this [Code Mode](https://blog.cloudflare.com/code-mode/) in September 2025. The MCP tools are shown to the model as a TypeScript API. Instead of calling the tools one by one, the model writes a small program that chains them:

```ts
const client = await crm.findCustomer({ name: "Rahul" });
const orders = await crm.listOrders({ customerId: client.id });
return orders.filter(o => o.status === "open").map(o => o.id);
```

The program runs in a sandbox. The intermediate results stay inside the program. Only what it returns goes back to the model.

Cloudflare's guess at why this works: models have seen a huge amount of real code in training, and only a few contrived examples of tool calls. Writing a loop and a filter comes more naturally to them than chaining twenty structured calls.

## The published numbers

- **Cloudflare, February 2026.** The [Cloudflare API MCP server](https://blog.cloudflare.com/code-mode-mcp/) covers more than 2,500 endpoints with only two tools, `search()` and `execute()`, about 1,000 tokens. The model writes JavaScript to search the OpenAPI spec, then to call the API. According to Cloudflare, an equivalent server that exposed each endpoint as a tool would use 1.17 million tokens.
- **Anthropic, November 2025.** In ["Code execution with MCP"](https://www.anthropic.com/engineering/code-execution-with-mcp), one example workflow goes from 150,000 to 2,000 tokens. A few weeks later, Anthropic added [Programmatic Tool Calling](https://www.anthropic.com/engineering/advanced-tool-use) to its API: Claude writes a Python script that calls your tools from a sandboxed execution environment. On complex research tasks, average usage drops from 43,588 to 27,297 tokens (−37%).
- **goose (Block), December 2025.** Version 1.17.0 adds a [Code Mode](https://goose-docs.ai/blog/2025/12/15/code-mode-mcp) extension that presents the enabled MCP extensions as JavaScript modules.

Read these numbers for what they are. The 1.17 million compares against a server that exposes 2,500 tools at once, which nobody would do. The 150,000 → 2,000 is one chosen workflow. The −37%, measured over a set of tasks, is more representative. For an agent with five tools making three calls, the gain is small.

## What does not change: MCP

The goose team wrote a post with a clear title: [Code Mode Doesn't Replace MCP](https://goose-docs.ai/blog/2025/12/21/code-mode-doesnt-replace-mcp). The tools the program calls are still MCP tools. Discovery, authentication and transport still go through the protocol. What changes is who orchestrates the calls: the model, turn by turn, or a program it wrote.

## What Code Mode moves

The token savings come at a price. Anthropic says so in the same article: running agent-written code needs a secure environment, with sandboxing, resource limits and monitoring, which direct tool calls avoid. Two problems move.

**The sandbox becomes the critical component.** The program is written by a model that may have just read a booby-trapped page. So you have to assume it can be hostile. Cloudflare runs the code in a V8 isolate with no file system, no environment variables to leak, and no outbound network by default; outbound requests go through a handler you control. That is the right reflex: the program sees no secret and no network, and every call leaves through a point where a rule can be applied. It is also the principle behind [sandmeter](https://github.com/camilbenameur/sandmeter), the agent sandbox I am building from Linux primitives and gVisor.

**Human approval loses its granularity.** With one tool per action, you can decide that `delete_zone` or `send_message` needs a confirmation and the rest does not. With a single `execute()`, one call can chain ten actions, with an irreversible one in the middle of a loop. If you approve the whole call, you approve a program you do not read. In [the lock that holds back my AI's Telegram sends](/blog/ai-telegram-lock/), all of the safety came from every send going through a checkpoint written in plain code. With Code Mode, that checkpoint has to live in the bridge between the sandbox and the tools: every outbound call from the program is checked against a fixed rule, and irreversible actions stay blocked until someone confirms them.

## What I take from it

- Code Mode pays off when there are many tools, or many chained calls whose intermediate results the model does not need. For a small agent, the classic setup stays easier to read and debug.
- It does not remove MCP. It adds an execution environment between the model and the tools.
- The control has to happen where the program touches the outside world: on each outbound call, not at the entrance to `execute()`.

## Sources

- Cloudflare, [Code Mode: the better way to use MCP](https://blog.cloudflare.com/code-mode/), 26 September 2025
- Cloudflare, [Code Mode: give agents an entire API in 1,000 tokens](https://blog.cloudflare.com/code-mode-mcp/), 20 February 2026
- Anthropic, [Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp), 4 November 2025
- Anthropic, [Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use), 24 November 2025
- goose, [Code Mode MCP in goose](https://goose-docs.ai/blog/2025/12/15/code-mode-mcp), 15 December 2025, and [Code Mode Doesn't Replace MCP](https://goose-docs.ai/blog/2025/12/21/code-mode-doesnt-replace-mcp), 21 December 2025
