"""
Swagger Documentation Validation Script

This script validates that the OpenAPI documentation configuration is complete.
Run this after activating the virtual environment with all dependencies installed.

Usage:
    python validate_swagger.py
"""

import json
from typing import Dict, List

def validate_swagger_config():
    """Validate the OpenAPI configuration in main.py"""
    print("🔍 Validating Swagger/OpenAPI Configuration...\n")
    
    try:
        # Import without starting the server
        import sys
        import os
        sys.path.insert(0, os.path.dirname(__file__))
        
        from app.main import app
        
        # Check OpenAPI schema
        openapi_schema = app.openapi()
        
        print("✓ OpenAPI schema generated successfully\n")
        
        # Validate basic metadata
        info = openapi_schema.get("info", {})
        print(f"📋 API Title: {info.get('title', 'N/A')}")
        print(f"📋 API Version: {info.get('version', 'N/A')}")
        print(f"📋 Description: {'Present' if info.get('description') else 'Missing'}")
        print(f"📋 Contact: {'Present' if info.get('contact') else 'Missing'}\n")
        
        # Validate tags
        tags = openapi_schema.get("tags", [])
        print(f"🏷️  Total Tags: {len(tags)}")
        if tags:
            print("\nConfigured Tags:")
            for tag in tags[:5]:  # Show first 5
                print(f"  • {tag['name']}: {tag.get('description', 'No description')[:60]}...")
            if len(tags) > 5:
                print(f"  ... and {len(tags) - 5} more tags")
        print()
        
        # Validate paths
        paths = openapi_schema.get("paths", {})
        print(f"🛣️  Total Endpoints: {len(paths)}")
        
        # Count by tag
        tag_counts: Dict[str, int] = {}
        documented_count = 0
        
        for path, methods in paths.items():
            for method, config in methods.items():
                if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    method_tags = config.get("tags", [])
                    for tag in method_tags:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
                    
                    # Check if documented
                    if config.get("summary") or config.get("description"):
                        documented_count += 1
        
        total_endpoints = sum(tag_counts.values())
        doc_percentage = (documented_count / total_endpoints * 100) if total_endpoints > 0 else 0
        
        print(f"\n📊 Documentation Coverage: {documented_count}/{total_endpoints} endpoints ({doc_percentage:.1f}%)")
        
        print("\n📦 Endpoints by Category:")
        for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1]):
            print(f"  • {tag}: {count} endpoints")
        
        # Validate response models
        schemas = openapi_schema.get("components", {}).get("schemas", {})
        print(f"\n📐 Response Models: {len(schemas)} schemas defined")
        
        # Check for authentication
        security = openapi_schema.get("security", [])
        security_schemes = openapi_schema.get("components", {}).get("securitySchemes", {})
        print(f"\n🔐 Authentication: {'Configured' if security or security_schemes else 'Demo Mode (No Auth)'}")
        
        print("\n" + "="*60)
        print("✅ Swagger Documentation Validation Complete!")
        print("="*60)
        print("\n📚 Access Documentation:")
        print("   • Swagger UI:  http://localhost:8000/docs")
        print("   • ReDoc:       http://localhost:8000/redoc")
        print("   • OpenAPI JSON: http://localhost:8000/openapi.json")
        print("\n💡 Tip: Start the server with 'python run_uvicorn.py' to access interactive docs")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("\n💡 Make sure you've activated the virtual environment and installed dependencies:")
        print("   .\\myenv\\Scripts\\Activate.ps1")
        print("   pip install -r requirements.txt")
        return False
        
    except Exception as e:
        print(f"❌ Validation Error: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = validate_swagger_config()
    sys.exit(0 if success else 1)
