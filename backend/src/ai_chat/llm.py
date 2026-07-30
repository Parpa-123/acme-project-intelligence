from typing import List, Dict, AsyncGenerator, Any, Optional
import httpx
import json
import os
import logging

logger = logging.getLogger(__name__)

class LLMProvider:
    """Base interface for Language Models"""
    async def generate(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        raise NotImplementedError

    async def stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        raise NotImplementedError
        yield ""


class OpenAICompatibleProvider(LLMProvider):
    """A provider that works with any OpenAI-compatible API (Groq, Together, vLLM, etc)"""
    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.model = model
        self.headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    async def generate(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Used for structured output or tool calling (orchestrator decisions)"""
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    raise Exception("LLM Provider rate limit exceeded. Please try again in a moment.")
                raise
            data = response.json()
            return data["choices"][0]["message"]

    async def stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Used for final answer generation (streaming to the user)"""
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.5,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST", 
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload
            ) as response:
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429:
                        yield "LLM Provider rate limit exceeded. Please try again in a moment."
                        return
                    raise
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[len("data: "):]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse stream chunk: {data_str}")
                            continue

def get_default_llm() -> LLMProvider:
    """Factory to get the configured LLM provider"""
    # Defaulting to Groq for ultra-fast agentic orchestration
    base_url = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    api_key = os.environ.get("GROQ_API_KEY", os.environ.get("LLM_API_KEY", ""))
    model = os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")
    
    if not api_key:
        logger.warning("GROQ_API_KEY or LLM_API_KEY is not set. API calls will fail.")
        
    return OpenAICompatibleProvider(base_url, api_key, model)
