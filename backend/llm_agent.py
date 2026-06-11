"""
Layer 3 & 4: LLM Intelligence + Analysis
Uses Claude to label critical flows, detect risks, and generate test cases.
"""

import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-opus-4-5"


# ------------------------------------------------------------------ #
#  Flow Labeling (Layer 3)                                             #
# ------------------------------------------------------------------ #

def label_critical_flows(graph: dict) -> dict:
    """
    Given the graph JSON, ask Claude to identify and label critical user flows.
    Returns: { flows: [ { name, path, risk_level, description } ] }
    """
    nodes_summary = [
        {"id": n["state_id"], "url": n["url"], "title": n["title"]}
        for n in graph["nodes"]
    ]
    edges_summary = [
        {
            "from": e["from_state"],
            "to": e["to_state"],
            "action": e["action_description"],
        }
        for e in graph["edges"] if e["success"]
    ]

    prompt = f"""You are a QA architect analyzing a web application's state graph.

NODES (states):
{json.dumps(nodes_summary, indent=2)}

EDGES (transitions):
{json.dumps(edges_summary, indent=2)}

Tasks:
1. Identify all meaningful user flows (e.g., signup, login, checkout, password reset).
2. For each flow, list the state IDs in order.
3. Rate each flow's risk level: critical | high | medium | low.
4. Note any suspicious or missing transitions (e.g., missing auth guard before checkout).

Respond ONLY with valid JSON matching this schema:
{{
  "flows": [
    {{
      "name": "string",
      "description": "string",
      "path": ["state_id", ...],
      "risk_level": "critical|high|medium|low",
      "notes": "string"
    }}
  ],
  "missing_flows": ["string"],
  "security_concerns": ["string"]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ------------------------------------------------------------------ #
#  Coverage Analysis (Layer 4)                                         #
# ------------------------------------------------------------------ #

def analyze_coverage(graph: dict, flows: dict) -> dict:
    """
    Analyze which states/transitions are covered by identified flows.
    Returns coverage metrics and untested paths.
    """
    all_state_ids = {n["state_id"] for n in graph["nodes"]}
    covered_states = set()
    for flow in flows.get("flows", []):
        covered_states.update(flow.get("path", []))

    uncovered = all_state_ids - covered_states
    coverage_pct = round(len(covered_states) / max(len(all_state_ids), 1) * 100, 1)

    # Failed transitions (risky paths)
    failed = [e for e in graph["edges"] if not e["success"]]
    risky = [e for e in graph["edges"] if e["success"] and
             any(kw in e["action_description"].lower()
                 for kw in ["auth", "login", "password", "payment", "admin"])]

    return {
        "total_states": len(all_state_ids),
        "covered_states": len(covered_states),
        "coverage_pct": coverage_pct,
        "uncovered_state_ids": list(uncovered),
        "failed_transitions": len(failed),
        "risky_transitions": len(risky),
        "risky_transition_details": [
            {"from": e["from_state"], "to": e["to_state"],
             "action": e["action_description"]} for e in risky[:5]
        ],
    }


# ------------------------------------------------------------------ #
#  Test Case Generation (Layer 4)                                      #
# ------------------------------------------------------------------ #

def generate_tests(graph: dict, flows: dict, coverage: dict) -> dict:
    """
    Generate Playwright test cases for each critical flow.
    Returns: { test_suites: [ { flow_name, test_cases: [ { name, code } ] } ] }
    """
    nodes_map = {n["state_id"]: n for n in graph["nodes"]}

    test_suites = []
    for flow in flows.get("flows", []):
        path_details = []
        for sid in flow.get("path", []):
            node = nodes_map.get(sid, {})
            path_details.append({
                "state": sid,
                "url": node.get("url", ""),
                "title": node.get("title", ""),
            })

        prompt = f"""You are a senior QA engineer. Generate Playwright (TypeScript) test cases for:

Flow: {flow['name']}
Description: {flow['description']}
Risk: {flow['risk_level']}
Path: {json.dumps(path_details, indent=2)}
Notes: {flow.get('notes', '')}
Security concerns: {json.dumps(flows.get('security_concerns', []))}

Generate 2-3 test cases covering:
- Happy path
- Edge case or negative test (if risk is high/critical)
- Boundary/auth test if relevant

Respond ONLY with valid JSON:
{{
  "test_cases": [
    {{
      "name": "string",
      "type": "happy_path|negative|boundary|security",
      "code": "// Playwright TS test code here"
    }}
  ]
}}"""

        response = client.messages.create(
            model=MODEL,
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith(("json", "typescript", "ts")):
                raw = raw.split("\n", 1)[1]
        try:
            tests = json.loads(raw.strip())
        except json.JSONDecodeError:
            tests = {"test_cases": []}

        test_suites.append({
            "flow_name": flow["name"],
            "risk_level": flow["risk_level"],
            "test_cases": tests.get("test_cases", []),
        })

    return {"test_suites": test_suites}


# ------------------------------------------------------------------ #
#  Security / Compliance Scan (Layer 4)                               #
# ------------------------------------------------------------------ #

def security_scan(graph: dict) -> dict:
    """
    Scan for security issues: missing auth guards, exposed admin pages,
    potential injection points, etc.
    """
    nodes_with_forms = [
        {"id": n["state_id"], "url": n["url"], "elements": n["interactive_elements"]}
        for n in graph["nodes"]
        if any(e.get("tag") in ("input", "form") for e in n.get("interactive_elements", []))
    ]

    prompt = f"""You are a security engineer reviewing a web app's state graph for vulnerabilities.

Pages with forms/inputs:
{json.dumps(nodes_with_forms, indent=2)}

All page URLs: {[n['url'] for n in graph['nodes']]}

Check for:
1. Missing authentication on sensitive pages (admin, payment, profile)
2. Input fields that may be vulnerable to XSS/injection
3. Missing CSRF protection signals
4. Sensitive data exposure in URLs
5. Auth bypass patterns

Respond ONLY with valid JSON:
{{
  "severity": "critical|high|medium|low",
  "issues": [
    {{
      "type": "string",
      "description": "string",
      "affected_states": ["state_id"],
      "severity": "critical|high|medium|low",
      "recommendation": "string"
    }}
  ]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw.strip())
    except Exception:
        return {"severity": "unknown", "issues": []}


# ------------------------------------------------------------------ #
#  Full pipeline                                                        #
# ------------------------------------------------------------------ #

def run_full_analysis(graph: dict) -> dict:
    print("🔍 Labeling critical flows...")
    flows = label_critical_flows(graph)

    print("📊 Analyzing coverage...")
    coverage = analyze_coverage(graph, flows)

    print("🧪 Generating test cases...")
    tests = generate_tests(graph, flows, coverage)

    print("🔒 Running security scan...")
    security = security_scan(graph)

    return {
        "flows": flows,
        "coverage": coverage,
        "tests": tests,
        "security": security,
    }


if __name__ == "__main__":
    import sys
    graph_file = sys.argv[1] if len(sys.argv) > 1 else "graph.json"
    with open(graph_file) as f:
        graph = json.load(f)

    result = run_full_analysis(graph)
    out = graph_file.replace(".json", "_analysis.json")
    with open(out, "w") as f:
        json.dump(result, f, indent=2)
    print(f"✓ Analysis saved to {out}")
    print(f"  Coverage: {result['coverage']['coverage_pct']}%")
    print(f"  Flows found: {len(result['flows'].get('flows', []))}")
    print(f"  Security issues: {len(result['security'].get('issues', []))}")
