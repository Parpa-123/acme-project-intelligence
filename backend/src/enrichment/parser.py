import json
from src.enrichment.events import EnrichmentResult

class OutputParser:
    def parse_llm_response(self, response_text: str) -> EnrichmentResult:
        """Parses the raw JSON string from the LLM into our Pydantic model."""
        try:
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
                
            data = json.loads(clean_text)
            return EnrichmentResult.model_validate(data)
        except Exception as e:
            print(f"Failed to parse LLM output: {response_text}")
            raise ValueError(f"Failed to parse LLM output: {e}")
