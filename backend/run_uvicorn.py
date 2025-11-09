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
    # Default host/port; adjust if needed
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
