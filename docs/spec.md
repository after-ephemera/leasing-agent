# **Candidate Take‑Home Exercise: "Mini Leasing Assistant API"**

> **Timebox:** 2–4 **focused hours**. We’re evaluating signal‑to‑noise, not who can burn a weekend.
> 

### Why We Ask You To Build This

Zuma’s mission is to remove friction from the **lead‑to‑lease** journey with an AI assistant tenants *love* and leasing teams *trust*. This mini‑project mirrors a sliver of that workflow so we can understand how you:

- break down product requirements into a thin, testable MVP;
- make pragmatic architecture choices under time pressure; and
- communicate trade‑offs.

You’ll walk us through your solution during a follow‑up live session, so **understand every line -** whether or not you used AI tools to scaffold.

Note: Please read the *what to deliver* section before you attempt to solve this take-home exercise.

### 1 · Scenario

A prospective renter sends a free‑text message (email or SMS). Your micro‑service must:

1. Decide which **domain tool(s)** to call to fetch information.
2. Craft a human‑ready **reply**.
3. **Return a next‑action** the front‑end can execute.

### 2 · API Contract

- **Endpoint** → `POST /api/reply`
- **Request** (example)
    
    ```
    {
      "lead": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "message": "Hi, is a 2‑bedroom still available and do you allow cats?",
      "preferences": {
        "bedrooms": 2,
        "move_in": "2025‑07‑01"
      },
      "community_id": "sunset‑ridge"
    }
    ```
    
- **Response**
    
    ```
    {
      "reply": "Hi Jane! Unit 12B is available and cats are welcome (one‑time $50 fee). Tours are open this Saturday 10 am–2 pm—does 11 am work?",
      "action": "propose_tour",
      "proposed_time": "2025‑06‑14T18:00:00Z"
    }
    
    * proposed_time is required only when action is propose_tour.
    ```
    

### The `action` Field (why & how)

`action` tells the calling UI what to do next. It can be **one** of:

| Action | When to use it | Example UI behavior |
| --- | --- | --- |
| `propose_tour` | You have enough info to suggest a tour slot | Show a “Confirm 11 am tour?” button |
| `ask_clarification` | The lead’s question is ambiguous or lacks key details | Ask follow‑up (“Which date works for you?”) |
| `handoff_human` | You can’t fulfil the request automatically (e.g., no vacancies) | Route to human agent |

The service **decides** the action—**the UI only executes** it.

### 3 · Required LLM‑Agent Logic

Build a lightweight **agent** that uses an LLM (OpenAI, Claude, Gemini, or a local model) to orchestrate **three domain tools**:

1. `check_availability(community_id, bedrooms)` → `{ "unit_id": "12B", "description": "3 bed 2.5 bath corner unit", … }`
2. `check_pet_policy(community_id, pet_type)` → `{ "allowed": true, "fee": 50, "notes": "Max 2 pets" }`
3. `get_pricing(community_id, unit_id, move_in_date)` → `{ "rent": 2495, "special": "1st month free" }`

**Requirements**

- Decide **if / when** (or whether) to invoke each tool.
- Chain outputs if needed (e.g., availability → pricing).
- Compose the `reply` string and choose the correct `action`.
- You may use function‑calling or your own planner / prompt routing.

***Follow‑up***: During the live extension we’ll ask you to add an extra capability, so design for easy growth, and understand your code deeply.

### 4 · Data & Observability

- Provide a mock inventory (2–3 units) + tour slots. In‑memory objects or SQLite are fine.
- Log at minimum: `request_id`, tool names & args, tool responses, and LLM latency/token usage (if available).

### 5 · What to Deliver

1. **React (TypeScript) Front‑End** – chat workspace with message list and input bar.
2. **Back‑End** – Express/FastAPI endpoints that accept chat messages, invoke your agent logic, stream or POST the reply back to the UI.
3. **DB (PostgreSQL preferred)** – tables for user prefs and generated replies. In‑memory SQLite is acceptable.
4. **LLM Agent Infrastructure** – orchestration layer plus three domain tools:
    - `check_availability(community_id, bedrooms)`
    - `check_pet_policy(community_id, pet_type)`
    - `get_pricing(community_id, unit_id, move_in_date)`

For a truly Agentic workflow, you may also implement this using an Orchestrator agent that delegates tasks to sub agents to handle a specific tool.

Your final submission must include the following:

| Item | Details |
| --- | --- |
| **Source Code** | Typescript preferred (any language accepted). Keep it idiomatic and modular |
| **Tests** | ≥ **4** unit tests: availability success, pet policy, pricing, no availability scenario. Include a quick‑run script or `make test`. |
| **README** | Setup, how the agent works (diagram or bullets), trade‑offs, what you’d do next with more time. |

### 6 · Ground Rules

- **AI tooling encouraged**—just be ready to explain every line.
- Clarity > cleverness: a small, well‑tested slice beats a big, buggy one.
- Stubbing external services (email/SMS) is fine. Use env vars for any API keys.

### 7 · Submission

Push to a public GitHub repo (or send a ZIP) containing code, tests, and README.

### 8 · Evaluation Rubric (20 pts)

| Area | Pts | What We Look For |
| --- | --- | --- |
| **Full‑Stack Architecture** | 5 | Clear separation of FE, API, agent, DB layers; env‑configurable keys |
| **Agent Design & Reasoning** | 5 | Correct tool calls, structured prompts, edge‑case handling |
| **Correctness & Action Choice** | 3 | Reply & `action` match each scenario |
| **Code Quality & Style** | 3 | Clean, idiomatic, modular |
| **Tests & Observability** | 2 | Meaningful tests, logging, request IDs, other relevant metrics |
| **Prompt Craft & Safety** | 1 | Clear system/user prompts, basic jailbreak resistance |
| **Communication** | 1 | README explains trade‑offs, next steps |

> Tip: A solid, well‑reasoned agent with clear docs will stand out more than bells & whistles without explanation.
>