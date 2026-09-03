# AI Revenue Recovery: Checkout Drop-off Agent

This project is an autonomous, auditable agent built to detect checkout drop-offs, determine the root cause, and intelligently intervene to recover lost revenue. 

Unlike traditional "one-size-fits-all" abandoned cart emails, this agent routes differently based on the exact failure cause (e.g., `bank_timeout`, `insufficient_funds`, `pure_abandonment`) and respects strict, auditable stopping rules.

## Key Features & Differentiators

1. **Cause-Aware Recovery**: The rule engine triggers different interventions depending on the Razorpay error code (e.g., a delayed nudge for insufficient funds, vs. an immediate new link for a bank timeout).
2. **Explicit Gating & Stopping Rules**: Interventions are bounded by max retries, active cooldowns, and a global daily safety budget. The engine actively refuses to intervene if rules are violated, preventing spam.
3. **Promise-to-Pay Micro-Commitments**: For pure checkout abandonments, the agent captures lightweight "I'll pay in X hours" signals and tracks follow-through, automatically marking them as broken if time expires.
4. **Honest Measurement**: The dashboard doesn't just show the happy path. It explicitly visualizes "Wasted Attempts" and recovery rates by root cause, proving that the classifier matters.
5. **Human-Readable Audit Trail**: Every single state change (Ingestion → Classification → Decision → Action → Outcome) is recorded chronologically in the database and visible in the dashboard.

## Tech Stack
* **Backend**: FastAPI, SQLAlchemy, APScheduler (for background polling), SQLite
* **Frontend**: React, Vite, Tailwind CSS v4, Framer Motion, Recharts
* **Simulated Infra**: Fully mocked Razorpay webhooks and Payment Links API for easy, zero-config local testing.

## How to Run

You don't need any external API keys or complex database setups to demo this project. Everything is bundled.

1. Clone the repository.
2. Open a terminal in the root directory.
3. Run the start script:
   ```powershell
   .\start_all.ps1
   ```
   *This script launches the FastAPI backend, runs a synthetic batch of 50 drop-off scenarios, and starts the React frontend.*
4. Open [http://localhost:5173/](http://localhost:5173/) (or whichever port Vite selects) to view the live dashboard and audit logs!
