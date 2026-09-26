#!/usr/bin/env python3
"""
Data ingestion script for Sarkari-Simpler
Processes government scheme markdown files and uploads vectors to Cloudflare Vectorize
"""

import os
import sys
import re
import json
import requests
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Configuration
CLOUDFLARE_ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID', '')
CLOUDFLARE_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN', '')
VECTORIZE_INDEX_NAME = 'scheme-embeddings'
WORKER_URL = os.getenv('WORKER_URL', 'http://localhost:8787')  # For local dev

# Scheme files mapping
SCHEME_FILES = {
    'PM-Kisan': 'schemes/scheme_pm_kisan.md',
    'PMAY-Gramin': 'schemes/scheme_pmay_gramin.md',
    'Ayushman Bharat': 'schemes/scheme_ayushman_bharat.md',
    'MGNREGA': 'schemes/scheme_mgnrega.md',
    'PM-GKAY': 'schemes/scheme_pm_gkay.md'
}


def parse_markdown_sections(filepath: str) -> Dict[str, List[str]]:
    """Parse markdown file into sections based on headers"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    sections = {}
    current_section = 'Overview'
    current_content = []
    
    lines = content.split('\n')
    for line in lines:
        # Check for headers
        if line.startswith('## '):
            # Save previous section
            if current_content:
                sections[current_section] = '\n'.join(current_content).strip()
            # Start new section
            current_section = line.replace('## ', '').strip()
            current_content = []
        elif line.startswith('# '):
            # Main title
            current_section = 'Overview'
            current_content = [line.replace('# ', '').strip()]
        else:
            current_content.append(line)
    
    # Save last section
    if current_content:
        sections[current_section] = '\n'.join(current_content).strip()
    
    return sections


def create_chunks(sections: Dict[str, List[str]], scheme_name: str, max_chunk_size: int = 1000) -> List[Dict[str, Any]]:
    """Create text chunks from sections with metadata"""
    chunks = []
    chunk_index = 0
    
    # Priority sections that should definitely be included
    priority_sections = ['Overview', 'Benefits', 'Eligibility Criteria', 'How to Apply', 
                         'Official Details', 'Key Features for Voice Agent']
    
    for section_name, content in sections.items():
        if not content or len(content.strip()) < 50:
            continue
        
        # Determine category
        category = 'general'
        if 'eligib' in section_name.lower():
            category = 'eligibility'
        elif 'benefit' in section_name.lower():
            category = 'benefits'
        elif 'apply' in section_name.lower() or 'how to' in section_name.lower():
            category = 'application'
        
        # If section is small enough, keep as single chunk
        if len(content) <= max_chunk_size:
            chunks.append({
                'text': f"**{section_name}**\n\n{content}",
                'metadata': {
                    'schemeName': scheme_name,
                    'category': category,
                    'section': section_name,
                    'chunkIndex': chunk_index
                }
            })
            chunk_index += 1
        else:
            # Split large sections into paragraphs
            paragraphs = content.split('\n\n')
            current_chunk = f"**{section_name}**\n\n"
            
            for para in paragraphs:
                if len(current_chunk) + len(para) > max_chunk_size:
                    # Save current chunk
                    chunks.append({
                        'text': current_chunk.strip(),
                        'metadata': {
                            'schemeName': scheme_name,
                            'category': category,
                            'section': section_name,
                            'chunkIndex': chunk_index
                        }
                    })
                    chunk_index += 1
                    current_chunk = para + '\n\n'
                else:
                    current_chunk += para + '\n\n'
            
            # Save remaining content
            if current_chunk.strip():
                chunks.append({
                    'text': current_chunk.strip(),
                    'metadata': {
                        'schemeName': scheme_name,
                        'category': category,
                        'section': section_name,
                        'chunkIndex': chunk_index
                    }
                })
                chunk_index += 1
    
    return chunks


def generate_mock_embedding(text: str) -> List[float]:
    """Generate a mock embedding for testing purposes"""
    import hashlib
    import random
    
    # Use text hash as seed for reproducible "embeddings"
    seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
    random.seed(seed)
    
    # Generate 768-dimensional vector
    embedding = [random.random() for _ in range(768)]
    return embedding


def generate_embedding_via_api(text: str) -> List[float]:
    """Generate embedding using Cloudflare Workers AI API"""
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        return generate_mock_embedding(text)
    
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5"
    headers = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"}
    
    try:
        # Limit text length as some models have input limits
        payload = {"text": [text[:3000]]} 
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("result", {}).get("data"):
                return result["result"]["data"][0]
            else:
                print(f"  ⚠️  API Success but no data: {result.get('errors')}")
        else:
            print(f"  ❌ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"  ❌ Exception during embedding: {str(e)}")
    
    print("  ⚠️  Falling back to mock embedding")
    return generate_mock_embedding(text)


def upload_to_vectorize(chunks_with_embeddings: List[Dict[str, Any]]):
    """Upload vectors to Cloudflare Vectorize via API"""
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        print("\n⚠️  Cloudflare credentials not set. Skipping upload.")
        print("   Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.")
        print("   For now, vectors are saved to 'vectors_output.json'")
        
        # Save to file for manual upload
        with open('vectors_output.json', 'w', encoding='utf-8') as f:
            json.dump(chunks_with_embeddings, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Saved {len(chunks_with_embeddings)} vectors to vectors_output.json")
        return
    
    # Vectorize API endpoint (v2)
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/{VECTORIZE_INDEX_NAME}/insert"
    
    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/x-ndjson'  # Vectorize expects ndjson format
    }
    
    # Prepare vectors for upload in ndjson format
    vectors = []
    for i, chunk in enumerate(chunks_with_embeddings):
        vectors.append({
            'id': f"chunk_{i}",
            'values': chunk['embedding'],
            'metadata': {
                **chunk['metadata'],
                'text': chunk['text'][:1000]  # Limit text length in metadata
            }
        })
    
    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        
        # Convert to ndjson format (one JSON object per line)
        ndjson_payload = '\n'.join([json.dumps(vector) for vector in batch])
        
        print(f"Uploading batch {i//batch_size + 1} ({len(batch)} vectors)...")
        
        response = requests.post(url, headers=headers, data=ndjson_payload)
        
        if response.status_code == 200:
            print(f"  ✅ Batch uploaded successfully")
        else:
            print(f"  ❌ Upload failed: {response.status_code} - {response.text}")
    
    print(f"\n✅ Uploaded {len(vectors)} vectors to Vectorize index '{VECTORIZE_INDEX_NAME}'")


def main():
    """Main ingestion pipeline"""
    print("🚀 Starting Sarkari-Simpler Data Ingestion Pipeline\n")
    
    all_chunks = []
    
    # Process each scheme file
    for scheme_name, filepath in SCHEME_FILES.items():
        print(f"📄 Processing {scheme_name}...")
        
        # Resolve path (relative to this script)
        script_dir = Path(__file__).parent
        full_path = script_dir / filepath
        
        if not full_path.exists():
            print(f"  ⚠️  File not found: {full_path}")
            continue
        
        # Parse and chunk
        sections = parse_markdown_sections(str(full_path))
        chunks = create_chunks(sections, scheme_name)
        
        print(f"  Created {len(chunks)} chunks from {len(sections)} sections")
        
        all_chunks.extend(chunks)
    
    print(f"\n📊 Total chunks created: {len(all_chunks)}")
    
    # Generate embeddings
    print("\n🔮 Generating embeddings...")
    chunks_with_embeddings = []
    
    for i, chunk in enumerate(all_chunks):
        embedding = generate_embedding_via_api(chunk['text'])
        chunks_with_embeddings.append({
            **chunk,
            'embedding': embedding
        })
        
        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(all_chunks)} chunks")
    
    # Upload to Vectorize
    print("\n📤 Uploading to Vectorize...")
    upload_to_vectorize(chunks_with_embeddings)
    
    print("\n✅ Data ingestion complete!")
    print("\n📝 Summary:")
    print(f"  - Schemes processed: {len(SCHEME_FILES)}")
    print(f"  - Total chunks: {len(all_chunks)}")
    print(f"  - Vectors generated: {len(chunks_with_embeddings)}")


if __name__ == '__main__':
    main()
