import sys
import asyncio

# Ensure selector event loop on Windows so psycopg async works
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore[attr-defined]
    except Exception:
        pass

import uvicorn

if __name__ == "__main__":
    # Dev server: bind on all interfaces and enable reload so new routers (/profile, /vehicles) appear after edits
    host = "0.0.0.0"  # use 127.0.0.1 if you prefer localhost only
    port = 8000
    uvicorn.run("app.main:app", host=host, port=port, reload=True, log_level="info")
