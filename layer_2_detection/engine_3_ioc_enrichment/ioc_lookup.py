import json
import os
from .ioc_utils import normalize_text


_LAYER2_DIR = os.path.dirname(os.path.dirname(__file__))

# Prefer the populated feed shipped at the layer root; fall back to the
# mappings/ copy if present and non-empty. The original path pointed only at
# mappings/ioc_feed.json, which is an empty (0-byte) placeholder, so IOC
# matching never fired. Pick the first path that actually has content.
_CANDIDATE_FEEDS = [
    os.path.join(_LAYER2_DIR, "ioc_feed.json"),
    os.path.join(_LAYER2_DIR, "mappings", "ioc_feed.json"),
]


def _resolve_feed_path() -> str:
    for path in _CANDIDATE_FEEDS:
        try:
            if os.path.exists(path) and os.path.getsize(path) > 0:
                return path
        except OSError:
            continue
    return _CANDIDATE_FEEDS[0]


IOC_FEED_PATH = _resolve_feed_path()


def load_ioc_feed() -> list[dict]:
    if not os.path.exists(IOC_FEED_PATH):
        return []

    try:
        with open(IOC_FEED_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            data = json.loads(content)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def lookup_iocs(observables: dict) -> list[dict]:
    feed = load_ioc_feed()
    matches = []

    ip_set = set(observables.get("ips", []))
    domain_set = set(observables.get("domains", []))
    url_set = set(observables.get("urls", []))
    hash_set = set(observables.get("hashes", []))

    for entry in feed:
        observable = normalize_text(entry.get("observable"))
        obs_type = normalize_text(entry.get("type"))

        matched = False

        if obs_type == "ip" and observable in ip_set:
            matched = True
        elif obs_type == "domain" and observable in domain_set:
            matched = True
        elif obs_type == "url" and observable in url_set:
            matched = True
        elif obs_type == "hash" and observable in hash_set:
            matched = True

        if matched:
            matches.append({
                "observable": observable,
                "type": obs_type,
                "threat_type": entry.get("threat_type", "unknown"),
                "confidence": entry.get("confidence", 0.5),
                "source": entry.get("source", "local_ioc_feed")
            })

    return matches