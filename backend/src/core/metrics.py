from prometheus_client import Histogram, Gauge, CollectorRegistry, REGISTRY

# Use the default global registry
registry = REGISTRY

# Latency Histograms
llm_latency_histogram = Histogram(
    "llm_generation_seconds",
    "Time spent generating responses from the LLM",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

retrieval_latency_histogram = Histogram(
    "vector_retrieval_seconds",
    "Time spent retrieving documents from the vector database",
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.0]
)

stt_latency_histogram = Histogram(
    "stt_transcription_seconds",
    "Time spent waiting for Speech-to-Text transcription (if applicable)",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 15.0]
)

# Gauges
redis_queue_depth_gauge = Gauge(
    "redis_queue_depth",
    "Number of pending tasks in the ARQ Redis queue"
)
