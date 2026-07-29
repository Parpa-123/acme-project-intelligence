import os
from huggingface_hub import InferenceClient

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get("HF_API_KEY")
        # Using a fast, free instruct model on HF serverless
        self.model_id = "Qwen/Qwen2.5-72B-Instruct"
        
        if self.api_key:
            self.client = InferenceClient(api_key=self.api_key)
        else:
            self.client = None
            
    def generate_insights(self, system_prompt: str, user_prompt: str) -> str:
        if not self.client:
            print("Warning: HF_API_KEY not found. Returning mock enrichment.")
            return '{"summary": "Mock summary", "action_items": [], "key_decisions": [], "requirements": [], "concerns": [], "topics": []}'
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = self.client.chat_completion(
                model=self.model_id,
                messages=messages,
                max_tokens=1000,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling LLM: {e}")
            raise
