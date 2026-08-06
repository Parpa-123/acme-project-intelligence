import os
import sys
import json
sys.path.append("/app")
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index(os.environ.get("PINECONE_INDEX_NAME"))
res = index.query(vector=[0.1]*384, top_k=1, include_metadata=True)
for match in res.get("matches", []):
    text = match['metadata'].get('text', '')
    if not text and '_node_content' in match['metadata']:
        node_content = json.loads(match['metadata']['_node_content'])
        text = node_content.get('text', '')
    print("EXTRACTED TEXT:", repr(text))
