import os
from huggingface_hub import InferenceClient
from typing import List

class EmbeddingService:
    def __init__(self):
        self.api_key = os.environ.get("HF_API_KEY")
        # all-MiniLM-L6-v2 is ultra-fast, very accurate, and supported by Free Serverless API
        self.model_id = "sentence-transformers/all-MiniLM-L6-v2"
        
        # Initialize the official HuggingFace Inference Client
        if self.api_key:
            self.client = InferenceClient(token=self.api_key)
        else:
            self.client = None
        
    def generate_embedding(self, text: str) -> List[float]:
        """
        Takes the formatted chunk text and generates a high-dimensional vector
        via HuggingFace Serverless Inference API (using the official client).
        """
        if not self.client:
            print("Warning: HF_API_KEY not found in environment. Returning dummy embedding.")
            return [0.0] * 384
            
        try:
            # The client handles the correct base URLs automatically
            embedding = self.client.feature_extraction(text, model=self.model_id)
            
            # Convert numpy array to list if needed
            if hasattr(embedding, "tolist"):
                embedding = embedding.tolist()
                
            # If batch dimensions exist, flatten it
            if isinstance(embedding, list) and len(embedding) > 0 and isinstance(embedding[0], list):
                return embedding[0]
                
            return embedding
            
        except Exception as e:
            import traceback
            print(f"Error generating embedding via huggingface_hub: {e}")
            print(traceback.format_exc())
            return [0.0] * 384
