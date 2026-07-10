import requests
import json

body = {
    "novel_id": 2,
    "template_id": 5,
    "llm_config_id": 4,
    "script_id": 1
}

print("发送请求...", flush=True)
try:
    response = requests.post(
        "http://127.0.0.1:8000/api/storyboards/generate",
        json=body,
        timeout=600
    )
    print(f"状态码: {response.status_code}", flush=True)
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}", flush=True)
except Exception as e:
    print(f"错误: {type(e).__name__}: {e}", flush=True)
