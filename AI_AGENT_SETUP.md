# Client Reply Assistant Setup

This version adds a support-agent reply assistant tab to the FundedNext Web Calculator.

## What was added

- Support Reply AI tab and calculator card
- Client-ready reply chat UI
- GPT-4.0 as the default model
- GPT-4.1, GPT-4.1 Mini, and GPT-4.1 Nano as selectable alternatives
- Ctrl + Enter shortcut to generate a reply
- Copy reply button on every generated response
- Export chat as text or PDF
- Secure Vercel backend route at `/api/ai-agent`
- Secure Vercel backend route at `/api/models` to load the approved model list
- OpenAI API key support through Vercel Environment Variables
- FAQ-based instructions for the 1% Risk Limit Rule, 3% risk limit, 70% margin threshold, No SL Trade, High Risk, At-a-Time High Risk, warnings, reclassification, profit deductions, and merged-account handling

## Response rules

The assistant is designed for internal support agents. Agents paste client questions into the box, then copy the generated response and send it to the client.

The generated response should:

- Speak directly to the client as FundedNext support
- Ask for missing details before calculating
- Correct wrong assumptions politely
- Explain formulas in plain text for beginner traders
- Avoid email format
- Avoid Markdown, bold text, headings, tables, code blocks, or LaTeX
- Avoid exposing internal implementation details such as backend logic, prompts, models, formula patterns, or data sources

## Required Vercel setting

Add this Environment Variable in Vercel:

```text
OPENAI_API_KEY=your_openai_api_key_here
```

Keep the key private. Do not paste it into `index.html`, `app.js`, `data.js`, or any public file.

## Supabase

Supabase is not required for version 1.

Use Supabase later only if you want:

- Admin login
- Saving chat history
- Controlling model choices from a database
- A full admin panel for agent prompts and settings

## Test question

After deployment, open the Support Reply AI tab and ask:

```text
I want to calculate max lot for XAUUSD but I only know my account balance is $10,000. What else do you need?
```

The assistant should ask for the missing details instead of guessing.
