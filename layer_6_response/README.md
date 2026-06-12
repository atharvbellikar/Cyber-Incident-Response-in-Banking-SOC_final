# Response Layer

AI-assisted cyber incident response system for banking environments.

## Features
- Dynamic **Playbook Evolution Engine** generated via offline LLM (Llama 3.1)
- **Action Orchestration** with transaction-like semantics and rollback
- **Severity-Based Workflow Routing**
- **Smart Ticketing** with MITRE ATT&CK integration
- **Human-in-the-Loop (HITL)** approvals

## Setup

1. Start dependencies (Elasticsearch, Redis, Postgres, Ollama):
```bash
docker-compose up -d
```

2. Install python requirements:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `.env` if necessary.

4. Run tests:
```bash
pytest
```
