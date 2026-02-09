"""
Autonomous Navigation via Neuro-Evolutionary Algorithms
FastAPI Backend Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routes import simulation, genomes, analytics
from database import init_db

# Initialize FastAPI app
app = FastAPI(
    title="Neuro-Evolution Simulation API",
    description="Backend for autonomous navigation simulation using neural networks and genetic algorithms",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(simulation.router)
app.include_router(genomes.router)
app.include_router(analytics.router)

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "message": "Neuro-Evolution API is running"
    }


# Mount frontend static files if available
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print("🧠 Neuro-Evolution Simulation API Started")
    print("📊 Neural Network + Genetic Algorithm Engine Ready")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
