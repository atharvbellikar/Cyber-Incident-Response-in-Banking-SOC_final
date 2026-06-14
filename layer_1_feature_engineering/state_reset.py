"""
Feature-engine state reset.

The Layer-1 feature engines keep module-level baselines (per-source / per-user /
per-device event counts, rate windows, protocol sets, etc.) so that, within a
batch of logs, later events can be scored against earlier ones (temporal /
behavioural baselining). That state is *process-global*, so without resetting it
between pipeline runs it would:

  * make results non-deterministic (the same upload scores differently the 2nd
    time because the source is no longer "first seen"),
  * leak data across unrelated uploads / API requests,
  * grow unbounded in memory (every unique IP/user/device kept forever).

`reset_feature_state()` clears every store so each `/run-pipeline` invocation is
deterministic and self-contained. Within-batch baselining still works because the
reset happens once before the batch, not per event.
"""
from .engine_1_temporal import tsfresh_extractor
from .engine_2_behavioral import user_profiler, baseline_comparator
from .engine_3_statistical import pattern_detector, frequency_analyzer
from .engine_4_network import protocol_profiler
from .engine_5_web import http_analyzer, session_profiler
from .engine_6_iot import device_profiler, telemetry_analyzer

# (module, store-attribute-name) for every stateful baseline store.
_STORES = [
    (tsfresh_extractor, "_event_store"),
    (user_profiler, "_user_store"),
    (baseline_comparator, "_baseline_store"),
    (pattern_detector, "_pattern_store"),
    (frequency_analyzer, "_rate_store"),
    (protocol_profiler, "_protocol_store"),
    (http_analyzer, "_http_store"),
    (session_profiler, "_session_store"),
    (device_profiler, "_device_store"),
    (telemetry_analyzer, "_telemetry_store"),
]


def reset_feature_state() -> None:
    """Clear all per-entity baseline stores. Call once before processing a batch."""
    for module, attr in _STORES:
        store = getattr(module, attr, None)
        if store is not None and hasattr(store, "clear"):
            store.clear()
