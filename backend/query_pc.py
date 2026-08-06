import os
import sys
# Add src to path if needed
sys.path.append("/app")
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv(".env")
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index(os.environ.get("PINECONE_INDEX_NAME"))
res = index.query(vector=[0.0]*384, top_k=1, include_metadata=True)
for match in res.get("matches", []):
    print("Match ID:", match["id"])
    print("Metadata keys:", match["metadata"].keys())
    if "_node_content" in match["metadata"]:
        print("_node_content present")
    if "text" in match["metadata"]:
        print("text length:", len(match["metadata"]["text"]))
