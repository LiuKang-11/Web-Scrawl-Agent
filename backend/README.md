## Steps

```bash
cd "/Users/liuzitang/Desktop/Side Projects/AutoTest/Web Agent/backend"
source .venv312/bin/activate
```

```bash
python explorer.py "https://example.com" \
  --max-states 5 \
  --strategy bfs \
  --no-llm-rerank \
  --output graph.json
```

or

```bash
python explorer.py "https://example.com" \
  --max-states 5 \
  --strategy bfs \
  --headed \
  --no-llm-rerank \
  --output graph.json
```
