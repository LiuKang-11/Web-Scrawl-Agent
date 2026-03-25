
# Quick run notes

## Install
```bash
pip install playwright openai
playwright install
```

## Set environment variables
```bash
export OPENAI_API_KEY="your_key"
export OPENAI_MODEL="gpt-4.1-mini"
export TARGET_URL="https://example.com"
```

Optional login fields:
```bash
export LOGIN_USERNAME="user"
export LOGIN_PASSWORD="pass"
export LOGIN_USERNAME_SELECTOR='input[name="email"]'
export LOGIN_PASSWORD_SELECTOR='input[name="password"]'
export LOGIN_SUBMIT_SELECTOR='button[type="submit"]'
```

## Run
```bash
python main.py
```

Output:
- `agent_output/graph.json`
- `agent_output/screenshots/*.png`
