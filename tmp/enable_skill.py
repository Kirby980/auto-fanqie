import json
import os

config_path = os.path.expanduser("~/.openclaw/openclaw.json")
with open(config_path, 'r') as f:
    config = json.load(f)

if "skills" not in config:
    config["skills"] = {}
if "entries" not in config["skills"]:
    config["skills"]["entries"] = {}

# Ensure it's enabled
config["skills"]["entries"]["fanqie-publisher"] = {
    "enabled": True
}

# Also let's fix the model again just in case the user reverted it again or it wasn't saved!
if "agents" in config and "defaults" in config["agents"] and "model" in config["agents"]["defaults"]:
    config["agents"]["defaults"]["model"]["primary"] = "google-gemini-cli/gemini-2.0-flash"

if "agents" in config and "defaults" in config["agents"] and "models" in config["agents"]["defaults"]:
    if "google-gemini-cli/gemini-3.1-flash-lite-preview" in config["agents"]["defaults"]["models"]:
        del config["agents"]["defaults"]["models"]["google-gemini-cli/gemini-3.1-flash-lite-preview"]

for agent in config.get("agents", {}).get("list", []):
    if agent.get("id") == "main":
        agent["model"] = "google-gemini-cli/gemini-2.0-flash"

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
